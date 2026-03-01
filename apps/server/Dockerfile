FROM oven/bun:1-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN bun install --frozen-lockfile
RUN bun run --filter @twitch-hub/server db:generate
# Bundle server + instrument + seeds into self-contained files (all deps inlined)
RUN bun build apps/server/src/index.ts \
      --target=bun --outdir=bundle --sourcemap=external && \
    bun build apps/server/src/instrument.ts \
      --target=bun --outdir=bundle --sourcemap=external && \
    bun build apps/server/prisma/seed.ts \
      --target=bun --outdir=bundle && \
    bun build apps/server/prisma/seed-achievements.ts \
      --target=bun --outdir=bundle

FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 server
# Bundled server — zero node_modules needed at runtime
COPY --from=builder --chown=server:nodejs /app/bundle ./
# Prisma schema + config for dbsetup service (db push)
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma.config.ts ./prisma.config.ts
USER server
ENV NODE_ENV=production
ENV SERVER_PORT=3001
EXPOSE 3001
CMD ["bun", "run", "--preload", "./instrument.js", "./index.js"]
