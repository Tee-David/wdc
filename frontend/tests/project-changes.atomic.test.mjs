// Native, provider-free transaction check. Run from frontend: node tests/project-changes.atomic.test.mjs
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const load=(path,resolve)=>{
 const loaded={exports:{}};
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(resolve,loaded,loaded.exports);
 return loaded.exports;
};
const types=load('lib/admin/types.ts',require),clone=value=>JSON.parse(JSON.stringify(value));
let project={id:'p',clientId:'c',title:'Project',stage:'Discovery',events:[],ownerIds:['u'],health:'On track',due:null};
const task={id:'task',projectId:'p',title:'Blocked task',done:false,blockedBy:'dep'};
let events=[],adoptions=0,fail=false;
const actor=()=>({id:'u',userId:'u',name:'Actual actor',role:'owner',kind:'staff',clientId:'c',project:clone(project)});
const query=async(sql,args)=>{
 if(sql.startsWith('SELECT 1 FROM "user"'))return {rows:[{}],rowCount:1};
 if(sql.startsWith("SELECT data FROM admin_records WHERE collection='TASKS'"))return {rows:[{data:clone(task)}]};
 if(sql.startsWith('SELECT data FROM admin_records'))return {rows:[{data:clone(args[0]==='PROJECTS'?project:args[0]==='TASKS'?args[1]==='dep'?{id:'dep',projectId:'p',done:false}:task:{id:'c'})}]};
 if(sql.startsWith('INSERT INTO admin_records')){if(args[0]==='PROJECTS')project=JSON.parse(args[2]);return {rows:[],rowCount:1};}
 if(sql.startsWith('INSERT INTO audit_log'))return {rows:[]};
 throw Error('Unrecognised SQL: '+sql);
};
const modules={
 'server-only':{},'node:crypto':require('node:crypto'),'@/lib/db/pool':{db:{query}},
 '@/lib/db/transaction':{transaction:async work=>{const before=clone(project),count=events.length;try{return await work({query});}catch(error){project=before;events.length=count;throw error;}}},
 '@/lib/admin/persist':{adoptPersistedRecord:()=>adoptions++},'@/lib/admin/types':types,
 './access':{requireProjectActor:async()=>actor(),projectRecipients:async()=>[]},
 './events':{emitWorkspaceEvent:async event=>{if(fail)throw Error('intent failed');events.push(event);}},
};
const api=load('lib/workspace/project-changes.ts',name=>modules[name]);
await assert.rejects(api.changeProjectRecord('p',{kind:'stage',stage:'Review',expectedStage:'Onboarding'}),/stage changed/);
assert.equal(adoptions,0);
await api.changeProjectRecord('p',{kind:'stage',stage:'Review',expectedStage:'Discovery',note:'PRIVATE NOTE'});
assert.equal(project.stage,'Review');
assert.equal(project.events[1].visibility,'internal');
assert(!events[0].summary.includes('PRIVATE'));
const count=adoptions;
fail=true;
await assert.rejects(api.changeProjectRecord('p',{kind:'due',due:'2026-10-14'}),/intent failed/);
assert.equal(project.due,null);
assert.equal(adoptions,count);
fail=false;
await assert.rejects(api.changeLegacyTask({kind:'toggle',id:'task',expectedDone:false}),/prerequisite/);
assert.equal(adoptions,count);
await api.changeProjectRecord('p',{kind:'update',update:{health:'At risk',progress:'Actual progress',blockers:'Private blockers',next:'Next step',clientVisible:false}});
assert.equal(events.at(-1).actorName,'Actual actor');
assert.equal(events.at(-1).visibility,'internal');
console.log('PASS: stale stage, private note, atomic intent rollback, no failed cache adoption, prerequisite gate, real actor and internal update.');

// Service authorization must be rechecked inside the mutation transaction, after the earlier action guard.
let active=true,archived=false,canReview=false,writes=0;
const serviceQuery=async(sql)=>{
 if(sql.startsWith('SELECT * FROM workspace_service_items'))return {rows:[{id:'item',project_id:'p',version:'1',revision:'1',visibility:'shared',kind:'post',service:'social',title:'Post',data:{},state:'client_review'}]};
 if(sql.startsWith('SELECT role,email'))return {rows:active?[{role:'client',email:'secondary@example.test'}]:[]};
 if(sql.includes("collection='PROJECTS'"))return {rows:[{data:{id:'p',clientId:'c',ownerIds:[],archived}}]};
 if(sql.includes("collection='CLIENTS'"))return {rows:[{data:{id:'c',email:'primary@example.test'}}]};
 if(sql.startsWith('SELECT can_manage'))return {rows:[{can_manage:false,can_review:canReview,can_billing:false}]};
 writes++;
 throw Error('Unexpected mutation in a denied service action');
};
const serviceModules={
 'server-only':{},'node:crypto':require('node:crypto'),'@/lib/db/pool':{},
 '@/lib/db/transaction':{transaction:work=>work({query:serviceQuery})},
 './service-model':load('lib/workspace/service-model.ts',require),
 './service-sharing-policy':load('lib/workspace/service-sharing-policy.ts',require),
};
const service=load('lib/workspace/service-store.ts',name=>serviceModules[name]);
const input={projectId:'p',id:'item',revision:1,version:1,action:'decide',state:'approved'},reviewer={id:'u',name:'Reviewer',kind:'client',clientId:'c'};
await assert.rejects(service.actOnServiceRecord(input,reviewer,()=>{writes++;}),/permissions changed/);
active=false;
await assert.rejects(service.actOnServiceRecord(input,reviewer,()=>{writes++;}),/account access changed/);
active=true;archived=true;
await assert.rejects(service.actOnServiceRecord(input,reviewer,()=>{writes++;}),/no longer open/);
archived=false;canReview=true;
await assert.rejects(service.actOnServiceRecord({...input,version:2},reviewer,()=>{writes++;}),/newer version/);
assert.equal(writes,0);
console.log('PASS: transaction-time service review revocation, account deactivation, archived project and exact version all fail before mutation or event.');
