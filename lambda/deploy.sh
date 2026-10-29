#!/usr/bin/env bash
# Build the render image, push it to ECR and point the Lambda at it (README sections 2–4 in one go):
#
#   lambda/deploy.sh [--skip-build] [--allow-dirty]
#
# Safe to run again: on a first deploy it creates the bucket, image repository, execution role, log
# group and function (each step is skipped when the resource already exists); after that it only
# builds, pushes and updates the function's code. The image is tagged with the commit it was built
# from, so it refuses a working tree with uncommitted changes unless --allow-dirty is passed.
#
#   AWS_PROFILE          admin profile for the account the function lives in   (required)
#   STICKSTAGE_REGION    default ap-southeast-2
#   STICKSTAGE_FUNCTION  default tamtree-stickstage-render (must start with tamtree-)
#   STICKSTAGE_MEMORY    MB for a new function, default 10240 (3008 on a capped account)
#   STICKSTAGE_GL        optional: swiftshader sets the function's STICKSTAGE_GL (CPU GL, multi-process
#                        Chrome; see lambda/handler.ts); default removes it (back to swangle). Unset,
#                        the function's variable is left as it is.
set -euo pipefail

build=1 dirty_ok=0
for arg in "$@"; do
  case $arg in
    --skip-build) build=0 ;;
    --allow-dirty) dirty_ok=1 ;;
    *) echo "usage: lambda/deploy.sh [--skip-build] [--allow-dirty]" >&2; exit 2 ;;
  esac
done

: "${AWS_PROFILE:?set AWS_PROFILE}"
export AWS_PROFILE
region=${STICKSTAGE_REGION:-ap-southeast-2}
fn=${STICKSTAGE_FUNCTION:-tamtree-stickstage-render}
memory=${STICKSTAGE_MEMORY:-10240}
gl=${STICKSTAGE_GL:-}
case $gl in ""|swiftshader|default) ;; *) echo "STICKSTAGE_GL must be swiftshader or default" >&2; exit 1 ;; esac
role=tamtree-stickstage-exec
repo_name=tamtree-stickstage
[[ $fn == tamtree-* ]] || { echo "STICKSTAGE_FUNCTION must start with tamtree- (Tamtree's role template)" >&2; exit 1; }

cd "$(dirname "$0")/.."
if [[ $dirty_ok == 0 && -n "$(git status --porcelain)" ]]; then
  echo "uncommitted changes: commit first so the image tag matches its code, or pass --allow-dirty" >&2
  exit 1
fi

P=(--region "$region")
account=$(aws sts get-caller-identity "${P[@]}" --query Account --output text)
bucket=tamtree-stickstage-$account
registry=$account.dkr.ecr.$region.amazonaws.com
image=$registry/$repo_name:$(git rev-parse --short HEAD)
echo "account $account · region $region · function $fn"
echo "image   $image"

step() { echo "── $*"; }

# 3b. Bucket: private, everything expires after a day.
if ! aws s3api head-bucket "${P[@]}" --bucket "$bucket" 2>/dev/null; then
  step "create bucket $bucket"
  aws s3api create-bucket "${P[@]}" --bucket "$bucket" --create-bucket-configuration LocationConstraint="$region" >/dev/null
  aws s3api put-public-access-block "${P[@]}" --bucket "$bucket" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-lifecycle-configuration "${P[@]}" --bucket "$bucket" --lifecycle-configuration \
    '{"Rules":[{"ID":"expire-1d","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":1}}]}'
fi

# 3c. Image repository: keeps the last 5 images.
if ! aws ecr describe-repositories "${P[@]}" --repository-names "$repo_name" >/dev/null 2>&1; then
  step "create ECR repository $repo_name"
  aws ecr create-repository "${P[@]}" --repository-name "$repo_name" \
    --image-scanning-configuration scanOnPush=true >/dev/null
  aws ecr put-lifecycle-policy "${P[@]}" --repository-name "$repo_name" --lifecycle-policy-text \
    '{"rules":[{"rulePriority":1,"description":"keep the last 5 images","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":5},"action":{"type":"expire"}}]}' >/dev/null
fi

