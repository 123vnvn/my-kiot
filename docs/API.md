# API v2 (local demo)

Base URL mặc định: `http://127.0.0.1:4173`. Trình duyệt dùng cookie HttpOnly và `X-CSRF-Token` cho mutation; bearer chỉ là compatibility tạm thời khi login gửi `x-legacy-bearer: 1`. JSON mutations require `Content-Type: application/json`; idempotency keys dài 8–128 ký tự.

| Method | Path | Roles | Behavior |
|---|---|---|---|
| POST | /api/login | public | Login, 8-hour hashed bearer session. |
| DELETE | /api/session | authenticated | Revoke current session. |
| GET | /api/bootstrap?store_id= | authenticated | Store-scoped products, customers and permitted employees. |
| POST/PUT/DELETE | /api/products | owner, manager | Create/edit/soft-delete; category and store checked server-side. |
| POST | /api/inventory/adjust | owner, manager, inventory | Atomic stock adjustment with immutable stock history. |
| POST/PUT/DELETE | /api/customers | owner, manager, cashier | Store-scoped CRUD; DELETE soft-deactivates. |
| POST/PUT/DELETE | /api/users | owner; manager limited | Create/edit/deactivate. Password/role/deactivation changes revoke all target sessions. Managers cannot edit managers/owners or cross-store users. |
| POST | /api/orders | owner, manager, cashier | Immediate atomic checkout, payment, stock and financial ledger. |
| POST | /api/orders/hold | owner, manager, cashier | Store order without payment or stock movement. |
| POST | /api/orders/:id/complete | owner, manager, cashier | Atomically pay a held order and decrement stock. |
| POST | /api/orders/:id/cancel | owner, manager, cashier | Cancel held order only; paid orders must use refund. |
| POST | /api/orders/:id/refunds | owner, manager | Atomic partial/full refund. Body includes `reason`, explicit boolean `restock`, and `items[{order_item_id,quantity}]`. Original-order quantity limits enforced. |
| GET | /api/orders?store_id= | owner, manager, cashier | Latest 100; status, refunded amount and item JSON. |
| GET | /api/stock-ledger?store_id= | owner, manager, inventory | Latest 100 stock movements. |
| GET | /api/reports/revenue | owner, manager | Gross sales, refunds and net revenue derived from immutable financial ledger. |

Financial and return ledger rows are append-only (database triggers reject update/delete). All order state transitions and stock/refund effects run inside `BEGIN IMMEDIATE` transactions.

## Ca thu ngân và hóa đơn (v3)

| Method | Path | Roles | Behavior |
|---|---|---|---|
| GET | /api/shifts/current?store_id= | owner, manager, cashier | Ca mở của tài khoản tại cửa hàng. |
| GET | /api/shifts?store_id= | owner, manager, cashier | Owner/manager xem cửa hàng; cashier chỉ xem ca của mình. |
| POST | /api/shifts/open | owner, manager, cashier | Mở ca với opening_cash; idempotent. |
| POST | /api/shifts/:id/movements | owner, manager, cashier | Pay-in/payout có lý do trên ca đang mở của mình. |
| POST | /api/shifts/:id/close | owner, manager, cashier | Chốt expected/count/difference; idempotent. |
| GET | /api/orders/:id/receipt?store_id= | owner, manager, cashier | Dữ liệu hóa đơn/reprint store-scoped từ bản ghi thật. |

Cash payment/refund yêu cầu ca mở và được gắn payments.shift_id.
