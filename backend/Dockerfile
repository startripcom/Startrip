# ==============================================================================
# StarTip Backend Dockerfile (Optimized for Dokploy & Production Deployments)
# ==============================================================================
FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files & enable unbuffered standard I/O
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

# Install system runtime & compilation dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies in a dedicated layer for Docker cache reuse
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app/

# Create startip user matching host development user ID 1000
RUN (addgroup --system --gid 1000 startip || groupadd -g 1000 startip || true) && \
    (adduser --system --uid 1000 --gid 1000 --home /home/startip startip || useradd -u 1000 -g 1000 -m startip || true) && \
    chmod +x /app/docker-entrypoint.sh && \
    mkdir -p /app/staticfiles /app/media && \
    chown -R 1000:1000 /app /home/startip

USER startip

EXPOSE 8000

# Built-in Docker Healthcheck checking the Django health API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Run with Gunicorn WSGI server (3 worker processes, 2 threads per worker)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "2", "--timeout", "60", "--access-logfile", "-", "--error-logfile", "-", "startip_backend.wsgi:application"]
