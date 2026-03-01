# Build stage
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# Install dependencies based on lockfile
COPY package.json bun.lock ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY docs/package.json docs/package.json
RUN bun install --frozen-lockfile

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/server ./apps/server

RUN bun run --filter @twitch-hub/shared-types build && \
    bun run --filter @twitch-hub/server db:generate && \
    bun run --filter @twitch-hub/server build

# Build seeds
RUN mkdir -p bundle/seeds && \
    bun build apps/server/prisma/seed.ts --target=bun --outdir=bundle/seeds --external "*" && \
    bun build apps/server/prisma/seed-achievements.ts --target=bun --outdir=bundle/seeds --external "*" && \
    mv apps/server/dist/* bundle/

# Runtime stage
FROM oven/bun:1.2-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 server

# Copy bundled server and manifests for production install
COPY --from=builder --chown=server:nodejs /app/bundle ./
COPY --from=builder --chown=server:nodejs /app/package.json /app/bun.lock ./
COPY --from=builder --chown=server:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=server:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=server:nodejs /app/docs/package.json ./docs/package.json

# Install production dependencies (including Prisma runtime)
RUN bun install --frozen-lockfile --production --ignore-scripts

# Copy Prisma assets
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=server:nodejs /app/apps/server/src/generated/prisma ./src/generated/prisma

USER server
ENV NODE_ENV=production
ENV SERVER_PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://localhost:3001/healthz || exit 1

CMD ["bun", "run", "--preload", "./instrument.js", "./index.js"]
