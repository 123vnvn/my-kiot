# 2.2.0 — 2026-10-09
- Added cashier shift opening, immutable cash movements, cash payment/refund linkage, and counted-vs-expected close reconciliation.
- Cash sales/refunds now require the acting user's open store shift; non-cash remains independent.
- Added store-scoped receipt API and browser print preview for 58/80 mm layouts.
- Added isolated phase-3 tests, live API/static smoke script, release report, and updated readiness matrix.

# 2.1.0 — 2026-10-09
- HttpOnly cookie sessions, Origin/CSRF checks, reduced login rate limit, logout revocation.
- Removed browser localStorage bearer use; retained explicit temporary bearer compatibility.
- Externalized app JS and removed unsafe-inline from script CSP.
- Added accessible validated refund dialog and fail-closed real-data startup gate.
- Added operational release evidence/checklist and PostgreSQL rollout assessment.

# Changelog

## 2.0.0 — Phase 2 core
- Added held orders with atomic completion and held-only cancellation.
- Added idempotent partial/full refunds, explicit restock, original-order limits, immutable financial/return ledgers and reconciled net revenue.
- Added customer soft-delete and employee edit/deactivation with session revocation and manager/store RBAC.
- Linked Phase 2 operations into the demo UI and expanded isolated regression coverage to 17 tests.

## 1.1.0 — Phase 1 (2026-10-09)
- Added revocable/expiring hashed sessions, logout API, login throttling and auth audit.
- Added organization/store foundations and repaired cross-store category assignment.
- Fixed duplicate-line order stock inconsistency; retained authoritative totals, atomic stock/payment/ledger and idempotency.
- Added versioned atomic migration v1 and audit_log.
- Enforced JSON media type and bounded core inputs; added security headers and UI output escaping.
- Added consistent SQLite backup and isolated restore verification scripts.
- Expanded isolated tests to 10 Phase 1 regressions and documented API/audit/stack tradeoffs.
- Return/refund remains deferred; no production-readiness claim.
