# Readiness matrix 2.2.0

| Hạng mục | Trạng thái | Bằng chứng / khoảng trống |
|---|---|---|
| Cookie/CSRF/CSP | Implemented, API-tested | test/security-session.test.js; live-smoke 4174. Chưa HTTPS/browser E2E. |
| Login → bootstrap | API/static verified | 4174 smoke đạt; không gọi là browser E2E. |
| POS sale/stock/ledger | Implemented, isolated tests | app.test.js, phase2.test.js, phase3-shifts.test.js. |
| Refund/revenue | Implemented, isolated tests | Refund âm trong payments/ledger; report reconciliation tests. |
| Cashier shifts | Implemented increment | Opening, movements, cash sale/refund, close variance, idempotency/store scope tested. Chưa multi-drawer UAT. |
| 58/80mm receipt | Print preview implemented | Stored-fact API + CSS print widths/static checks. Chưa kiểm thử máy in/hardware. |
| Backup/restore | Verified locally | Pre-shift VACUUM backup + isolated restore integrity ok. Chưa RPO/RTO drill staging. |
| Demo/real gate | Fail-closed | APP_MODE real prerequisites tested; chưa bật real. |
| PostgreSQL | Not implemented/tested | Chỉ đánh giá rollout; SQLite demo hiện tại. |
| Browser E2E | Blocked/not run | Localhost browser policy trước đó từ chối; không bypass. |
| Production acceptance | Not ready | Thiếu HTTPS staging, UAT, observability, security/load/DR/printer acceptance. |
