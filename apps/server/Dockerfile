FROM oven/bun:1-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json bun.lock ./
COPY packages/shared-types ./packages/shared-types
COPY apps/server ./apps/server
COPY docs ./docs
RUN bun install
RUN bun run --filter @twitch-hub/server db:generate
# Bundle server + instrument + seeds into self-contained files (all deps inlined)
RUN bun run --filter @twitch-hub/server build && \
    bun build apps/server/prisma/seed.ts \
      --target=bun --outdir=bundle && \
    bun build apps/server/prisma/seed-achievements.ts \
      --target=bun --outdir=bundle && \
    mv apps/server/dist/* bundle/

FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 server
# Bundled server — zero node_modules needed at runtime
COPY --from=builder --chown=server:nodejs /app/bundle ./
# Prisma schema + config for dbsetup service (db push)
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma.config.js ./prisma.config.js
USER server
ENV NODE_ENV=production
ENV SERVER_PORT=3001
EXPOSE 3001
CMD ["bun", "run", "--preload", "./instrument.js", "./index.js"]
