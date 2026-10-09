# Phase 1 test evidence

Command: `npm test` (isolated temporary SQLite database; live demo database is not mutated).

Result on 2026-10-09: 10 tests, 10 passed, 0 failed. Covered: correct/wrong login, hashed/revoked/expired session, server RBAC and cross-store denial, invalid JSON/media type/category IDs, product create/edit/soft-delete/search data, duplicate cart lines, authoritative totals, stock, payment, ledger, idempotency, report reconciliation, migration/reopen integrity, UI login state, visible errors and output escaping.

Syntax checks: server.js, lib/migrations.js, scripts/backup.js and scripts/restore-verify.js passed `node --check`.

DOM harness limitation: it executes the inline script with fakes; it is not a real browser, rendering engine, layout, touch, or network test. Managed Chromium launch was available, but navigation to the loopback URL was blocked by policy (`browser navigation blocked by policy`). No bypass was attempted. Desktop/mobile browser E2E remains unverified.
