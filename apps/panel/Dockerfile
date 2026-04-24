# syntax=docker/dockerfile:1

FROM oven/bun:1.3.11-alpine AS deps
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json bun.lock bunfig.toml turbo.json tsconfig.base.json ./
COPY apps/daemon/package.json ./apps/daemon/package.json
COPY apps/panel/package.json ./apps/panel/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN bun install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY . .

RUN bun run --filter @beacon/panel build

FROM node:22-alpine AS runner
WORKDIR /app

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder --chown=nextjs:nextjs /app/apps/panel/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/apps/panel/.next/static ./apps/panel/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/panel/server.js"]
