# StickStage render on AWS Lambda

Renders one skit per invocation on AWS Lambda, with the same pipeline as `pnpm serve` (prep → compile → check → render → post). Tamtree calls it from a **Cloud Function** step and gets the MP4 back as an S3 link.

```
Tamtree flow ──Invoke (async)──▶ tamtree-stickstage-render ──▶ S3: jobs/<id>/*.mp4, .srt, …
     ▲                                  │
     └────── POST result to the step's callback URL ◀──┘
```

| File | What |
|---|---|
| `handler.ts` | The handler: reads the event, downloads the audio from S3, runs `renderPipeline`, uploads the outputs, answers |
| `index.mjs` | Re-exports the handler so the Lambda runtime client can load TypeScript (via `NODE_OPTIONS=--import=tsx`) |
| `tamtree-flow.sh` | Uploads a skit's audio and creates a Tamtree workflow that renders it |
| `../Dockerfile.lambda` | The container image (amd64) |
| `../scripts/lambda-bundle.ts` | Builds the Remotion bundle into the image, so a cold start skips webpack |

Nothing in this folder holds an account ID or a secret. The bucket comes from the function's `STICKSTAGE_BUCKET`, and AWS credentials come from its execution role.

## The contract

**Event:** Tamtree's Cloud Function envelope (v1). Item 0's `json`:

```json
{
  "skit":  { "...": "skit.json" },
  "voice": { "...": "voice.json, audio paths as voice/<file>" },
  "audio": { "b1.wav": "inputs/fine/b1.wav" },
  "options": { "quality": "draft" }
}
```

`audio` maps each `voice/<file>` name to its key in `STICKSTAGE_BUCKET`. `options` are `POST /render`'s ([docs/render-service.md](../docs/render-service.md)). The upload goes through the same checks as the service (`voice-missing`, `voice-stale`, `audio-format`, …).

**Reply:** `{ items: [{ json: { jobId, title, durationSec, check, warnings, outputs } }], logs }`. Each output is `{ bucket, key, type, bytes, url }`, where `url` is a signed link that works for 1 hour. On failure, `items` is empty and `error` is `{ code, message, retryable: false }`, with any diagnostics in `logs`.

If the envelope carries a `callback`, the reply is POSTed there, and the function returns nothing. That is how Tamtree's *Wait for: A callback when it finishes* gets its result.

**Check first (Tamtree 2.7.0).** With `"check_only": true`, nothing is rendered and `audio` isn't needed. The function runs the request's checks (skit errors, unsupported beats, approval, `voice-missing`, `voice-stale`), then the director's self-check on estimated timings, as `POST /validate` does. It answers `{ checked: true, items: [], findings }`. Request errors are `error` findings and stop Tamtree's step before the render. Self-check errors come back as warnings, because frame timing depends on the real voices and the render checks again. Set the step's *Check first* to **Check, then run**, or use **Only check** as a step ahead of TTS. Code in [`check.ts`](check.ts).

**Describe.** `{"v": 1, "describe": true}` returns the `output_schema` of the reply item above, so later Tamtree steps offer its fields before a run. There's no `input_schema`: this function reads item 0's `json`, not `inputs`.

## Before you start

Use zsh, as in Tamtree's guides. Every command below takes `$P`, so a profile and region are always passed explicitly.