# 3d. Execution role: logs, plus read/write on this bucket only.
new_role=0
if ! aws iam get-role "${P[@]}" --role-name "$role" >/dev/null 2>&1; then
  step "create role $role"
  aws iam create-role "${P[@]}" --role-name "$role" --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy "${P[@]}" --role-name "$role" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  aws iam put-role-policy "${P[@]}" --role-name "$role" --policy-name stickstage-bucket --policy-document \
    "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\"],\"Resource\":\"arn:aws:s3:::${bucket}/*\"}]}"
  new_role=1
fi

# 3e. Log group: 14 days.
if [[ -z "$(aws logs describe-log-groups "${P[@]}" --log-group-name-prefix "/aws/lambda/$fn" \
    --query "logGroups[?logGroupName=='/aws/lambda/$fn'].logGroupName" --output text)" ]]; then
  step "create log group /aws/lambda/$fn"
  aws logs create-log-group "${P[@]}" --log-group-name "/aws/lambda/$fn"
  aws logs put-retention-policy "${P[@]}" --log-group-name "/aws/lambda/$fn" --retention-in-days 14
fi

# 2. Build (amd64, no provenance: Lambda rejects buildx's manifest list).
if [[ $build == 1 ]]; then
  step "build image (amd64; slow under emulation on Apple Silicon)"
  pnpm lambda:build
fi

# 1b + 3f. Log in and push.
step "push $image"
aws ecr get-login-password "${P[@]}" | docker login --username AWS --password-stdin "$registry" >/dev/null
docker tag stickstage-lambda "$image"
docker push --quiet "$image"

# 3g–3h, or 4b.
if aws lambda get-function "${P[@]}" --function-name "$fn" >/dev/null 2>&1; then
  step "update $fn"
  aws lambda update-function-code "${P[@]}" --function-name "$fn" --image-uri "$image" >/dev/null
  aws lambda wait function-updated-v2 "${P[@]}" --function-name "$fn"
  if [[ -n $gl ]]; then
    step "set STICKSTAGE_GL=$gl"
    env_json=$(aws lambda get-function-configuration "${P[@]}" --function-name "$fn" \
      --query 'Environment.Variables' --output json \
      | jq -c --arg gl "$gl" '(. // {}) | if $gl == "default" then del(.STICKSTAGE_GL) else .STICKSTAGE_GL = $gl end | {Variables: .}')
    aws lambda update-function-configuration "${P[@]}" --function-name "$fn" --environment "$env_json" >/dev/null
    aws lambda wait function-updated-v2 "${P[@]}" --function-name "$fn"
  fi
else
  step "create $fn (${memory} MB)"
  env_json=$(jq -nc --arg b "$bucket" --arg gl "$gl" \
    '{Variables: ({STICKSTAGE_BUCKET: $b} + (if $gl == "swiftshader" then {STICKSTAGE_GL: $gl} else {} end))}')
  [[ $new_role == 1 ]] && sleep 10 # a new role takes a few seconds before Lambda can assume it
  for attempt in 1 2 3 4 5 6; do
    if aws lambda create-function "${P[@]}" --function-name "$fn" \
        --package-type Image --code ImageUri="$image" --architectures x86_64 \
        --role "arn:aws:iam::${account}:role/${role}" \
        --memory-size "$memory" --timeout 900 --ephemeral-storage Size=4096 \
        --environment "$env_json" >/dev/null; then
      break
    fi
    [[ $attempt == 6 ]] && exit 1
    echo "   retrying in 10 s (IAM may still be catching up)"; sleep 10
  done
  aws lambda wait function-active-v2 "${P[@]}" --function-name "$fn"
  # A retried render costs money and makes a second video.
  aws lambda put-function-event-invoke-config "${P[@]}" --function-name "$fn" \
    --maximum-retry-attempts 0 --maximum-event-age-in-seconds 3600 >/dev/null
fi

aws lambda get-function-configuration "${P[@]}" --function-name "$fn" \
  --query '{state:State,update:LastUpdateStatus,memory:MemorySize,timeout:Timeout,arch:Architectures[0],gl:Environment.Variables.STICKSTAGE_GL}' \
  --output table
echo "bucket  $bucket   (STICKSTAGE_BUCKET for lambda/tamtree-flow.sh)"
