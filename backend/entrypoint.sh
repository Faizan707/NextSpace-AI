#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  DB_SET=yes
else
  DB_SET=no
fi

echo "ENTRYPOINT db=${DB_SET} railway_env=${RAILWAY_ENVIRONMENT:-unset} port=${PORT:-8000}"

exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
