# Phase 1 release report

## Release state
- Project: `C:\Users\Nguyen\.openclaw\workspace\projects\sales-management-mvp`
- Isolated nested repository/branch: `phase-1-hardening` (new project-specific Git repository). The parent workspace was an unborn repository with unrelated uncommitted files, so no parent checkout/reset/stage was performed.
- Running: http://127.0.0.1:4173, loopback only; verified sales process command `node server.js`.
- Live HTTP: home 200 with demo label and CSP; correct login + bootstrap 200; wrong password 401; logout 200; revoked-token reuse 401.

## Backups and data preservation
- Pre-edit source/config + consistent SQLite snapshot: `backups/pre-phase1-20261009-000239`
- Pre-edit DB SHA-256: `360EE022075EB2BEFA384152DB5BEA6699D34DDD74DEFC717F2D3FEE5F95B873`
- Release DB backup: `backups/phase1-release-20261009-000911.db`
- Release DB SHA-256: `F0C39B2B29A40A8348D2EA3637908B34E2F2E59572A4662C69F8458244F618DD`
- Both backups passed SQLite integrity checks. Restore verification copied to an isolated file/location and did not overwrite the live database.
- Business counts before → after: stores 2→2, users 10→10, products 12→12, customers 2→2, orders 1→1, payments 1→1, stock_ledger 2→2. Final live `PRAGMA integrity_check`: ok. Test orders/products used only an isolated temporary database.

## Verification
- `npm test`: 10 passed, 0 failed.
- Syntax checks: server, migration and backup/restore scripts passed.
- Legacy migration was tested against an isolated copy of the pre-edit backup: migration v1, integrity ok, existing order count preserved.
- Live code identity/behavior checked via loopback HTTP and process/port ownership.
- Real browser E2E: **blocked**. Managed Chromium was available, but opening `http://127.0.0.1:4173/` returned exactly `browser navigation blocked by policy`. This was not bypassed. Desktop/mobile layout and touch behavior therefore remain unverified in a real browser; the DOM harness is not represented as browser E2E.

## Source/config changed
- `server.js`, `public/index.html`, `package.json`, `README.md`, `.gitignore`
- `lib/migrations.js`
- `scripts/backup.js`, `scripts/restore-verify.js`
- `test/app.test.js`, `test/login-ui.test.js`
- `docs/API.md`, `docs/phase-1-audit-matrix.md`, `docs/phase-1-test-evidence.md`, this report, and `CHANGELOG.md`

## Remaining issues / Phase 2 gate
1. Returns/refunds/cancellations are absent and explicitly deferred; design an atomic reversal ledger before UI.
2. Replace bearer token in localStorage with production session-cookie + CSRF design; add HTTPS, distributed rate limiting, secrets/config management and deployment hardening.
3. PostgreSQL/typed service architecture is recommended for commercial use, but not implemented or claimed ready.
4. Add audit viewer/export, retention policy and broader read/security-event coverage.
5. Complete policy-permitted desktop/tablet/mobile browser E2E, accessibility and touch/layout checks.
6. Build the original Bán Hàng Việt UI direction from the supplied collage without copying referenced brands/assets; use only database-derived KPIs.
