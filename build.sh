#!/usr/bin/env bash
# Builds frontend and backend into ONE dist folder:
#   dist/web     static PWA, served by nginx
#   dist/server  compiled API, run by the backend container
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist

(cd web && pnpm install --frozen-lockfile && pnpm build --outDir ../dist/web --emptyOutDir)
(cd backend && pnpm install --frozen-lockfile && pnpm exec tsc -p tsconfig.build.json --outDir ../dist/server)

# Production dependencies are native (argon2, better-sqlite3), so install them for the SERVER's platform
# inside the same image it runs, then ship them in dist/server/node_modules. Nothing compiles in production.
# Override for an ARM server:  PLATFORM=linux/arm64 ./build.sh
PLATFORM="${PLATFORM:-linux/amd64}"
cp backend/package.json backend/pnpm-lock.yaml dist/server/
docker run --rm --platform "$PLATFORM" -e CI=true -v "$PWD/dist/server:/app" -w /app node:22-alpine sh -c '
  apk add --no-cache python3 make g++ &&
  corepack enable && corepack prepare pnpm@10.20.0 --activate &&
  pnpm install --prod --frozen-lockfile --config.node-linker=hoisted'
docker run --rm --platform "$PLATFORM" -v "$PWD/dist/server:/app" -w /app node:22-alpine \
  node -e "require('argon2'); require('better-sqlite3'); console.log('native modules load OK')"

echo "Built dist/web and dist/server"
