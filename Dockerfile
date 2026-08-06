# syntax=docker/dockerfile:1

# Single source of truth is .nvmrc — keep this default in sync with it.
# Override without editing: docker build --build-arg NODE_VERSION=$(cat .nvmrc) .
ARG NODE_VERSION=24.18.0
FROM node:${NODE_VERSION}-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "start:dev"]

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS prod
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
EXPOSE 3000
USER node
CMD ["sh", "-c", "node_modules/.bin/typeorm migration:run -d dist/typeorm-cli.config.js && node dist/src/main.js"]
