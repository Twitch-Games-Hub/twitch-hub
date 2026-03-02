# Build stage
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

# Install dependencies based on lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY docs/package.json docs/package.json
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/server ./apps/server

RUN pnpm --filter @twitch-hub/shared-types run build && \
    pnpm --filter @twitch-hub/server run db:generate && \
    pnpm --filter @twitch-hub/server run build

# Runtime stage
FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 server

# Copy manifests for production install
COPY --from=builder --chown=server:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=server:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=server:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder --chown=server:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=server:nodejs /app/docs/package.json ./docs/package.json

# Install production dependencies (including Prisma runtime)
# --ignore-scripts avoids running the root "prepare" hook (husky) which is a devDependency
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy bundled server output into the workspace package directory so ESM
# resolution walks up to apps/server/node_modules/ for external deps.
COPY --from=builder --chown=server:nodejs /app/apps/server/dist ./apps/server/dist

# Copy Prisma assets alongside the server
COPY --from=builder --chown=server:nodejs /app/apps/server/prisma/schema.prisma ./apps/server/dist/prisma/schema.prisma
COPY --from=builder --chown=server:nodejs /app/apps/server/src/generated/prisma ./apps/server/dist/src/generated/prisma

USER server
ENV NODE_ENV=production
ENV SERVER_PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://localhost:3001/healthz || exit 1

CMD ["node", "--import", "./apps/server/dist/instrument.js", "./apps/server/dist/index.js"]
