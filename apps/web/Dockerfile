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

FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit
USER sveltekit
# Same Bun workspace symlink preservation pattern as apps/server/Dockerfile
COPY --from=builder --chown=sveltekit:nodejs /app/node_modules/.bun         ./node_modules/.bun
COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/node_modules      ./apps/web/node_modules
COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/build             ./apps/web/build
COPY --from=builder --chown=sveltekit:nodejs /app/apps/web/package.json      ./apps/web/package.json
COPY --from=builder --chown=sveltekit:nodejs /app/packages/shared-types/src  ./packages/shared-types/src
COPY --from=builder --chown=sveltekit:nodejs /app/packages/shared-types/package.json ./packages/shared-types/package.json
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "apps/web/build/index.js"]
