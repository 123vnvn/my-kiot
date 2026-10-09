# Phase 1 audit and evidence matrix

Date: 2026-10-09. Scope inspected: package.json, README.md, server.js, public/index.html, both original tests, SQLite schema/data.

| Area | Before | Phase 1 evidence / disposition | Status |
|---|---|---|---|
| Correct login | Prior UI toast move did not establish the cause of any correct-login failure. API/login + bootstrap path reproduced in isolated DB and later live HTTP. | Tests: correct login, bootstrap/UI reveal. | Fixed/verified |
| Wrong login | Visible toast existed; no throttling/audit. | Generic 401, bounded in-memory attempts, failure audit without password. | Fixed |
| Logout/expiry | Logout only cleared browser storage; server session remained valid. Expiry existed in query but had no explicit regression. | DELETE /api/session revokes; 8h expiry, expired-session test, 401 UI recovery. | Fixed |
| Session storage | Raw bearer token stored in SQLite. | SHA-256 token lookup at rest; old sessions invalidated by migration. | Fixed for demo |
| RBAC/store | Basic checks existed. Product PUT accepted a category from another store. | All store resolution verifies organization + store; update validates category store; forbidden/cross-store tests. | Fixed |
| Organization | No organization model. | Single demo organization, organization_id on stores/users, filtered owner listings. Multi-tenant admin workflows deferred. | Foundation |
| Order integrity | Server totals and transaction existed. Repeating one product in multiple cart lines could compute twice while applying stock incorrectly. | Duplicate product IDs rejected; exact amount, stock, payment, ledger and idempotency regression tests. | Fixed |
| Input/errors | JSON size check existed, but no media-type enforcement and weak field bounds. | JSON content-type/object checks, byte limit, bounded key/name/SKU/password/reason/customer fields, email shape checks and integer constraints. | Improved |
| XSS | Database strings and toast errors were interpolated into innerHTML. | Escaping helper applied to DB-derived UI strings; toast uses textContent; CSP/security headers; DOM source regression. | Fixed in current surfaces |
| Audit | No general audit table. | audit_log records auth and material mutations; test confirms no submitted passwords in detail. Read-audit export deferred. | Foundation |
| Migrations | Schema was CREATE IF NOT EXISTS only. | schema_migrations + atomic v1 migration; reopen test. | Fixed |
| Backup/restore | No operator tooling. | SQLite VACUUM INTO backup; isolated-copy integrity restore verification; pre-edit backup verified. | Fixed |
| Metrics | Reports derived from database. | Preserved; reconciliation test checks order count/revenue. No hardcoded KPI added. | Verified |
| Browser E2E | Prior localhost browser navigation was policy-denied. | Retried only through approved browser tool after release; result recorded in release evidence. DOM harness is explicitly not browser E2E. | See evidence |
| Returns/refunds | Not implemented. | Explicitly deferred to Phase 2; no fake controls/API. | Deferred |

## Stack decision

Phase 1 deliberately retained Node built-in HTTP + node:sqlite and the existing HTML/CSS/JS UI. It minimizes migration risk and preserves the working demo while security/data invariants are repaired. Converting now to React/TypeScript/Tailwind + Node TypeScript + PostgreSQL would multiply change surface before behavior is pinned down. For a commercial release, PostgreSQL, typed service boundaries, managed migrations, secure cookies/CSRF, external rate limiting, structured logs and deployment hardening are recommended. This SQLite build is **not PostgreSQL-ready** and is not claimed production-ready.

## Future UI direction

The supplied collage is recorded as inspiration only: an original Bán Hàng Việt identity with dark organized sidebar, spacious light content, DB-derived KPI cards/charts/tables, and touch-friendly POS on desktop/tablet/mobile. Do not copy KiotViet/Sapo/MISA/DineLink brands, assets, or protected layouts. UI modernization is a later stage, not Phase 1 scope.
