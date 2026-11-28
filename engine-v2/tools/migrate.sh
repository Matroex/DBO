#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Single psql session and transaction; serialize concurrent runners.
# This initial migration is immutable after application.
{
 printf '%s\n' 'BEGIN;' 'SELECT pg_advisory_xact_lock(21472026);' 'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());'
 printf '%s\n' "SELECT NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='001_foundation') AS pending" '\gset' '\if :pending'
 cat migrations/001_foundation.sql
 printf '%s\n' "INSERT INTO schema_migrations(version) VALUES ('001_foundation');" '\endif' 'COMMIT;'
} | docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U dboidle -d dboidle
