# ==============================================================================
# StarTip Unified Dockerfile - Backend + Frontend Multi-stage Build
# Optimized for Dokploy 1-Click Application Deployment
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Builder (Node.js 22 + Vite)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend

# Cache npm dependencies layer
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit

# Build Vite frontend bundle
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Runtime Application Server (Python 3.12 + Django + Gunicorn)
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

# Install system dependencies (including netcat for database readiness check)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY backend/ /app/

# Copy compiled frontend from frontend-builder stage into /app/frontend_dist
COPY --from=frontend-builder /frontend/dist /app/frontend_dist

# Create non-root user with home directory and proper permissions
RUN addgroup --system --gid 1001 startip && \
    adduser --system --uid 1001 --gid 1001 --home /home/startip startip && \
    chmod +x /app/docker-entrypoint.sh && \
    mkdir -p /app/staticfiles /app/media && \
    chown -R startip:startip /app /home/startip


USER startip

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "2", "--timeout", "60", "--access-logfile", "-", "--error-logfile", "-", "startip_backend.wsgi:application"]
