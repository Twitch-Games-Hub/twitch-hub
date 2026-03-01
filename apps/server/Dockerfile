FROM oven/bun:1-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN bun install --frozen-lockfile
RUN bun run --filter @twitch-hub/server db:generate
RUN bun run --filter @twitch-hub/shared-types build
RUN bun run --filter @twitch-hub/server build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 server
USER server
COPY --from=builder --chown=server:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma ./prisma
COPY --from=builder --chown=server:nodejs /app/apps/server/package.json ./package.json
COPY --from=builder --chown=server:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/dist ./node_modules/@twitch-hub/shared-types/dist
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/package.json ./node_modules/@twitch-hub/shared-types/package.json
ENV NODE_ENV=production
ENV SERVER_PORT=3001
EXPOSE 3001
CMD ["bun", "run", "--preload", "./dist/instrument.js", "dist/index.js"]
