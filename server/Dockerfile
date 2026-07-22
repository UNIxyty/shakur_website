# SHAKUR API — build with the REPO ROOT as context (it needs ../emails):
#   docker build -f server/Dockerfile .
FROM node:22-alpine

# POST /api/media transcodes video uploads (h264+aac mp4 +faststart) and cuts
# jpg posters; ffprobe ships with ffmpeg. Without it video uploads 500 with a
# clear "video processing unavailable" error — images keep working.
RUN apk add --no-cache ffmpeg

# Chromium for the requisites renderer (GET /api/admin/requisites/*). The distro
# build is used deliberately: playwright-core never downloads browsers, so the
# image stays small and there is no version drift between npm and the binary.
# The page loads Inter/Cormorant as webfonts from the web container, so only the
# base font stack is needed here — ttf-freefont keeps Chromium from failing on
# a fontconfig with zero fonts.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

COPY server/index.js ./
COPY server/lib ./lib
COPY emails ./emails

ENV NODE_ENV=production

# Media uploads land here (compose mounts the `media-uploads` volume over it).
# Owning it as `node` in the image matters: Docker copies this ownership into a
# fresh named volume on first mount — without it the volume comes up root-owned
# and every upload fails with EACCES, since the server runs as `node`.
RUN mkdir -p /data/media && chown node:node /data/media

USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "index.js"]
