# syntax=docker/dockerfile:1

# ---- Dev stage: Vite dev server with HMR ----
FROM node:24-alpine AS dev
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.15.1 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/frontend/patient-app/package.json ./apps/frontend/patient-app/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @wema/patient-app

# Source is mounted at runtime via a volume — do not COPY here
WORKDIR /app/apps/frontend/patient-app
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ---- Build stage: compile static assets ----
FROM dev AS build
COPY tsconfig.frontend.json /app/tsconfig.frontend.json
COPY apps/frontend/patient-app/ /app/apps/frontend/patient-app/
RUN pnpm build

# ---- Production stage: serve with nginx ----
FROM nginx:alpine AS production
COPY --from=build /app/apps/frontend/patient-app/dist /usr/share/nginx/html
EXPOSE 80
