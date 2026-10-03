# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN pnpm install --frozen-lockfile --filter @coddle/api...
RUN pnpm --filter @coddle/shared build \
  && pnpm --filter @coddle/api build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=6700

COPY --from=builder /app /app
COPY scripts/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 6700
ENTRYPOINT ["/entrypoint.sh"]
