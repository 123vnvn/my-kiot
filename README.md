# Bán Hàng Việt — Phase 2 local demo

A local two-store F&B/retail sales demo. **DEMO ONLY:** fake records and simulated payments; do not enter real customer or business data. It binds only to `127.0.0.1`.

## Run

Requires Node.js 22.5+ (verified on Node 24).

```powershell
cd C:\Users\Nguyen\.openclaw\workspace\projects\sales-management-mvp
npm start
```

Open http://127.0.0.1:4173. Demo password is `Demo@123`; accounts include `owner@demo.local`, `manager1@demo.local`, `cashier1@demo.local`, and `stock1@demo.local` (store 2 equivalents also exist). All are fake demo identities.

## Verify

```powershell
npm test
npm run backup -- data/sales.db backups/manual-check.db
npm run restore:verify -- backups/manual-check.db
```

Tests always create a temporary isolated SQLite DB and do not mutate `data/sales.db`. Backup uses SQLite `VACUUM INTO` so WAL data is included consistently; restore verification uses a temporary copy and never overwrites the live DB.

## Phase 2 capabilities

- 8-hour revocable hashed bearer sessions, RBAC, store and single-demo-organization separation.
- Store-scoped products/categories/customers/inventory; product delete is soft-delete.
- Atomic checkout with DB-derived price/total, exact amount, stock guard, payment, ledger and idempotency.
- DB-derived revenue reports; versioned migrations; credential-free material audit events.
- Security headers, escaped dynamic UI output, JSON/input bounds, local login throttling.

See `docs/API.md`, `docs/phase-1-audit-matrix.md`, and `docs/phase-1-test-evidence.md`.

## Explicit limits

No return/refund/cancel workflow yet (Phase 2). No real payment integration, HTTPS, secure-cookie/CSRF architecture, distributed rate limiting, PostgreSQL, production deployment, offline/realtime, recipe, transfer, shift, kitchen/bar, print, or audit viewer. SQLite is appropriate for this local demo only; this release is not claimed production-ready.

## Phase 2 core
Held orders, cancellations, atomic partial refunds with optional restock, ledger-reconciled net revenue, customer soft-delete and employee lifecycle controls are available through the API and UI. See `docs/API.md` and `docs/phase-2-release-report.md`.

## Chế độ khởi động và bảo mật phiên (2.1.0)

Mặc định npm start chạy APP_MODE=demo trên 127.0.0.1 và giữ dữ liệu mẫu. Xem docs/release-2.1.0-operational-foundation.md và docs/operations-checklist.md. Chế độ real fail-closed và không được bật nếu chưa có phê duyệt, DB_FILE rõ ràng và HTTPS proxy tin cậy.

## Ca thu ngân và hóa đơn (2.2.0)

Thanh toán/hoàn tiền mặt yêu cầu người thao tác mở ca. Ca theo dõi tiền đầu ca, thu/chi, tiền mặt bán/hoàn và chênh lệch kiểm đếm. Hóa đơn 58/80 mm là print preview của trình duyệt, chưa phải tích hợp máy in. Xem docs/release-2.2.0-shifts-receipts.md.
