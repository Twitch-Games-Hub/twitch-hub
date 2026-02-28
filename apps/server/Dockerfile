FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
RUN apk add --no-cache libc6-compat

# --- Prune stage ---
FROM base AS pruner
WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @twitch-hub/server --docker

# --- Build stage ---
FROM base AS builder
WORKDIR /app

COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @twitch-hub/server db:generate
RUN pnpm turbo build --filter=@twitch-hub/server

# --- Production stage ---
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 server
USER server

COPY --from=builder --chown=server:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma ./prisma
COPY --from=builder --chown=server:nodejs /app/apps/server/package.json ./package.json
COPY --from=builder --chown=server:nodejs /app/apps/server/node_modules ./node_modules
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/dist ./node_modules/@twitch-hub/shared-types/dist
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/package.json ./node_modules/@twitch-hub/shared-types/package.json

ENV NODE_ENV=production
ENV SERVER_PORT=3001

EXPOSE 3001
CMD ["node", "dist/index.js"]
