const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');

function harness(mode){
  const elements=new Map();
  function element(selector){
    if(!elements.has(selector)) elements.set(selector,{hidden:selector==='#app',innerHTML:'',textContent:'',value:'',disabled:false,elements:{},classList:{add(){},remove(){}},scrollIntoView(){},reset(){},showModal(){this.open=true},close(){this.open=false},querySelector(){return submit}});
    return elements.get(selector);
  }
  const submit={disabled:false};
  element('#login');element('#app');
  const form=element('#loginForm');
  form._fields={email:'owner@demo.local',password:mode==='success'?'Demo@123':'wrong-password'};
  const storage={removeItem(k){delete this[k]},clear(){for(const k of Object.keys(this))if(typeof this[k]!=='function')delete this[k]}};
  class FakeFormData{
    constructor(target){this.fields=target._fields||{}}
    *[Symbol.iterator](){yield* Object.entries(this.fields)}
    get(k){return this.fields[k]||null}
  }
  const bootstrap={user:{name:'Chủ hệ thống',role:'owner'},stores:[{id:1,name:'Cửa hàng Trung Tâm'}],categories:[],products:[],customers:[],users:[]};
  const fetch=async url=>{
    if(url==='/api/login') return mode==='success'
      ? {ok:true,json:async()=>({csrf_token:'csrf-test',user:{store_id:null}})}
      : {ok:false,json:async()=>({error:'Email hoặc mật khẩu không đúng'})};
    if(url==='/api/bootstrap?store_id=1') return {ok:true,json:async()=>bootstrap};
    if(url==='/api/shifts/current?store_id=1') return {ok:true,json:async()=>null};
    if(url==='/api/shifts?store_id=1') return {ok:true,json:async()=>[]};
    if(url==='/api/me') return {ok:false,status:401,json:async()=>({error:'Chưa đăng nhập'})};
    throw Error('Unexpected URL '+url);
  };
  const context={document:{querySelector:element,querySelectorAll:()=>[]},fetch,FormData:FakeFormData,URLSearchParams,Date,Number,Object,JSON,Error,Promise,crypto:{randomUUID:()=> 'id'},setTimeout:()=>0,confirm:()=>false,prompt:()=>null,location:{reload(){}},console};
  vm.runInNewContext(script,context,{filename:'public/index.html'});
  return {elements,form,submit,storage};
}

test('login submit reaches bootstrap and reveals the application',async()=>{
  const h=harness('success');let prevented=false;
  await h.form.onsubmit({preventDefault(){prevented=true},target:h.form});
  assert.equal(prevented,true);
  assert.equal(h.elements.get('#login').hidden,true);
  assert.equal(h.elements.get('#app').hidden,false);
  assert.equal(h.submit.disabled,false);
});

test('invalid password displays an error while the login page remains visible',async()=>{
  const noteAt=html.indexOf('<div id="note"');
  const loginAt=html.indexOf('<section id="login"');
  const appAt=html.indexOf('<div id="app" hidden>');
  assert.ok(noteAt>=0&&noteAt<loginAt&&loginAt<appAt,'status region must not be inside the hidden app');
  const h=harness('failure');
  await h.form.onsubmit({preventDefault(){},target:h.form});
  assert.equal(h.elements.get('#login').hidden,false);
  assert.equal(h.elements.get('#app').hidden,true);
  assert.match(h.elements.get('#note').textContent,/Email hoặc mật khẩu không đúng/);
  assert.equal(h.storage.token,undefined);
  assert.equal(h.submit.disabled,false);
});


test('rendering escapes database text and toast avoids innerHTML',()=>{
  assert.match(script,/H=v=>String/);
  assert.match(script,/H\(p\.name\)/);
  assert.match(script,/n\.textContent=String\(x\)/);
  assert.doesNotMatch(script,/note'\)\.innerHTML/);
  assert.match(script,/textContent\.toLowerCase\(\)\.includes/);
});

test('hidden attribute wins over component display rules in the served UI',()=>{
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(css,/\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*\}/i);
  assert.match(css,/\.login\s*\{[^}]*display\s*:\s*grid/i,'login component has a competing display rule');
  assert.match(css,/#app\s*\{[^}]*display\s*:\s*grid/i,'application component has a competing display rule');
});

test('external application script matches the strict live CSP contract',()=>{
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  assert.match(html,/<script src="\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html,/<script>[\s\S]*<\/script>/);
  assert.match(server,/script-src 'self';/);
  assert.doesNotMatch(server,/script-src[^"]*unsafe-inline/);
});

test('refund uses an accessible validated dialog instead of prompts',()=>{
  assert.match(html,/<dialog id="refundDialog" aria-labelledby="refundTitle">/);
  assert.match(html,/id="refundError"[^>]*role="alert"/);
  assert.match(script,/showModal\(\)/);
  assert.match(script,/Đang xử lý/);
  assert.doesNotMatch(script,/prompt\('ID dòng hàng cần hoàn/);
});
