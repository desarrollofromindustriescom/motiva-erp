# Stage 1: build the Angular frontend (production configuration)
FROM node:26-alpine AS frontend-build

RUN corepack enable

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY frontend/ ./

RUN pnpm exec ng build --configuration production

# Stage 2: nginx serving the static frontend and proxying the api
FROM nginx:1.31-alpine

COPY --from=frontend-build /app/dist/motiva-erp-front/browser /usr/share/nginx/html

# Real client IP behind Cloudflare (included in the http context)
COPY nginx/cloudflare-realip.conf /etc/nginx/conf.d/00-cloudflare-realip.conf

# Rendered with envsubst at container start (only ${API_HOST} and ${API_PORT} are substituted)
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

ENV NGINX_ENVSUBST_FILTER=API_
