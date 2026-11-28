#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
{
 printf '%s\n' 'BEGIN;' 'SELECT pg_advisory_xact_lock(21472026);' 'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());'
 for file in migrations/[0-9][0-9][0-9]_*.sql; do
  version=$(basename "$file" .sql)
  case "$version" in *[!a-zA-Z0-9_]*) exit 1;; esac
  printf '%s\n' "SELECT NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='$version') AS pending" '\gset' '\if :pending'
  cat "$file"
  printf '%s\n' "INSERT INTO schema_migrations(version) VALUES ('$version');" '\endif'
 done
 printf '%s\n' 'COMMIT;'
} | docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U dboidle -d dboidle
