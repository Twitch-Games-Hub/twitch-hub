FROM oven/bun:1-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN bun install --frozen-lockfile
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

RUN bun run --filter @twitch-hub/web build

FROM oven/bun:1-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY docs/package.json ./docs/
RUN mkdir -p packages/shared-types/src apps/web/node_modules
RUN bun install --production --frozen-lockfile --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit
USER sveltekit
# Place build inside apps/web/ so Node's module resolution walks through
# apps/web/node_modules (workspace-scoped) then /app/node_modules (hoisted).
COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/build ./apps/web/build
COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/package.json ./apps/web/package.json
COPY --from=prod-deps --chown=sveltekit:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=sveltekit:nodejs /app/apps/web/node_modules ./apps/web/node_modules
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/build/index.js"]
