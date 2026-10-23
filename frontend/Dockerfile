# ==============================================================================
# StarTip Frontend Dockerfile (Supports Development & Production Targets)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base with dependencies
# ------------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_FRONTEND_URL
ARG VITE_VPS_IP

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL \
    VITE_VPS_IP=$VITE_VPS_IP

COPY package*.json ./
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit

# ------------------------------------------------------------------------------
# Target: development (Vite Hot-Reload Server on Port 5173)
# ------------------------------------------------------------------------------
FROM base AS development
COPY . .
EXPOSE 5173
ENV PORT=5173
CMD ["npm", "run", "dev"]

# ------------------------------------------------------------------------------
# Stage 2: Production Build
# ------------------------------------------------------------------------------
FROM base AS builder
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Target: production (Nginx Static Server on Ports 80 and 3000)
# ------------------------------------------------------------------------------
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

