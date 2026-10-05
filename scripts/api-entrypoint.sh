#!/bin/sh
set -e

cd /app/apps/api

echo "Running Prisma migrations..."
pnpm exec prisma migrate deploy

echo "Seeding roadmap catalog..."
pnpm exec prisma db seed

echo "Starting API on port ${PORT:-6700}..."
exec node dist/index.js
