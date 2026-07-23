# syntax=docker/dockerfile:1

# ---- Dev stage: Vite dev server with HMR ----
FROM node:24-alpine AS dev
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.15.1 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/frontend/psychologist-portal/package.json ./apps/frontend/psychologist-portal/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @wema/psychologist-portal

WORKDIR /app/apps/frontend/psychologist-portal
EXPOSE 5174
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ---- Build stage: compile static assets ----
FROM dev AS build
COPY tsconfig.frontend.json /app/tsconfig.frontend.json
COPY apps/frontend/psychologist-portal/ /app/apps/frontend/psychologist-portal/
RUN pnpm build

# ---- Production stage: serve with nginx ----
FROM nginx:alpine AS production
COPY --from=build /app/apps/frontend/psychologist-portal/dist /usr/share/nginx/html
EXPOSE 80
