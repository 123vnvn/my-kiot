const MIGRATIONS=[
  {version:1,name:'phase1-auth-audit-tenant',up(db){
    db.exec(`CREATE TABLE IF NOT EXISTS organizations(id INTEGER PRIMARY KEY,name TEXT NOT NULL);
      INSERT OR IGNORE INTO organizations(id,name) VALUES(1,'Bán Hàng Việt Demo');
      CREATE TABLE IF NOT EXISTS audit_log(
        id INTEGER PRIMARY KEY,organization_id INTEGER NOT NULL REFERENCES organizations(id),
        store_id INTEGER REFERENCES stores(id),actor_user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,entity_type TEXT,entity_id TEXT,outcome TEXT NOT NULL,
        detail TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_log(organization_id,created_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);`);
    const storeCols=db.prepare('PRAGMA table_info(stores)').all().map(x=>x.name);
    const userCols=db.prepare('PRAGMA table_info(users)').all().map(x=>x.name);
    const sessionCols=db.prepare('PRAGMA table_info(sessions)').all().map(x=>x.name);
    if(!storeCols.includes('organization_id'))db.exec('ALTER TABLE stores ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1');
    if(!userCols.includes('organization_id'))db.exec('ALTER TABLE users ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1');
    if(!sessionCols.includes('revoked_at'))db.exec('ALTER TABLE sessions ADD COLUMN revoked_at TEXT');
    db.exec("UPDATE sessions SET expires_at=datetime('now') WHERE revoked_at IS NULL");
  }},
  {version:2,name:'phase2-orders-refunds-management',up(db){
    const add=(table,column,sql)=>{const cols=db.prepare('PRAGMA table_info('+table+')').all().map(x=>x.name);if(!cols.includes(column))db.exec('ALTER TABLE '+table+' ADD COLUMN '+sql)};
    add('customers','active','active INTEGER NOT NULL DEFAULT 1');
    add('orders','updated_at',"updated_at TEXT");
    add('payments','kind',"kind TEXT NOT NULL DEFAULT 'sale'");
    add('payments','created_by',"created_by INTEGER REFERENCES users(id)");
    db.exec(`CREATE TABLE IF NOT EXISTS order_returns(
        id INTEGER PRIMARY KEY,code TEXT UNIQUE NOT NULL,order_id INTEGER NOT NULL REFERENCES orders(id),
        store_id INTEGER NOT NULL REFERENCES stores(id),amount INTEGER NOT NULL CHECK(amount>0),
        restock INTEGER NOT NULL CHECK(restock IN(0,1)),idempotency_key TEXT NOT NULL,
        reason TEXT NOT NULL,created_by INTEGER NOT NULL REFERENCES users(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(created_by,idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS return_items(
        id INTEGER PRIMARY KEY,return_id INTEGER NOT NULL REFERENCES order_returns(id),
        order_item_id INTEGER NOT NULL REFERENCES order_items(id),product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL CHECK(quantity>0),amount INTEGER NOT NULL CHECK(amount>=0),UNIQUE(return_id,order_item_id)
      );
      CREATE TABLE IF NOT EXISTS financial_ledger(
        id INTEGER PRIMARY KEY,store_id INTEGER NOT NULL REFERENCES stores(id),order_id INTEGER NOT NULL REFERENCES orders(id),
        return_id INTEGER REFERENCES order_returns(id),kind TEXT NOT NULL CHECK(kind IN('sale','refund')),
        amount INTEGER NOT NULL,idempotency_key TEXT NOT NULL,created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(created_by,idempotency_key)
      );
      CREATE INDEX IF NOT EXISTS idx_returns_order ON order_returns(order_id);
      CREATE INDEX IF NOT EXISTS idx_financial_store_created ON financial_ledger(store_id,created_at);
      CREATE TRIGGER IF NOT EXISTS financial_ledger_no_update BEFORE UPDATE ON financial_ledger BEGIN SELECT RAISE(ABORT,'immutable financial ledger'); END;
      CREATE TRIGGER IF NOT EXISTS financial_ledger_no_delete BEFORE DELETE ON financial_ledger BEGIN SELECT RAISE(ABORT,'immutable financial ledger'); END;
      CREATE TRIGGER IF NOT EXISTS return_items_no_update BEFORE UPDATE ON return_items BEGIN SELECT RAISE(ABORT,'immutable return ledger'); END;
      CREATE TRIGGER IF NOT EXISTS return_items_no_delete BEFORE DELETE ON return_items BEGIN SELECT RAISE(ABORT,'immutable return ledger'); END;`);
    db.exec("INSERT OR IGNORE INTO financial_ledger(store_id,order_id,kind,amount,idempotency_key,created_by,created_at) SELECT store_id,id,'sale',total,'legacy-sale-'||id,created_by,created_at FROM orders WHERE status IN('paid','partial_refund','refunded')");
  }},
  {version:3,name:'phase3-cashier-shifts-receipts',up(db){
    const paymentCols=db.prepare('PRAGMA table_info(payments)').all().map(x=>x.name);
    if(!paymentCols.includes('shift_id'))db.exec('ALTER TABLE payments ADD COLUMN shift_id INTEGER REFERENCES cashier_shifts(id)');
    db.exec(`CREATE TABLE IF NOT EXISTS cashier_shifts(
        id INTEGER PRIMARY KEY,store_id INTEGER NOT NULL REFERENCES stores(id),user_id INTEGER NOT NULL REFERENCES users(id),
        opening_cash INTEGER NOT NULL CHECK(opening_cash>=0),status TEXT NOT NULL CHECK(status IN('open','closed')) DEFAULT 'open',
        open_idempotency_key TEXT NOT NULL,close_idempotency_key TEXT,expected_cash INTEGER,counted_cash INTEGER,difference INTEGER,
        close_note TEXT,opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,closed_at TEXT,UNIQUE(user_id,open_idempotency_key)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_one_open_user ON cashier_shifts(user_id) WHERE status='open';
      CREATE INDEX IF NOT EXISTS idx_shift_store_opened ON cashier_shifts(store_id,opened_at);
      CREATE TABLE IF NOT EXISTS cash_movements(
        id INTEGER PRIMARY KEY,shift_id INTEGER NOT NULL REFERENCES cashier_shifts(id),store_id INTEGER NOT NULL REFERENCES stores(id),
        user_id INTEGER NOT NULL REFERENCES users(id),kind TEXT NOT NULL CHECK(kind IN('pay_in','payout')),
        amount INTEGER NOT NULL CHECK(amount>0),reason TEXT NOT NULL,idempotency_key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,idempotency_key)
      );
      CREATE INDEX IF NOT EXISTS idx_cash_movement_shift ON cash_movements(shift_id,created_at);
      CREATE TRIGGER IF NOT EXISTS closed_shift_no_reopen BEFORE UPDATE OF status ON cashier_shifts WHEN OLD.status='closed' BEGIN SELECT RAISE(ABORT,'closed shift immutable'); END;
      CREATE TRIGGER IF NOT EXISTS cash_movement_no_update BEFORE UPDATE ON cash_movements BEGIN SELECT RAISE(ABORT,'immutable cash movement'); END;
      CREATE TRIGGER IF NOT EXISTS cash_movement_no_delete BEFORE DELETE ON cash_movements BEGIN SELECT RAISE(ABORT,'immutable cash movement'); END;`);
  }},
  {version:4,name:'phase4-suppliers-transfers-stock-counts',up(db){
    db.exec(`CREATE TABLE IF NOT EXISTS suppliers(
        id INTEGER PRIMARY KEY,organization_id INTEGER NOT NULL REFERENCES organizations(id),code TEXT NOT NULL,name TEXT NOT NULL,
        contact_name TEXT,phone TEXT,email TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id,code)
      );
      CREATE TABLE IF NOT EXISTS supplier_products(
        id INTEGER PRIMARY KEY,supplier_id INTEGER NOT NULL REFERENCES suppliers(id),product_id INTEGER NOT NULL REFERENCES products(id),
        supplier_sku TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(supplier_id,product_id),UNIQUE(supplier_id,supplier_sku)
      );
      CREATE TABLE IF NOT EXISTS receiving_notes(
        id INTEGER PRIMARY KEY,code TEXT UNIQUE NOT NULL,supplier_id INTEGER NOT NULL REFERENCES suppliers(id),store_id INTEGER NOT NULL REFERENCES stores(id),
        reference TEXT,reason TEXT NOT NULL,idempotency_key TEXT NOT NULL,created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(created_by,idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS receiving_items(
        id INTEGER PRIMARY KEY,receiving_id INTEGER NOT NULL REFERENCES receiving_notes(id),mapping_id INTEGER NOT NULL REFERENCES supplier_products(id),
        product_id INTEGER NOT NULL REFERENCES products(id),quantity INTEGER NOT NULL CHECK(quantity>0),balance_after INTEGER NOT NULL,UNIQUE(receiving_id,mapping_id)
      );
      CREATE TABLE IF NOT EXISTS inventory_transfers(
        id INTEGER PRIMARY KEY,code TEXT UNIQUE NOT NULL,from_store_id INTEGER NOT NULL REFERENCES stores(id),to_store_id INTEGER NOT NULL REFERENCES stores(id),
        status TEXT NOT NULL CHECK(status IN('in_transit','received')),dispatch_reason TEXT NOT NULL,dispatch_idempotency_key TEXT NOT NULL,
        receive_idempotency_key TEXT,dispatched_by INTEGER NOT NULL REFERENCES users(id),received_by INTEGER REFERENCES users(id),
        dispatched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,received_at TEXT,UNIQUE(dispatched_by,dispatch_idempotency_key),CHECK(from_store_id<>to_store_id)
      );
      CREATE TABLE IF NOT EXISTS inventory_transfer_items(
        id INTEGER PRIMARY KEY,transfer_id INTEGER NOT NULL REFERENCES inventory_transfers(id),source_product_id INTEGER NOT NULL REFERENCES products(id),
        destination_product_id INTEGER NOT NULL REFERENCES products(id),quantity INTEGER NOT NULL CHECK(quantity>0),
        source_balance_after INTEGER NOT NULL,destination_balance_after INTEGER,UNIQUE(transfer_id,source_product_id),UNIQUE(transfer_id,destination_product_id)
      );
      CREATE TABLE IF NOT EXISTS stock_counts(
        id INTEGER PRIMARY KEY,code TEXT UNIQUE NOT NULL,store_id INTEGER NOT NULL REFERENCES stores(id),status TEXT NOT NULL CHECK(status IN('pending','approved')),
        reason TEXT NOT NULL,idempotency_key TEXT NOT NULL,approval_idempotency_key TEXT,created_by INTEGER NOT NULL REFERENCES users(id),
        approved_by INTEGER REFERENCES users(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,approved_at TEXT,UNIQUE(created_by,idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS stock_count_items(
        id INTEGER PRIMARY KEY,count_id INTEGER NOT NULL REFERENCES stock_counts(id),product_id INTEGER NOT NULL REFERENCES products(id),
        expected_quantity INTEGER NOT NULL CHECK(expected_quantity>=0),counted_quantity INTEGER NOT NULL CHECK(counted_quantity>=0),
        correction INTEGER NOT NULL,UNIQUE(count_id,product_id)
      );
      CREATE INDEX IF NOT EXISTS idx_receiving_store_created ON receiving_notes(store_id,created_at);
      CREATE INDEX IF NOT EXISTS idx_transfer_stores_status ON inventory_transfers(from_store_id,to_store_id,status);
      CREATE INDEX IF NOT EXISTS idx_count_store_status ON stock_counts(store_id,status);
      CREATE TRIGGER IF NOT EXISTS receiving_no_update BEFORE UPDATE ON receiving_notes BEGIN SELECT RAISE(ABORT,'immutable receiving'); END;
      CREATE TRIGGER IF NOT EXISTS receiving_no_delete BEFORE DELETE ON receiving_notes BEGIN SELECT RAISE(ABORT,'immutable receiving'); END;
      CREATE TRIGGER IF NOT EXISTS receiving_items_no_update BEFORE UPDATE ON receiving_items BEGIN SELECT RAISE(ABORT,'immutable receiving items'); END;
      CREATE TRIGGER IF NOT EXISTS receiving_items_no_delete BEFORE DELETE ON receiving_items BEGIN SELECT RAISE(ABORT,'immutable receiving items'); END;
      CREATE TRIGGER IF NOT EXISTS transfer_items_no_delete BEFORE DELETE ON inventory_transfer_items BEGIN SELECT RAISE(ABORT,'immutable transfer items'); END;
      CREATE TRIGGER IF NOT EXISTS transfer_items_no_second_receive BEFORE UPDATE OF destination_balance_after ON inventory_transfer_items WHEN OLD.destination_balance_after IS NOT NULL BEGIN SELECT RAISE(ABORT,'received transfer item immutable'); END;
      CREATE TRIGGER IF NOT EXISTS stock_ledger_no_update BEFORE UPDATE ON stock_ledger BEGIN SELECT RAISE(ABORT,'immutable stock ledger'); END;
      CREATE TRIGGER IF NOT EXISTS stock_ledger_no_delete BEFORE DELETE ON stock_ledger BEGIN SELECT RAISE(ABORT,'immutable stock ledger'); END;
      CREATE TRIGGER IF NOT EXISTS count_items_no_update BEFORE UPDATE ON stock_count_items BEGIN SELECT RAISE(ABORT,'immutable count items'); END;
      CREATE TRIGGER IF NOT EXISTS count_items_no_delete BEFORE DELETE ON stock_count_items BEGIN SELECT RAISE(ABORT,'immutable count items'); END;`);
  }},
  {version:5,name:'phase4-inventory-ledger-hardening',up(db){
    db.exec(`CREATE TRIGGER IF NOT EXISTS transfer_items_no_second_receive BEFORE UPDATE OF destination_balance_after ON inventory_transfer_items WHEN OLD.destination_balance_after IS NOT NULL BEGIN SELECT RAISE(ABORT,'received transfer item immutable'); END;
      CREATE TRIGGER IF NOT EXISTS stock_ledger_no_update BEFORE UPDATE ON stock_ledger BEGIN SELECT RAISE(ABORT,'immutable stock ledger'); END;
      CREATE TRIGGER IF NOT EXISTS stock_ledger_no_delete BEFORE DELETE ON stock_ledger BEGIN SELECT RAISE(ABORT,'immutable stock ledger'); END;`);
  }}
];
function migrate(db){
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for(const m of MIGRATIONS){if(!db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(m.version)){
    db.exec('BEGIN IMMEDIATE');try{m.up(db);db.prepare('INSERT INTO schema_migrations(version,name)VALUES(?,?)').run(m.version,m.name);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  }}
}
module.exports={migrate,MIGRATIONS};
