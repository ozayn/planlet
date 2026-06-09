#!/usr/bin/env bash

# Shared helpers for Planlet local development scripts.

find_project_root() {
  local dir
  dir="$(pwd)"

  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" && -d "$dir/prisma" ]]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done

  echo "Error: could not find Planlet project root (package.json + prisma/)." >&2
  return 1
}

require_env_file() {
  local root="$1"

  if [[ ! -f "$root/.env" ]]; then
    echo "Error: .env not found in $root" >&2
    echo "Copy .env.example to .env and fill in your values:" >&2
    echo "  cp .env.example .env" >&2
    return 1
  fi
}

ensure_node_modules() {
  local root="$1"

  if [[ ! -d "$root/node_modules" ]]; then
    echo "→ node_modules missing — running npm install"
    (cd "$root" && npm install)
  fi
}

setup_project() {
  local root
  root="$(find_project_root)" || exit 1
  cd "$root"
  require_env_file "$root"
  ensure_node_modules "$root"
}
