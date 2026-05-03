FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY migrations/ ./migrations/

RUN mkdir -p /app/uploads

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
