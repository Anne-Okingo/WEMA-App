# syntax=docker/dockerfile:1

# ---- Stage 1: install all workspace dependencies ----
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.15.1 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/api/package.json ./apps/backend/api/
COPY packages/database/package.json ./packages/database/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Stage 2: generate Prisma client, compile both packages ----
FROM deps AS build
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/database/ ./packages/database/
COPY apps/backend/api/ ./apps/backend/api/

RUN pnpm --filter @wema/database db:generate
RUN pnpm --filter @wema/database build
RUN pnpm --filter @wema/api build

# ---- Stage 3: production image ----
FROM node:24-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.15.1 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/api/node_modules ./apps/backend/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/api/package.json ./apps/backend/api/
COPY packages/database/package.json ./packages/database/

COPY --from=build /app/apps/backend/api/dist ./apps/backend/api/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/database/generated ./packages/database/generated
COPY --from=build /app/packages/database/prisma ./packages/database/prisma

EXPOSE 3000

CMD ["node", "apps/backend/api/dist/app/server.js"]
