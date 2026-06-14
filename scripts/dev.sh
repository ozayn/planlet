#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

echo "Planlet — starting dev server"
setup_project

echo "→ Applying database migrations"
npx prisma migrate deploy

echo "→ Generating Prisma client"
npx prisma generate

echo "→ Starting Next.js dev server"
npm run dev
