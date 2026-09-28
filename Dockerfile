# syntax=docker/dockerfile:1
# StickStage render service (docs/render-service.md). Build for x86_64: Rhubarb ships no Linux arm64 build.
#   docker build --platform linux/amd64 -t stickstage-render .
#   docker run --platform linux/amd64 -p 8787:8787 -e STICKSTAGE_API_TOKEN=… -v stickstage-jobs:/app/public/skits/_jobs stickstage-render
# Nothing is downloaded at render time: Chrome Headless Shell and Rhubarb are fetched here, at build.
FROM node:22-bookworm-slim

# Chrome Headless Shell's shared libraries, a fallback font (the skit font ships in public/fonts), unzip for Rhubarb.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      ca-certificates curl unzip fontconfig fonts-dejavu-core \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libexpat1 libxcb1 libx11-6 libxext6; \
    rm -rf /var/lib/apt/lists/*

ARG RHUBARB_VERSION=1.14.0
RUN set -eux; \
    curl -fsSL -o /tmp/rhubarb.zip "https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip"; \
    unzip -q /tmp/rhubarb.zip -d /opt; \
    mv "/opt/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux" /opt/rhubarb; \
    rm /tmp/rhubarb.zip; \
    /opt/rhubarb/rhubarb --version

RUN npm install -g pnpm@11.17.0
WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
# Chrome Headless Shell into node_modules/.remotion, then prove it starts; prove the bundle builds.
# Full ICU: Intl.Segmenter (Japanese, Chinese, Korean, Thai). The official Node image ships it; fail the build if a slim rebuild drops it.
RUN node -e "if (typeof Intl.Segmenter !== 'function') process.exit(1); new Intl.Segmenter('ja', { granularity: 'word' })"
RUN node_modules/.bin/remotion browser ensure \
 && mkdir -p public/skits/_jobs

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    RHUBARB_PATH=/opt/rhubarb/rhubarb
VOLUME /app/public/skits/_jobs
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD curl -fsS "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["node_modules/.bin/tsx", "scripts/serve.ts"]