| You are… | Do |
|---|---|
| Deploying for the first time | [1](#1-set-up-the-terminal-every-new-terminal) → [2](#2-build-the-image) → [3](#3-create-the-aws-resources-once) → [5](#5-test-it) → [6](#6-connect-tamtree) |
| Shipping a code change | [1](#1-set-up-the-terminal-every-new-terminal) → [4](#4-ship-a-new-version) → [5](#5-test-it) |
| Testing or connecting Tamtree only | [1](#1-set-up-the-terminal-every-new-terminal) → [5](#5-test-it) or [6](#6-connect-tamtree) |

## 1. Set up the terminal (every new terminal)

Run both steps each time you open a terminal. zsh doesn't keep the variables between terminals, and an ECR login lasts only 12 hours.

**1a. Set the variables.** Use an admin profile for the account the function lives in.

```sh
P=(--profile <profile> --region ap-southeast-2)
ACCOUNT=$(aws sts get-caller-identity $P --query Account --output text) && echo $ACCOUNT
BUCKET=tamtree-stickstage-${ACCOUNT}
REGISTRY=${ACCOUNT}.dkr.ecr.ap-southeast-2.amazonaws.com
REPO=${REGISTRY}/tamtree-stickstage
FN=tamtree-stickstage-render
ROLE=tamtree-stickstage-exec
```

Check that `echo $ACCOUNT` prints the account you expect. If it prints nothing or the wrong account, every step after this one fails. The function's name must start with `tamtree-`, because Tamtree's role template allows only that prefix.

**1b. Log Docker in to ECR.** Do this before any `docker push`.

```sh
aws ecr get-login-password $P | docker login --username AWS --password-stdin $REGISTRY
```

It should print `Login Succeeded`. If a push later fails with `403 Forbidden`, run this again.

## 2. Build the image

```sh
pnpm lambda:build          # docker build --platform linux/amd64 --provenance=false -f Dockerfile.lambda -t stickstage-lambda .
```

- **amd64 only:** Rhubarb has no arm64 release. On Apple Silicon the build runs under emulation; the first build takes several minutes.
- **`--provenance=false` is required:** Lambda rejects the manifest list that buildx produces by default.

## 3. Create the AWS resources (once)

Do this only on the first deploy, after [1](#1-set-up-the-terminal-every-new-terminal) and [2](#2-build-the-image). Run the steps in order.

**3a. Check the account's limits.** A new account may be capped at 10 concurrent executions and 3008 MB of memory (see [Troubleshooting](#troubleshooting)).

```sh
aws lambda get-account-settings $P --query AccountLimit.ConcurrentExecutions
```

**3b. Create the bucket** for inputs and outputs. Everything in it expires after a day.

```sh
aws s3api create-bucket $P --bucket $BUCKET --create-bucket-configuration LocationConstraint=ap-southeast-2
aws s3api put-public-access-block $P --bucket $BUCKET --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-lifecycle-configuration $P --bucket $BUCKET --lifecycle-configuration \
  '{"Rules":[{"ID":"expire-1d","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":1}}]}'
```

**3c. Create the image repository.** It keeps the last 5 images.

```sh
aws ecr create-repository $P --repository-name tamtree-stickstage --image-scanning-configuration scanOnPush=true
aws ecr put-lifecycle-policy $P --repository-name tamtree-stickstage --lifecycle-policy-text \
  '{"rules":[{"rulePriority":1,"description":"keep the last 5 images","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":5},"action":{"type":"expire"}}]}'
```

**3d. Create the execution role.** It can write logs, and read and write this bucket only.

```sh
aws iam create-role $P --role-name $ROLE --assume-role-policy-document \
  '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy $P --role-name $ROLE \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam put-role-policy $P --role-name $ROLE --policy-name stickstage-bucket --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\"],\"Resource\":\"arn:aws:s3:::${BUCKET}/*\"}]}"
```

**3e. Create the log group.** Logs are kept for 14 days, not forever.

```sh
aws logs create-log-group $P --log-group-name /aws/lambda/$FN
aws logs put-retention-policy $P --log-group-name /aws/lambda/$FN --retention-in-days 14
```

**3f. Push the image**, tagged with the commit it was built from. This needs the login from [1b](#1-set-up-the-terminal-every-new-terminal).

```sh
IMAGE=${REPO}:$(git rev-parse --short HEAD)
docker tag stickstage-lambda $IMAGE && docker push $IMAGE
```

**3g. Create the function.** Use 10240 MB (about 6 vCPUs) if the account allows it, and 3008 MB if it is capped.

```sh
aws lambda create-function $P --function-name $FN \
  --package-type Image --code ImageUri=$IMAGE --architectures x86_64 \
  --role arn:aws:iam::${ACCOUNT}:role/${ROLE} \
  --memory-size 10240 --timeout 900 --ephemeral-storage Size=4096 \
  --environment "Variables={STICKSTAGE_BUCKET=${BUCKET}}"
aws lambda wait function-active-v2 $P --function-name $FN
```

If it says Lambda cannot assume the role, wait about ten seconds for IAM to catch up, then run it again.

**3h. Turn off automatic retries.** A retried render costs money and makes a second video.

```sh
aws lambda put-function-event-invoke-config $P --function-name $FN \
  --maximum-retry-attempts 0 --maximum-event-age-in-seconds 3600
```

**3i. Check the function:**

```sh
aws lambda get-function-configuration $P --function-name $FN \
  --query '{state:State,memory:MemorySize,timeout:Timeout,arch:Architectures[0]}'
```

## 4. Ship a new version

Do [1](#1-set-up-the-terminal-every-new-terminal) first, including the login.

**4a. Commit first**, so the image tag matches the code in it.

**4b. Build, push and update the function:**

```sh
pnpm lambda:build
IMAGE=${REPO}:$(git rev-parse --short HEAD)
docker tag stickstage-lambda $IMAGE && docker push $IMAGE
aws lambda update-function-code $P --function-name $FN --image-uri $IMAGE
aws lambda wait function-updated-v2 $P --function-name $FN
```

## 5. Test it

**Upload the `fine` skit's audio and build an event:**

```sh
aws s3 cp $P public/skits/fine/voice s3://${BUCKET}/inputs/fine/ --recursive

jq -n --slurpfile s public/skits/fine/skit.json --slurpfile v public/skits/fine/voice.json '{
  v: 1,
  items: [{ json: {
    skit: $s[0], voice: $v[0], options: { quality: "draft" },
    audio: ($v[0].lines | map(.audio | ltrimstr("voice/") | { key: ., value: ("inputs/fine/" + .) }) | from_entries)
  }}]
}' > /tmp/stickstage-event.json
```

**Invoke it and wait for the answer** (up to 15 minutes):

```sh
aws lambda invoke $P --function-name $FN --cli-binary-format raw-in-base64-out \
  --cli-read-timeout 900 --payload file:///tmp/stickstage-event.json /tmp/stickstage-out.json
jq '{error, title: .items[0].json.title, durationSec: .items[0].json.durationSec, check: .items[0].json.check.ok, outputs: (.items[0].json.outputs // {} | keys)}' /tmp/stickstage-out.json
```

**Read the timings, then watch the video:**

```sh
aws logs tail $P /aws/lambda/$FN --since 20m | grep -E 'REPORT|INIT_REPORT|stage '
curl -sL -o /tmp/fine.mp4 "$(jq -r '.items[0].json.outputs.mp4.url' /tmp/stickstage-out.json)" && open /tmp/fine.mp4
```

Success means `error` is `null`, the outputs include `mp4`, `srt`, `txt`, `manifest`, `cover` and `thumbnail`, and the log shows `stage prep`, `compile`, `check`, `render` and `post` in order.

**Optional: run the image locally first** with AWS's runtime emulator. It mimics Lambda's read-only disk and catches problems before a deploy, but it is slow under amd64 emulation and does not reproduce Lambda's sandbox exactly (the `setpriv` failure below only showed up on Lambda).

```sh
mkdir -p ~/.aws-lambda-rie && curl -Lo ~/.aws-lambda-rie/aws-lambda-rie \
  https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie && chmod +x ~/.aws-lambda-rie/aws-lambda-rie
eval "$(aws configure export-credentials --profile <profile> --format env)"
docker run --rm --platform linux/amd64 -p 9000:8080 --read-only --tmpfs /tmp:size=4g,exec \
  -v ~/.aws-lambda-rie:/aws-lambda --entrypoint /aws-lambda/aws-lambda-rie \
  -e STICKSTAGE_BUCKET=$BUCKET -e AWS_REGION=ap-southeast-2 \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN \
  stickstage-lambda /opt/ric/node_modules/.bin/aws-lambda-ric lambda/index.handler
# in another terminal:
curl -s -XPOST localhost:9000/2015-03-31/functions/function/invocations -d @/tmp/stickstage-event.json | jq .
```

## 6. Connect Tamtree

### 6.1 The AWS role connection

Tamtree calls the function through an **AWS role** connection: a role in your account that Tamtree assumes, with an External ID only this connection knows. No keys are stored.

1. In Tamtree, go to **Credentials → New → AWS role**. Name it (e.g. *StickStage render*), set **Default region** to `ap-southeast-2`, and click **Save & continue setup**.
2. Under *What the role is for*, keep **Lambda functions**.
3. Download the template and run the command the page shows, from the folder you saved it in, with `--profile <profile>`. **Keep the suggested stack name**: it starts with `tamtree-functions-`, and Tamtree's own AWS identity may only assume roles with that prefix.
4. Copy the role ARN from the stack's outputs:
   ```sh
   aws cloudformation describe-stacks $P --stack-name <stack name> --query 'Stacks[0].Outputs' --output table
   ```
5. Paste it into the connection and click **Test**.

### 6.2 The workflow

`tamtree-flow.sh` uploads a skit's audio to the bucket, then creates this workflow through Tamtree's API:

```
Manual trigger → Set (skit, voice, audio keys) → Cloud Function (render, waits for the callback) → Set (title, video_url, video_key)
```

It needs a Tamtree API key with the `write:flows` scope (Tamtree **Settings → API keys**). Pass it in the environment; never commit it.

```sh
AWS_PROFILE=<profile> STICKSTAGE_BUCKET=$BUCKET \
TAMTREE_URL=https://<your tamtree host> TAMTREE_API_KEY='<api key>' \
lambda/tamtree-flow.sh fine                     # optional 2nd argument: the workflow's name
```

| Variable | Required | What |
|---|---|---|
| `AWS_PROFILE` | yes | A profile that can write the bucket |
| `STICKSTAGE_BUCKET` | yes | The render bucket |
| `TAMTREE_URL` | yes | Tamtree's base URL |
| `TAMTREE_API_KEY` | yes | API key with `write:flows` |
| `TAMTREE_CREDENTIAL` | no | The AWS role connection's ID (from `/credentials/<id>/edit`). Unset, pick the connection in the editor |
| `STICKSTAGE_FUNCTION` | no | Default `tamtree-stickstage-render` |
| `STICKSTAGE_REGION` | no | Default `ap-southeast-2` |
| `TAMTREE_FILES_CONNECTION` | no | A **Storage** role connection that can read `$BUCKET/jobs/*` (see 6.4). Set, the render step reads the MP4 from S3, so it still works after the 1-hour link expires |
| `STICKSTAGE_COPY_BUCKET` | no | Adds a **copy** step that writes the MP4 to this bucket by reading `$binary.mp4` |
| `TAMTREE_COPY_CREDENTIAL` | no | The Storage role connection the copy step writes with (read-write on `STICKSTAGE_COPY_BUCKET`). It may be the same connection as `TAMTREE_FILES_CONNECTION` |

It prints the new workflow's `id` and `name`. Each run creates a new workflow, so delete the old one if you run it again.

### 6.3 Run it

1. Open the workflow (*StickStage render: fine*) and click the **render** step. Under **Connection**, pick the AWS role connection, then save. Skip this if you passed `TAMTREE_CREDENTIAL`.
2. Click **Run**. The render step waits for the callback for a minute or two, then the **video** step shows `title`, `video_url` (works for 1 hour) and `video_key`.

**Run the workflow, not one step on its own:** a single-step Test only captures the call and never waits for the callback.

### 6.4 Pass the video on as a file

The reply carries each output twice. `outputs.mp4` is the JSON the **video** step reads. `binary.mp4` is the same file as a Tamtree attachment: `url`, `file_name`, `mime_type`, `size_bytes`, `expires_at`, and `s3: {bucket, key, region}`. A later step reads it as `$binary.mp4`, for example *S3 — Put object* with **Upload file from attachment** set to `mp4`, or a YouTube upload with its attachment set to `mp4`. Tamtree copies the file in only when such a step runs, and the run output shows it as *in s3://… · copied when a step reads it* until then.

Without a Files connection, Tamtree downloads it through the 1-hour link. To keep it readable for longer, make a second **AWS role** connection with *What the role is for* set to **Storage (S3 buckets)**:

- `BucketNames=$BUCKET`, plus the copy bucket if you use one
- `KeyPrefix=jobs/`
- `Access=read-write` if the same connection does the copy

Then list the same buckets in the connection's **S3 buckets** field, click **Test**, and pass its ID as `TAMTREE_FILES_CONNECTION` (and `TAMTREE_COPY_CREDENTIAL`):

```sh
AWS_PROFILE=<profile> STICKSTAGE_BUCKET=$BUCKET \
TAMTREE_URL=https://<your tamtree host> TAMTREE_API_KEY='<api key>' \
TAMTREE_FILES_CONNECTION=<storage connection id> \
STICKSTAGE_COPY_BUCKET=<second bucket> TAMTREE_COPY_CREDENTIAL=<storage connection id> \
lambda/tamtree-flow.sh fine
```

This needs a Tamtree with storage roles and signed reply files (`TAMTREE_BINARY_SOURCE_KEY` set). On an older one, `binary` arrives only as links under `json._files`.

**Tamtree behind HTTP basic auth:** that's fine as long as `/v1/*` (the API) and `/webhook/resume/*` (the callback) are outside it. The script sends only the API key, and the function's callback carries no password.

## What it costs and how long it takes

Measured with `public/skits/fine` (an 8.9 s draft) at 3008 MB:

| | Cold (first call after a deploy) | Warm |
|---|---|---|
| Billed | 141 s | 81 s |
| prep (Rhubarb) | ~40 s | ~20 s |
| render (MP4, cover, thumbnail) | ~92 s | ~60 s |
| Peak memory | 0.77 GB | 0.77 GB |

At $0.0000166667 per GB-second, a warm draft like this costs about $0.004. Lambda's free tier (400,000 GB-seconds a month) covers roughly 1,600 of them. A 30 s **final** render has about 3× the frames at 4× the pixels, so at 3008 MB it may come close to the 15-minute limit: raise the memory first (see below).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `MemorySize … must have value less than or equal to 3008` | New AWS accounts are capped at 3008 MB | Create the function with `--memory-size 3008`. Ask for 10240 MB in AWS Support Center (Service limit increase → Lambda), then `aws lambda update-function-configuration $P --function-name $FN --memory-size 10240` |
| `setpriv: keep process capabilities failed: Operation not permitted` | Remotion starts Chrome through `setpriv` when it is installed, and Lambda's sandbox refuses it | `Dockerfile.lambda` removes `/usr/bin/setpriv`. Keep that line |
| `Timed out after 25000 ms while trying to connect to the browser` | No GPU on Lambda: Chrome's GPU process hangs | `handler.ts` passes `gl: "swangle"` and single-process Chrome. Keep those `chromiumOptions` |
| `INIT_REPORT … Status: timeout` in the log | Lambda's init phase has a 10 s limit; the first call after a deploy loads the image lazily | Harmless: Lambda reruns init inside the call. It costs time only on cold starts |
| `render-failed: the render ran out of Lambda time` | The render needed more than 15 minutes | More memory (more CPU), or `quality: "draft"` |
| The Tamtree step waits until it gives up | The callback never arrived | Check the function's log for `Tamtree refused the callback`, and that `/webhook/resume/*` is reachable from the internet |
| `docker push`: `403 Forbidden` on a `HEAD` request to `/v2/…/blobs/…` | The ECR login has expired (it lasts 12 hours), or it was for another account because `$P` was empty | Run [section 1](#1-set-up-the-terminal-every-new-terminal) again: check that `$ACCOUNT` is right, then log in (1b) |
| An S3 `NoSuchKey` error | The bucket deletes everything after a day | Upload the audio again (`tamtree-flow.sh` does it) |
