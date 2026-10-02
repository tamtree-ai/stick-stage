# syntax=docker/dockerfile:1
# StickStage render service (docs/render-service.md). Multi-arch: linux/amd64 and linux/arm64.
#   docker build -t stickstage-render .                          (this machine's arch)
#   docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/…/stickstage-render:<catalog-version> --push .
#   docker run -p 8787:8787 -e STICKSTAGE_API_TOKEN=… -v stickstage-jobs:/app/public/skits/_jobs stickstage-render
# Nothing is downloaded at render time: Chrome Headless Shell and Rhubarb are put in place here, at build.
# Build each arch on its own runner (CI does): Rhubarb's arm64 source build under QEMU takes a long time.
ARG RHUBARB_VERSION=1.14.0
ARG TARGETARCH

# Rhubarb for amd64: the release build, pinned by SHA-256 (GitHub publishes no digests; ours).
FROM debian:bookworm-slim AS rhubarb-amd64
ARG RHUBARB_VERSION
RUN set -eux; \
    apt-get update; apt-get install -y --no-install-recommends ca-certificates curl unzip; rm -rf /var/lib/apt/lists/*; \
    curl -fsSL -o /tmp/rhubarb.zip "https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip"; \
    echo "a9a9074862cff47b2d59b8bf399a678a3b0b74f9452ad6ad94cb292913dd8667  /tmp/rhubarb.zip" | sha256sum -c -; \
    unzip -q /tmp/rhubarb.zip -d /opt; \
    mv "/opt/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux" /opt/rhubarb; \
    rm /tmp/rhubarb.zip

# Rhubarb for arm64: there is no release build, so build it from source (MIT). 1.14 needs
# CMake >= 3.30 (policy CMP0167); bookworm has 3.25, so CMake comes from PyPI, pinned. The
# builder stays on bookworm so the binary matches the runtime's glibc.
FROM debian:bookworm-slim AS rhubarb-arm64
ARG RHUBARB_VERSION
RUN set -eux; \
    apt-get update; apt-get install -y --no-install-recommends build-essential libboost-dev git curl ca-certificates python3-pip; rm -rf /var/lib/apt/lists/*; \
    pip3 install --no-cache-dir --break-system-packages cmake==3.31.6
WORKDIR /src
RUN set -eux; \
    curl -fsSL -o r.tgz "https://github.com/DanielSWolf/rhubarb-lip-sync/archive/refs/tags/v${RHUBARB_VERSION}.tar.gz"; \
    echo "45acd039782c26f563a331f59769a5be7e0f6f337d8ee99f0cfd8a10da40ccdf  r.tgz" | sha256sum -c -; \
    tar xzf r.tgz; \
    cmake -S "rhubarb-lip-sync-${RHUBARB_VERSION}" -B build -DCMAKE_BUILD_TYPE=Release; \
    cmake --build build --target rhubarb -j"$(nproc)"; \
    mkdir -p /opt/rhubarb; cp build/rhubarb/rhubarb /opt/rhubarb/; cp -r build/rhubarb/res /opt/rhubarb/

FROM rhubarb-${TARGETARCH} AS rhubarb

FROM node:22-bookworm-slim

# Chrome Headless Shell's shared libraries and a fallback font (the skit font ships in public/fonts).
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      ca-certificates curl fontconfig fonts-dejavu-core \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
      libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libexpat1 libxcb1 libx11-6 libxext6; \
    rm -rf /var/lib/apt/lists/*

COPY --from=rhubarb /opt/rhubarb /opt/rhubarb
RUN /opt/rhubarb/rhubarb --version

RUN npm install -g pnpm@11.17.0
WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Kokoro (kokoro-js + onnxruntime, ~400 MB) is an optional dependency for the dev scripts; the
# service never voices anything, so it is removed in the same layer it was installed in.
RUN pnpm install --frozen-lockfile \
 && rm -rf node_modules/kokoro-js node_modules/@huggingface node_modules/.pnpm/kokoro-js@* \
      node_modules/.pnpm/@huggingface+transformers@* node_modules/.pnpm/onnxruntime-* node_modules/.pnpm/phonemizer@*
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
