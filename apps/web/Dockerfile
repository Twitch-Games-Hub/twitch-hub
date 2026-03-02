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
COPY apps/web ./apps/web

RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    --mount=type=secret,id=SENTRY_ORG \
    --mount=type=secret,id=SENTRY_PROJECT \
    export SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null)" && \
    export SENTRY_ORG="$(cat /run/secrets/SENTRY_ORG 2>/dev/null)" && \
    export SENTRY_PROJECT="$(cat /run/secrets/SENTRY_PROJECT 2>/dev/null)" && \
    pnpm --filter @twitch-hub/shared-types run build && \
    pnpm --filter @twitch-hub/web run build

# Runtime stage
FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit

# Copy manifests for production install
COPY --from=builder --chown=sveltekit:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder --chown=sveltekit:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder --chown=sveltekit:nodejs /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder --chown=sveltekit:nodejs /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder --chown=sveltekit:nodejs /app/docs/package.json ./docs/package.json

# Install production dependencies (instrumentation.server.ts needs @sentry/sveltekit at runtime)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy build output into the workspace package directory so ESM
# resolution walks up to apps/web/node_modules/ for external deps.
COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/build ./apps/web/build

USER sveltekit

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/build/index.js"]
