const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../components/onboarding/draft-lifecycle.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:exportsObject});
const {DraftLifecycle} = exportsObject;
const deferred = () => { let resolve; const promise = new Promise(r => {resolve=r;}); return {promise,resolve}; };

test('reset waits for an in-flight response and fences queued saves', async () => {
  const lifecycle = new DraftLifecycle();
  const response = deferred();
  const events = [];
  let oldVersion;
  const first = lifecycle.run(async version => {oldVersion=version;events.push('save');await response.promise;events.push('response');});
  await Promise.resolve();
  const stale = lifecycle.run(async () => events.push('stale')).catch(error => error.message);
  const reset = lifecycle.beginReset().then(() => events.push('delete'));
  await assert.rejects(lifecycle.run(async () => {}), /restarting/);
  assert.equal(lifecycle.current(oldVersion),false);
  assert.deepEqual(events,['save']);
  response.resolve();
  await first; await reset;
  assert.match(await stale,/cancelled/);
  assert.deepEqual(events,['save','response','delete']);
  lifecycle.endReset();
  await lifecycle.run(async () => events.push('new'));
  assert.equal(events.at(-1),'new');
});

test('saves stay ordered and a failed request does not poison retries', async () => {
  const lifecycle = new DraftLifecycle();
  const response=deferred(); const events=[];
  const first=lifecycle.run(async () => {events.push(1);await response.promise;});
  const second=lifecycle.run(async () => events.push(2));
  await Promise.resolve(); assert.deepEqual(events,[1]);
  response.resolve(); await Promise.all([first,second]); assert.deepEqual(events,[1,2]);
  await assert.rejects(lifecycle.run(async () => {throw new Error('offline');}),/offline/);
  assert.equal(await lifecycle.run(async () => 'saved'),'saved');
});

test('server reset fails closed and clears the cookie only after revocation', async () => {
  const events=[]; let allowed=false; let unavailable=false;
  const mocks={
    'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status ?? 200})}},
    '@/lib/onboarding-server':{requestOriginIsAllowed:()=>allowed,cookieToken:()=> 'token',tokenHash:()=> 'hash',clearOnboardingCookie:()=>events.push('cookie')},
    '@/lib/db/transaction':{transaction:async work=> {if(unavailable)throw new Error('database offline');await work({query:async sql=> {events.push(sql);return {rows:[{id:'brief'}]};}});}},
  };
  const routeExports={};
  const route=fs.readFileSync(require('node:path').join(__dirname,'../app/api/onboarding/draft/route.ts'),'utf8');
  vm.runInNewContext(ts.transpileModule(route,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:routeExports,require:name=>mocks[name] ?? {}});
  assert.equal((await routeExports.DELETE({})).status,403); assert.deepEqual(events,[]);
  allowed=true; unavailable=true;
  assert.equal((await routeExports.DELETE({})).status,503); assert.deepEqual(events,[]);
  unavailable=false; assert.equal((await routeExports.DELETE({})).status,200);
  assert.match(events[0],/revoked_at IS NULL.*expires_at>now\(\).*FOR UPDATE/);
  assert.match(events[1],/status='archived'.*status='in_progress'/);
  assert.match(events[2],/UPDATE onboarding_resume_tokens/);
  assert.doesNotMatch(events[2],/used_at IS NULL/);
  assert.equal(events.at(-1),'cookie');
});

test('resume email intent requires durable storage and cannot fall back to memory', async () => {
  let memoryCalls=0;
  const mocks={
    'server-only':{},
    '@/lib/db/pool':{db:{query:async()=>{throw new Error('offline');}}},
    '@/lib/admin/store':{queueMessage:()=>{memoryCalls++;return {ok:true};}},
    '@/lib/admin/persist':{syncStore:async()=>{}},
  };
  const output={};
  const source=fs.readFileSync(require('node:path').join(__dirname,'../lib/message-log.ts'),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:output,require:name=>mocks[name] ?? {},process:{env:{DATABASE_URL:'mock'}},console:{error:()=>{}}});
  const input={channel:'Email',to:'client@example.com',subject:'Resume',dedupeKey:'test'};
  await assert.rejects(output.queueLogged(input,true),/could not be persisted/);
  assert.equal(memoryCalls,0);
  assert.equal((await output.queueLogged(input)).ok,true);
  assert.equal(memoryCalls,1);
});
