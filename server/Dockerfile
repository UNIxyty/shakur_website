# SHAKUR API — build with the REPO ROOT as context (it needs ../emails):
#   docker build -f server/Dockerfile .
FROM node:22-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

COPY server/index.js ./
COPY server/lib ./lib
COPY emails ./emails

ENV NODE_ENV=production
USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "index.js"]
