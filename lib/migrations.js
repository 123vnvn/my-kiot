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
  }}
];
function migrate(db){
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for(const m of MIGRATIONS){if(!db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(m.version)){
    db.exec('BEGIN IMMEDIATE');try{m.up(db);db.prepare('INSERT INTO schema_migrations(version,name)VALUES(?,?)').run(m.version,m.name);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  }}
}
module.exports={migrate,MIGRATIONS};
