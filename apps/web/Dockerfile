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
COPY apps/web ./apps/web

ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

RUN bun run --filter @twitch-hub/shared-types build && \
    bun run --filter @twitch-hub/web build

# Runtime stage
FROM node:22.14-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit
USER sveltekit

COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build/index.js"]
