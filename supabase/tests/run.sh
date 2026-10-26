#!/usr/bin/env bash
# Applies the schema and migrations to a fresh database and runs the SQL tests.
# Usage: DATABASE_URL=postgres://user:pass@host:port/postgres npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DATABASE_URL:?Set DATABASE_URL to a Postgres server you can create databases on}"
TEST_DB="neurafour_test_$$"
ADMIN_URL="$DATABASE_URL"
TEST_URL="${DATABASE_URL%/*}/$TEST_DB"

psql "$ADMIN_URL" -q -c "create database $TEST_DB"
trap 'psql "$ADMIN_URL" -q -c "drop database if exists $TEST_DB with (force)"' EXIT

run() { psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$1"; }
run tests/supabase_stub.sql
run schema.sql
for migration in migrations/*.sql; do run "$migration"; done
for test in tests/*.test.sql; do run "$test"; done
