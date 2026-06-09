#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

root="$(find_project_root)" || exit 1
cd "$root"

issues=0

warn() {
  echo "⚠ $*" >&2
  issues=$((issues + 1))
}

fail_tracked() {
  echo "✗ Tracked sensitive file: $*" >&2
  issues=$((issues + 1))
}

echo "Planlet — secrets audit"
echo "→ Scanning $root"

# --- Tracked files that must never be committed ---
for sensitive in .env .env.local .env.development .env.production; do
  if git ls-files --error-unmatch "$sensitive" &>/dev/null; then
    fail_tracked "$sensitive is tracked by git — run: git rm --cached $sensitive"
  fi
done

for sensitive_dir in node_modules .next app/generated/prisma; do
  if git ls-files --error-unmatch "$sensitive_dir" &>/dev/null; then
    fail_tracked "$sensitive_dir is tracked by git"
  fi
done

# --- Build file list (exclude ignored build/vendor paths) ---
scan_files=()
while IFS= read -r file; do
  scan_files+=("$file")
done < <(
  find . \
    -path ./.git -prune -o \
    -path ./node_modules -prune -o \
    -path ./.next -prune -o \
    -path ./app/generated/prisma -prune -o \
    -path ./scripts/check-secrets.sh -prune -o \
    -type f \
    ! -name ".env" \
    ! -name ".env.local" \
    ! -name ".env.development" \
    ! -name ".env.production" \
    -print
)

is_placeholder_line() {
  local line="$1"
  [[ "$line" =~ (replace-me|replace-with|your-|USER:PASSWORD@HOST|example\.com|your-app\.up\.railway\.app|your-google-|sk-your-|# from Railway|openssl rand) ]]
}

scan_pattern() {
  local label="$1"
  local pattern="$2"
  local file line

  for file in "${scan_files[@]}"; do
    [[ -f "$file" ]] || continue
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ $pattern ]] && ! is_placeholder_line "$line"; then
        warn "$label in ${file#./}"
      fi
    done <"$file"
  done
}

# OpenAI API keys (real keys are long; placeholders like sk-your- are OK)
scan_pattern "Likely OpenAI API key" 'OPENAI_API_KEY.*sk-[a-zA-Z0-9]{20,}'

# Anthropic API keys
scan_pattern "Likely Anthropic API key" 'ANTHROPIC_API_KEY.*sk-ant-[a-zA-Z0-9]{20,}'
scan_pattern "Likely Anthropic API key" 'sk-ant-[a-zA-Z0-9]{20,}'

# Google OAuth client secret prefix
scan_pattern "Likely Google client secret" 'AUTH_GOOGLE_SECRET.*GOCSPX-'

# Google OAuth client IDs (numeric project id)
scan_pattern "Likely Google client ID" '[0-9]{12,}-[a-z0-9]+\.apps\.googleusercontent\.com'

# Database URLs with host credentials (not placeholder USER:PASSWORD)
for file in "${scan_files[@]}"; do
  [[ -f "$file" ]] || continue
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ postgres(ql)?:// ]] && [[ ! "$line" =~ USER:PASSWORD@HOST ]] && ! is_placeholder_line "$line"; then
      warn "Likely database URL in ${file#./}"
    fi
  done <"$file"
done

# Long AUTH_SECRET values (likely generated secrets)
for file in "${scan_files[@]}"; do
  [[ -f "$file" ]] || continue
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ AUTH_SECRET ]] && [[ "$line" =~ AUTH_SECRET[^=]*=[^[:space:]#]{24,} ]] && ! is_placeholder_line "$line"; then
      warn "Likely AUTH_SECRET value in ${file#./}"
    fi
  done <"$file"
done

# Personal emails in committable env example (non-example.com domains)
if [[ -f .env.example ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^ALLOWED_EMAILS= ]] && [[ "$line" =~ @[a-zA-Z0-9.-]+ ]] && [[ ! "$line" =~ @example\.com ]]; then
      warn "Non-placeholder ALLOWED_EMAILS in .env.example"
    fi
  done <".env.example"
fi

# Ensure local .env stays ignored
if [[ -f .env ]] && ! git check-ignore -q .env; then
  warn ".env exists but is not gitignored — update .gitignore"
fi

if [[ "$issues" -gt 0 ]]; then
  echo ""
  echo "✗ Secrets audit failed ($issues issue(s)). Remove secrets from tracked files; keep them in .env only."
  exit 1
fi

echo "✓ No likely secrets found in committable files"
