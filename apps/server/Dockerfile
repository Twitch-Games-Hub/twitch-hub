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
# Bun workspaces stores packages in node_modules/.bun/ and symlinks them
# into each workspace's node_modules/. Preserve the monorepo directory
# structure so Bun's symlink-based module resolution works at runtime.
COPY --from=builder --chown=server:nodejs /app/node_modules/.bun ./node_modules/.bun
COPY --from=builder --chown=server:nodejs /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder --chown=server:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder --chown=server:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/package.json ./packages/shared-types/package.json
ENV NODE_ENV=production
ENV SERVER_PORT=3001
EXPOSE 3001
CMD ["bun", "run", "--preload", "./apps/server/dist/instrument.js", "apps/server/dist/index.js"]
