#!/bin/bash
set -e

echo "=== StarTip Backend Starting ==="

# Wait for PostgreSQL database if configured
if [ -n "$POSTGRES_HOST" ]; then
  echo "Waiting for PostgreSQL at $POSTGRES_HOST:${POSTGRES_PORT:-5432}..."
  while ! nc -z "$POSTGRES_HOST" "${POSTGRES_PORT:-5432}" 2>/dev/null; do
    python -c "import socket; s = socket.socket(); s.connect(('$POSTGRES_HOST', int('${POSTGRES_PORT:-5432}'))); s.close()" 2>/dev/null && break
    echo "PostgreSQL is unavailable - sleeping 1s"
    sleep 1
  done
  echo "PostgreSQL is up and running!"
fi

# Run database migrations and static collection only on primary web service
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations..."
  python manage.py migrate --noinput

  echo "Collecting static assets..."
  python manage.py collectstatic --noinput

  if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
    echo "Checking demo data..."
    python manage.py seed_demo_data || true
  fi
fi

echo "=== Initialization Complete. Launching: $@ ==="
exec "$@"
