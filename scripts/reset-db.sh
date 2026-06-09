#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

echo "Planlet — reset database"
setup_project

echo ""
echo "This will erase all data and re-apply migrations."
echo "DATABASE_URL must point to the database you intend to reset."
echo ""
read -r -p "Type 'yes' to continue: " confirm

if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

echo "→ Running prisma migrate reset"
npx prisma migrate reset

echo "✓ Database reset complete"
