const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp,validateStartup}=require('../server');
let app,base,file,origin;
async function call(url,opt={}){const r=await fetch(base+url,opt),text=await r.text();return{status:r.status,data:text?JSON.parse(text):{},headers:r.headers}}
const login=(headers={})=>call('/api/login',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({email:'owner@demo.local',password:'Demo@123'})});
test.before(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sales-security-'));file=path.join(dir,'test.db');app=createApp({dbFile:file});await new Promise(r=>app.listen(0,'127.0.0.1',r));origin=base='http://127.0.0.1:'+app.address().port});
test.after(async()=>{await new Promise(r=>app.close(r));app.db.close();fs.rmSync(path.dirname(file),{recursive:true,force:true})});

test('default login uses HttpOnly SameSite cookie and omits bearer token',async()=>{const x=await login({origin});assert.equal(x.status,200);assert.equal(x.data.token,undefined);assert.equal(x.data.session_transport,'httpOnly-cookie');assert.equal(x.data.secure_cookie,false);const c=x.headers.get('set-cookie');assert.match(c,/^bhv_session=/);assert.match(c,/HttpOnly/i);assert.match(c,/SameSite=Strict/i);assert.doesNotMatch(c,/; Secure/i);assert.equal(x.data.csrf_token.length,64)});

test('cookie session requires same origin and CSRF for mutations',async()=>{const x=await login({origin}),cookie=x.headers.get('set-cookie').split(';')[0],common={cookie,'content-type':'application/json'};assert.equal((await call('/api/me',{headers:{cookie}})).status,200);assert.equal((await call('/api/session',{method:'DELETE',headers:common})).status,403);assert.equal((await call('/api/session',{method:'DELETE',headers:{...common,origin:'https://evil.example','x-csrf-token':x.data.csrf_token}})).status,403);assert.equal((await call('/api/session',{method:'DELETE',headers:{...common,origin}})).status,403);const ok=await call('/api/session',{method:'DELETE',headers:{...common,origin,'x-csrf-token':x.data.csrf_token}});assert.equal(ok.status,200);assert.match(ok.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await call('/api/me',{headers:{cookie}})).status,401)});

test('cross-origin login is rejected',async()=>{assert.equal((await login({origin:'https://evil.example'})).status,403)});

test('legacy bearer is explicit and remains temporarily compatible',async()=>{const x=await login({origin,'x-legacy-bearer':'1'});assert.equal(x.status,200);assert.equal(x.data.token.length,64);const me=await call('/api/me',{headers:{authorization:'Bearer '+x.data.token}});assert.equal(me.status,200);assert.equal(me.data.session_transport,'legacy-bearer')});

test('login failures are rate limited after five attempts',async()=>{let last;for(let i=0;i<6;i++)last=await call('/api/login',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({email:'limited@example.test',password:'wrong-password'})});assert.equal(last.status,429)});

test('static app has no localStorage bearer or inline script allowance',()=>{const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8'),js=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8'),server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');assert.doesNotMatch(html,/<script>(?:.|\n)*<\/script>/);assert.match(html,/<script src="\/app\.js" defer><\/script>/);assert.doesNotMatch(js,/localStorage|authorization\s*:/i);assert.match(server,/script-src 'self';/);assert.doesNotMatch(server,/script-src[^"]*unsafe-inline/)});

test('real-data startup is fail-closed until every explicit gate is present',()=>{assert.deepEqual(validateStartup({}),{mode:'demo',dbFile:path.join(__dirname,'..','data','sales.db')});assert.throws(()=>validateStartup({APP_MODE:'real'}),/approval/);assert.throws(()=>validateStartup({APP_MODE:'real',REAL_DATA_APPROVED:'YES'}),/DB_FILE/);assert.throws(()=>validateStartup({APP_MODE:'real',REAL_DATA_APPROVED:'YES',DB_FILE:'real.db'}),/HTTPS proxy/);assert.deepEqual(validateStartup({APP_MODE:'real',REAL_DATA_APPROVED:'YES',DB_FILE:'real.db',TRUST_PROXY:'1'}),{mode:'real',dbFile:'real.db'})});
