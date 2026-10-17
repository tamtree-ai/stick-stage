#!/usr/bin/env bash
# Create a Tamtree workflow that renders one skit on the render Lambda (lambda/handler.ts):
#   Manual trigger → Set (skit, voice, audio keys) → Cloud Function (waits for the callback) → Set (video link)
#
#   lambda/tamtree-flow.sh <skitId> [flow name]
#
# Uploads public/skits/<skitId>/voice/* to s3://$STICKSTAGE_BUCKET/inputs/<skitId>/ first (the bucket
# expires objects after a day, so run it again for a fresh copy), then POSTs the flow to Tamtree.
# Everything account- or workspace-specific comes from the environment; nothing is written to disk.
#
#   AWS_PROFILE          profile that can write the bucket        (e.g. tamtree-prod-root)
#   STICKSTAGE_BUCKET    the render bucket                        (e.g. tamtree-stickstage-<account>)
#   STICKSTAGE_FUNCTION  default tamtree-stickstage-render
#   STICKSTAGE_REGION    default ap-southeast-2
#   TAMTREE_URL          Tamtree's base URL                       (e.g. https://tamtree.example.com)
#   TAMTREE_API_KEY      API key with write:flows
#   TAMTREE_CREDENTIAL   the AWS role connection's credential id
set -euo pipefail

skit=${1:?usage: lambda/tamtree-flow.sh <skitId> [flow name]}
name=${2:-"StickStage render: $skit"}
dir="$(cd "$(dirname "$0")/.." && pwd)/public/skits/$skit"
: "${STICKSTAGE_BUCKET:?set STICKSTAGE_BUCKET}" "${TAMTREE_URL:?set TAMTREE_URL}"
: "${TAMTREE_API_KEY:?set TAMTREE_API_KEY}" "${TAMTREE_CREDENTIAL:?set TAMTREE_CREDENTIAL}"
fn=${STICKSTAGE_FUNCTION:-tamtree-stickstage-render}
region=${STICKSTAGE_REGION:-ap-southeast-2}
[[ -f "$dir/skit.json" && -f "$dir/voice.json" ]] || { echo "no skit.json + voice.json in $dir" >&2; exit 1; }

aws s3 cp "$dir/voice" "s3://$STICKSTAGE_BUCKET/inputs/$skit/" --recursive --region "$region" --only-show-errors

definition=$(jq -n \
  --slurpfile s "$dir/skit.json" --slurpfile v "$dir/voice.json" \
  --arg prefix "inputs/$skit/" --arg fn "$fn" --arg region "$region" --arg cred "$TAMTREE_CREDENTIAL" '{
  api_version: "tamtree.dev/v1",
  flow_type: "pipeline",
  nodes: [
    { id: "start", type: "tamtree.manual_trigger", position: [60, 160], params: {} },
    { id: "render_input", type: "tamtree.set", position: [300, 160],
      note: "What the render Lambda reads: the skit, its voice.json, and an S3 key per audio file.",
      params: { keep_only_set: true, fields: {
        skit: $s[0], voice: $v[0], options: { quality: "draft" },
        audio: ($v[0].lines | map(.audio | ltrimstr("voice/") | { key: ., value: ($prefix + .) }) | from_entries)
      } } },
    { id: "render", type: "tamtree.cloud_function", position: [540, 160],
      note: "One render per call. The function POSTs its result to the callback when the MP4 is in S3.",
      credentials: { aws_role: $cred },
      params: { provider: "aws_lambda", region: $region, function: $fn, mode: "envelope",
                wait_for: "callback", timeout_s: 60, max_wait_s: 1800, batch: "per_run" } },
    { id: "video", type: "tamtree.set", position: [780, 160],
      params: { fields: {
        title: "{{ $json[\"title\"] }}",
        video_url: "{{ $json[\"outputs\"][\"mp4\"][\"url\"] }}",
        video_key: "{{ $json[\"outputs\"][\"mp4\"][\"key\"] }}"
      } } }
  ],
  connections: [
    { from_node: "start", to_node: "render_input" },
    { from_node: "render_input", to_node: "render" },
    { from_node: "render", to_node: "video" }
  ],
  nodes_in_order: ["start", "render_input", "render", "video"]
}')

jq -n --arg name "$name" --argjson definition "$definition" '{ name: $name, definition: $definition }' |
  curl -fsS -X POST "${TAMTREE_URL%/}/v1/flows" \
    -H "Authorization: Bearer $TAMTREE_API_KEY" -H "content-type: application/json" --data-binary @- |
  jq '{ id, name, status: (.status // .version_status // null) }'
