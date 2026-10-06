const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const sharp=require('sharp');
function load(file,mocks={}) {
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),Buffer,File,URL});
  return exports;
}
const policy=load('lib/client-profile-policy.ts');
test('appearance and avatar references cannot cross account boundaries',()=>{
  assert.equal(policy.appearanceValue('system'),'system');
  assert.equal(policy.appearanceValue('orange'),null);
  const key='profiles/client-one/12345678-1234-1234-1234-123456789012.webp';
  assert.equal(policy.avatarOwnedBy(key,'client-one'),true);
  assert.equal(policy.avatarOwnedBy(key,'client-two'),false);
  assert.equal(policy.avatarOwnedBy('profiles/client-one/../other.webp','client-one'),false);
});
test('photos are decoded, reduced and metadata stripped; fake MIME and oversized files fail',async()=>{
  const {normalizeAvatar}=load('lib/client-avatar.ts',{'./client-profile-policy':policy});
  const png=await sharp({create:{width:600,height:400,channels:3,background:'#123456'}}).withMetadata().png().toBuffer();
  const photo=await normalizeAvatar(new File([png],'photo.png',{type:'image/png'}));
  const metadata=await sharp(photo).metadata();
  assert.equal(metadata.format,'webp');assert.equal(metadata.width,256);assert.equal(metadata.height,256);assert.equal(metadata.exif,undefined);
  await assert.rejects(normalizeAvatar(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'],'fake.png',{type:'image/png'})));
  await assert.rejects(normalizeAvatar(new File([new Uint8Array(policy.AVATAR_BYTES+1)],'big.png',{type:'image/png'})),/2MB/);
  await assert.rejects(normalizeAvatar(new File([png],'photo.svg',{type:'image/svg+xml'})),/JPEG/);
  const bomb=await sharp({create:{width:4097,height:4097,channels:3,background:'#123456'}}).png().toBuffer();
  await assert.rejects(normalizeAvatar(new File([bomb],'huge.png',{type:'image/png'})));
  const frame='21f90400000000002c0000000001000100000202440100';
  const gif=Buffer.from('47494638396101000100800000000000ffffff'+frame+frame+'3b','hex');
  await assert.rejects(normalizeAvatar(new File([gif],'animated.webp',{type:'image/webp'})));
});
test('profile mutation authority denies support, absent origin, wrong roles and missing live account access',async()=>{
  let support=true,origin='https://wdc.example',role='client',active=true;
  const guard=load('lib/client-profile.ts',{
    'server-only':{},'next/headers':{headers:async()=>new Headers({...(origin?{origin}:{}),host:'wdc.example'})},
    '@/lib/auth':{auth:{api:{getSession:async()=>({user:{id:'u',role},session:{id:'s'}})}}},
    '@/lib/users/support':{supportCookiePresent:async()=>support},'@/lib/admin/capture':{isAdminCapture:()=>false},
    '@/lib/rate-limit':{rateLimit:()=>({ok:true})},
    '@/lib/db/pool':{db:{query:async()=>({rowCount:active?1:0,rows:[{name:'Client'}]})}},
  });
  await assert.rejects(guard.requireProfileClient(true),/read-only/);
  support=false;origin='';await assert.rejects(guard.requireProfileClient(true),/Reload/);
  origin='https://wdc.example';role='owner';await assert.rejects(guard.requireProfileClient(true),/client account/);
  role='client';active=false;await assert.rejects(guard.requireProfileClient(true),/unavailable/);
  active=true;assert.equal((await guard.requireProfileClient(true)).name,'Client');
});
test('photo cleanup preserves referenced files and retains failed deletions for retry',async()=>{
  const owned='profiles/u/12345678-1234-1234-1234-123456789012.webp';
  let succeeds=false;let referenced=true;const calls=[];
  const cleanup=load('lib/client-avatar-cleanup.ts',{
    'server-only':{},
    '@/lib/db/transaction':{transaction:async work=>work({query:async()=>({rows:[]})})},
    '@/lib/db/pool':{db:{query:async(sql,args)=>{calls.push({sql,args});if(sql.startsWith('SELECT object_key'))return {rows:[{object_key:owned,owner_id:'u'}]};return {rowCount:referenced?1:0};}}},
    './r2':{r2Config:()=>({ok:true,config:{}}),deleteObject:async()=>succeeds},'./client-profile-policy':policy,
  });
  assert.equal(await cleanup.cleanupClientAvatars(),0);
  assert.equal(calls.some(c=>c.sql.startsWith('DELETE')),false);
  referenced=false;calls.length=0;assert.equal(await cleanup.cleanupClientAvatars(),0);
  assert.equal(calls.some(c=>c.sql.startsWith('DELETE')),false);
  succeeds=true;calls.length=0;assert.equal(await cleanup.cleanupClientAvatars(),1);
  assert.equal(calls.find(c=>c.sql.startsWith('DELETE')).args[0],owned);
});
test('Skip preserves name/photo/theme and dismisses pending setup once',async()=>{
  const calls=[];let state='pending';
  const current={setup_state:state,appearance:'dark',avatar_key:'profiles/u/12345678-1234-1234-1234-123456789012.webp',pending_avatar_key:null};
  const actions=load('lib/client-profile-actions.ts',{
    'next/cache':{revalidatePath:()=>{}},'next/server':{after:()=>{}},
    '@/lib/db/transaction':{transaction:async work=>work({query:async(sql,args)=>{calls.push({sql,args});if(sql.startsWith('SELECT *'))return {rows:[{...current,setup_state:state}]};return {rowCount:1,rows:[]};}})},
    '@/lib/admin/validate':{FAIL:(errors,message)=>({ok:false,errors,message}),OK:message=>({ok:true,message})},
    './client-profile':{requireProfileClient:async()=>({session:{user:{id:'u'},session:{id:'s'}}})},
    './client-profile-policy':policy,'./client-avatar-cleanup':{cleanupClientAvatars:async()=>0},
  });
  const fd=new FormData();fd.set('mode','skip');
  assert.equal((await actions.saveClientProfile({},fd)).ok,true);
  const update=calls.find(c=>c.sql.startsWith('UPDATE client_profile_preferences'));
  assert.equal(update.args[1],'skipped');assert.equal(update.args[2],true);assert.equal(update.args[4],current.avatar_key);
  assert.equal(calls.some(c=>c.sql.startsWith('UPDATE "user"')),false);
  calls.length=0;state='skipped';
  assert.equal((await actions.saveClientProfile({},fd)).ok,true);
  assert.equal(calls.some(c=>c.sql.startsWith('UPDATE')),false);
  state='pending';calls.length=0;fd.set('mode','continue');fd.set('name','Client');fd.set('appearance','system');fd.set('photo','replace');fd.set('pendingPhoto','profiles/other/12345678-1234-1234-1234-123456789012.webp');
  assert.equal((await actions.saveClientProfile({},fd)).ok,false);
  assert.equal(calls.some(c=>c.sql.startsWith('UPDATE')),false);
});
