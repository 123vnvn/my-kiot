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
