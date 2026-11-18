FROM node:22-alpine AS base
WORKDIR /app
RUN npm install --global pnpm@11.11.0

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile --store-dir=/pnpm/store --network-concurrency=4 --fetch-timeout=120000 --fetch-retries=3

FROM dependencies AS build
COPY . .
RUN pnpm run build
RUN --mount=type=cache,target=/pnpm/store CI=true pnpm install --prod --offline --frozen-lockfile --store-dir=/pnpm/store

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node docs ./docs
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
