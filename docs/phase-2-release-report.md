# Phase 2 release report

## State
- Branch: `phase-2-core` in the isolated project repository. Parent workspace and WordPress were not touched.
- Scope completed: held orders, held-order cancellation/payment, atomic idempotent partial/full refunds, explicit restock, original-order limits, append-only reversal/financial ledger, net revenue reconciliation, customer soft-delete, employee edit/deactivation/session revocation, server RBAC/store isolation, and linked UI controls.
- Demo mode remains explicit. No public deployment, real data, paid service, dependency/system install, or later F&B/finance module was added.

## Preservation
- Pre-edit source/config and consistent SQLite backup: `backups/pre-phase2-20261009-070803`.
- Backup SQLite integrity: `ok`; pre-edit counts: stores 2, users 10, products 12, customers 2, orders 1, payments 1, stock_ledger 2.
- Release DB backup: `backups/phase2-release-20261009-071211.db`; integrity `ok`; SHA-256 `70B860265BD3AF08D5214532F0670F356EAB790EA1AB3FA326FF7005FD485088`.
- Backup SHA-256: `91CB4061918F3CECC9DA90218B0A14AFC028D795055B7DDE616C2C97FCBAF8BB`.

## Implementation evidence
- Schema migration v2 adds return items, order returns, financial ledger, customer active state and payment metadata. Existing paid orders are backfilled once into the financial ledger.
- Held orders do not reserve/decrement stock; completion atomically validates/decrements current stock. Cancellation is limited to held orders.
- Refunds are manager/owner only, store-scoped, idempotent per actor/key, limited to original quantities net of prior returns, and optionally restock within the same transaction.
- Revenue reports expose gross, refunds and net from the ledger rather than hardcoded UI values.
- Employee mutation revokes existing sessions; managers cannot escalate roles or edit cross-store/manager/owner accounts.

## Verification
- `npm test`: **17 passed, 0 failed** on isolated temporary databases.
- Coverage includes correct/wrong login, logout, expiry, role/store violations, product lifecycle, checkout/stock/idempotency, held cancel/complete, repeated/invalid/concurrent refunds, restock, immutable ledger, net revenue, customer soft-delete and employee session revocation.
- DOM harness: 3 UI tests passed (login success/failure and escaping). This is not browser E2E.
- Live loopback verification: home 200 with demo label; wrong login 401; correct login 200; identity 200; logout 200; revoked token 401. Preview is owned by the verified `node server.js` process on port 4173.
- Real browser E2E attempt returned exactly `browser navigation blocked by policy`; no bypass was attempted.

## Files changed
- `server.js`, `lib/migrations.js`, `public/index.html`
- `test/app.test.js`, `test/phase2.test.js`
- `docs/API.md`, `docs/phase-2-release-report.md`, `CHANGELOG.md`, `README.md`, `package.json`

## Known gaps / next
- UI refund capture uses compact prompt-based item selection rather than a polished return dialog; backend validation is complete.
- Bearer token remains in localStorage for this local demo; production cookie/CSRF/HTTPS/distributed controls remain deferred.
- No stock reservation timeout for held orders; availability is validated at completion.
- Policy-permitted real desktop/mobile browser accessibility and layout E2E remains outstanding.
