# API v2 (local demo)

Base URL: `http://127.0.0.1:4173`. JSON mutations require `Content-Type: application/json`; authenticated routes require `Authorization: Bearer <token>`. Mutation idempotency keys are 8–128 characters.

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
