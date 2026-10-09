const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createApp,open}=require('../server');
let app,base,file;
async function call(url,opt={}){const r=await fetch(base+url,opt),text=await r.text();return{status:r.status,data:text?JSON.parse(text):{},headers:r.headers}}
const json=(body,extra={})=>({method:'POST',headers:{'content-type':'application/json',...extra},body:JSON.stringify(body)});
const headers=(token,extra={})=>({'content-type':'application/json',authorization:'Bearer '+token,...extra});
async function login(email='owner@demo.local',password='Demo@123'){const x=await call('/api/login',json({email,password},{'x-legacy-bearer':'1'}));if(x.data.token)await call('/api/shifts/open',{method:'POST',headers:headers(x.data.token,{'idempotency-key':'shift-'+email}),body:JSON.stringify({store_id:x.data.user.store_id||1,opening_cash:0})});return x}
test.before(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sales-phase1-'));file=path.join(dir,'test.db');app=createApp({dbFile:file});await new Promise(r=>app.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.address().port});
test.after(async()=>{await new Promise(r=>app.close(r));app.db.close();fs.rmSync(path.dirname(file),{recursive:true,force:true})});

test('correct and wrong login, hashed session storage, logout revocation',async()=>{
  const wrong=await login('owner@demo.local','wrong-password');assert.equal(wrong.status,401);assert.match(wrong.data.error,/khẩu/);
  const ok=await login();assert.equal(ok.status,200);assert.equal(ok.data.token.length,64);assert.equal(ok.data.expires_in,28800);
  const stored=app.db.prepare('SELECT token FROM sessions WHERE user_id=? ORDER BY rowid DESC LIMIT 1').get(ok.data.user.id).token;
  assert.notEqual(stored,ok.data.token);assert.equal(stored,crypto.createHash('sha256').update(ok.data.token).digest('hex'));
  assert.equal((await call('/api/me',{headers:headers(ok.data.token)})).status,200);
  assert.equal((await call('/api/session',{method:'DELETE',headers:headers(ok.data.token)})).status,200);
  assert.equal((await call('/api/me',{headers:headers(ok.data.token)})).status,401);
});

test('expired session is rejected',async()=>{
  const x=await login('manager1@demo.local');assert.equal(x.status,200);
  const key=crypto.createHash('sha256').update(x.data.token).digest('hex');app.db.prepare("UPDATE sessions SET expires_at=datetime('now','-1 second') WHERE token=?").run(key);
  assert.equal((await call('/api/me',{headers:headers(x.data.token)})).status,401);
});

test('server enforces role, store and organization boundaries',async()=>{
  const manager=(await login('manager1@demo.local')).data.token,cashier=(await login('cashier1@demo.local')).data.token,stock=(await login('stock1@demo.local')).data.token;
  assert.equal((await call('/api/bootstrap?store_id=2',{headers:headers(manager)})).status,403);
  assert.equal((await call('/api/reports/revenue?store_id=1',{headers:headers(cashier)})).status,403);
  assert.equal((await call('/api/inventory/adjust',{method:'POST',headers:headers(cashier),body:JSON.stringify({store_id:1,product_id:1,change:1,reason:'x'})})).status,403);
  assert.equal((await call('/api/orders?store_id=1',{headers:headers(stock)})).status,403);
  assert.equal((await call('/api/customers',{method:'POST',headers:headers(stock),body:JSON.stringify({store_id:1,name:'x'})})).status,403);
});

test('invalid payloads and cross-store category IDs are rejected',async()=>{
  const manager=(await login('manager1@demo.local')).data.token;
  assert.equal((await call('/api/products',{method:'POST',headers:{authorization:'Bearer '+manager},body:'{}'})).status,415);
  assert.equal((await call('/api/products',{method:'POST',headers:headers(manager),body:'{'})).status,400);
  const cross=await call('/api/products',{method:'PUT',headers:headers(manager),body:JSON.stringify({id:1,store_id:1,name:'Safe',sku:'TT-CF01',price:32000,category_id:4})});assert.equal(cross.status,400);
  const duplicate=await call('/api/orders',{method:'POST',headers:headers(manager,{'idempotency-key':'duplicate-lines'}),body:JSON.stringify({store_id:1,payment_method:'cash',amount:64000,items:[{product_id:1,quantity:1},{product_id:1,quantity:1}]})});assert.equal(duplicate.status,400);
});

test('product create, edit, soft-delete and bootstrap search data regressions',async()=>{
  const manager=(await login('manager1@demo.local')).data.token;
  const created=await call('/api/products',{method:'POST',headers:headers(manager),body:JSON.stringify({store_id:1,name:'Phase One Tea',sku:'P1-TEA',price:27000,category_id:1})});assert.equal(created.status,201);
  const edited=await call('/api/products',{method:'PUT',headers:headers(manager),body:JSON.stringify({id:created.data.id,store_id:1,name:'Phase One Tea Plus',sku:'P1-TEA',price:29000,category_id:1})});assert.equal(edited.status,200);
  let boot=await call('/api/bootstrap?store_id=1',{headers:headers(manager)}),found=boot.data.products.find(x=>x.id===created.data.id);assert.equal(found.name,'Phase One Tea Plus');assert.ok((found.name+' '+found.sku).toLowerCase().includes('tea'));
  assert.equal((await call('/api/products',{method:'DELETE',headers:headers(manager),body:JSON.stringify({id:created.data.id,store_id:1})})).status,200);
  boot=await call('/api/bootstrap?store_id=1',{headers:headers(manager)});found=boot.data.products.find(x=>x.id===created.data.id);assert.equal(found.active,0);assert.equal(app.db.prepare('SELECT count(*) n FROM products WHERE id=?').get(created.data.id).n,1);
});

test('order totals, stock, idempotency and reports reconcile',async()=>{
  const token=(await login('cashier1@demo.local')).data.token,before=app.db.prepare('SELECT quantity FROM inventory WHERE product_id=1').get().quantity;
  const wrong=await call('/api/orders',{method:'POST',headers:headers(token,{'idempotency-key':'wrong-total-p1'}),body:JSON.stringify({store_id:1,payment_method:'cash',amount:1,items:[{product_id:1,quantity:2}]})});assert.equal(wrong.status,400);
  const key='checkout-phase1-fixed',ok=await call('/api/orders',{method:'POST',headers:headers(token,{'idempotency-key':key}),body:JSON.stringify({store_id:1,payment_method:'cash',amount:64000,items:[{product_id:1,quantity:2}]})});assert.equal(ok.status,201);assert.equal(ok.data.total,64000);
  const dup=await call('/api/orders',{method:'POST',headers:headers(token,{'idempotency-key':key}),body:'{}'});assert.equal(dup.status,200);assert.equal(dup.data.id,ok.data.id);assert.equal(dup.data.duplicate,true);
  assert.equal(app.db.prepare('SELECT quantity FROM inventory WHERE product_id=1').get().quantity,before-2);assert.equal(app.db.prepare('SELECT count(*) n FROM payments WHERE order_id=?').get(ok.data.id).n,1);assert.equal(app.db.prepare('SELECT count(*) n FROM stock_ledger WHERE order_id=?').get(ok.data.id).n,1);
  const manager=(await login('manager1@demo.local')).data.token,day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),report=await call('/api/reports/revenue?store_id=1&from='+day+'&to='+day,{headers:headers(manager)});assert.equal(report.status,200);assert.equal(report.data.summary.order_count,1);assert.equal(report.data.summary.revenue,64000);
});

test('migrations and credential-free audit records persist after reopen',()=>{
  assert.equal(app.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(app.db.prepare('SELECT max(version) v FROM schema_migrations').get().v,5);
  const audits=app.db.prepare('SELECT action,detail FROM audit_log').all();assert.ok(audits.some(x=>x.action==='auth.login'));assert.ok(audits.some(x=>x.action==='order.create'));assert.equal(JSON.stringify(audits).includes('Demo@123'),false);assert.equal(JSON.stringify(audits).includes('wrong-password'),false);
  app.db.exec('PRAGMA wal_checkpoint(FULL)');const second=open(file);assert.equal(second.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(second.prepare('SELECT count(*) n FROM orders').get().n,1);second.close();
});
