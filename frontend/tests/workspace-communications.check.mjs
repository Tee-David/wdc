/* Native checks: no browser server, provider calls, database fixtures or shared test-results. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const nodeRequire=createRequire(import.meta.url),testDirectory=path.dirname(fileURLToPath(import.meta.url));
function load(file,mocks={},globals={}) {
 const exports={};const source=fs.readFileSync(path.join(testDirectory,'..',file),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const context={exports,module:{exports},require:name=>name in mocks?mocks[name]:nodeRequire(name),console,URL,Date,Map,Set,...globals};
 vm.runInNewContext(compiled,context,{filename:file});return context.module.exports;
}
const policy=load('lib/workspace/notifications-policy.ts');
test('deadline wall times use studio timezone and reject impossible or invented dates',()=>{
 assert.equal(policy.dueDate('2026-10-14T09:00'),'2026-10-14T08:00:00.000Z');
 assert.equal(policy.deadlinePickerValue('2026-10-14T08:00:00.000Z'),'2026-10-14T09:00');
 assert.equal(policy.dueDate('2026-10-14T09:00+01:00'),'2026-10-14T08:00:00.000Z');
 for(const date of ['tomorrow','2026-02-30','2026-10-14T25:00'])assert.throws(()=>policy.dueDate(date));
 for(const href of ['https://example.test/admin/projects/p1','//example.test/admin/projects/p1','/admin\\projects\\p1','/api/auth'])assert.throws(()=>policy.workspaceHref(href));
 assert.equal(policy.workspaceHref('/portal/projects/p1#record-r1'),'/portal/projects/p1#record-r1');
});
test('personal defaults are copied and malformed stored settings do not turn off important notices',()=>{
 const first=policy.notificationPreferences({actions:'invented',progress:'off'},1);first.modes.actions='off';
 const second=policy.notificationPreferences(null,999);assert.equal(second.modes.actions,'immediate');assert.equal(second.digestDays,7);
});
test('event, notification and mail intent commit before a sender can run; failed intent rolls back',async()=>{
 let commands=[],fail=false,sends=0;
 const client={release(){},async query(sql){commands.push(sql);if(sql.includes('INSERT INTO workspace_events'))return{rows:[{id:'event'}],rowCount:1};if(sql.includes('SELECT u.id'))return{rows:[{id:'staff-1',email:'staff@example.test',role:'staff'}],rowCount:1};if(sql.includes('INSERT INTO message_log')){if(fail)throw Error('Database unavailable');return{rows:[{id:'log-1'}],rowCount:1};}return{rows:[],rowCount:1};}};
 const events=load('lib/workspace/events.ts',{'server-only':{},'@/lib/db/pool':{db:{connect:async()=>client}},'@/lib/site':{SITE_URL:'https://example.test'},'@/lib/outbox':{sendQueuedLogged(){sends++;}},'@/lib/email-templates':{},'./notifications-policy':policy,'./notifications-preferences':{effectiveWorkspacePreferences:(_email,modes,days)=>policy.notificationPreferences(modes,days)}});
 const input={id:'12345678-1234-4123-8123-123456789abc',projectId:'p1',kind:'task.assigned',category:'actions',actorId:'owner-1',actorName:'Owner',title:'Task assigned',summary:'Review the work',href:'/admin/projects/p1',visibility:'internal',recipients:[{userId:'staff-1'},{userId:'staff-1'}]};
 await events.emitWorkspaceEvent(input);assert.equal(commands[0],'BEGIN');assert.equal(commands.at(-1),'COMMIT');assert.equal(commands.filter(s=>s.includes('INSERT INTO workspace_notifications')).length,1);assert(commands.some(s=>s.includes('INSERT INTO workspace_email_intents')));assert.equal(sends,0);
 commands=[];fail=true;await assert.rejects(()=>events.emitWorkspaceEvent(input));assert.equal(commands.at(-1),'ROLLBACK');assert.equal(sends,0);
});
test('shared browser tour progress and first-use flags remain scoped to the signed-in account',async()=>{
 const saved=new Map(),writes=[];let account='a';
 const localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const fetch=async(_url,options)=>{if(options?.method==='POST'){writes.push({account,body:JSON.parse(options.body)});return{status:200};}return{status:200,json:async()=>({userId:account,records:{}})};};
 const storage=load('lib/tours/storage.ts',{}, {localStorage,fetch});
 saved.set('wdc-admin-tour:admin-walkthrough@7',JSON.stringify({status:'completed',at:new Date().toISOString()}));
 await storage.syncFromAccount([{id:'admin-walkthrough',version:7}]);assert.equal(storage.readCompletion('admin-walkthrough',7),null);assert.equal(writes.length,0);
 storage.writeCompletion('admin-walkthrough',7,'completed');const aFlag=storage.tourPersonKey('welcome-offered');
 account='b';await storage.syncFromAccount([{id:'admin-walkthrough',version:7}]);assert.equal(storage.readCompletion('admin-walkthrough',7),null);assert.notEqual(storage.tourPersonKey('welcome-offered'),aFlag);assert.equal(writes.filter(w=>w.account==='b').length,0);
 account='a';await storage.syncFromAccount([{id:'admin-walkthrough',version:7}]);assert.equal(storage.readCompletion('admin-walkthrough',7).status,'completed');
});

test('secondary membership never grants sibling project or company-wide finance access',()=>{
 const {portalScope}=load('lib/portal/scope.ts');
 const projects=[{id:'p1',clientId:'c1'},{id:'p2',clientId:'c1'},{id:'p3',clientId:'c2'}];
 const members=[{project_id:'p1',can_billing:false,can_review:true},{project_id:'p3',can_billing:true,can_review:false},{project_id:'missing',can_billing:true,can_review:true}];
 const scoped=portalScope(projects,null,members);
 assert.equal(scoped.isPrimaryContact,false);assert.deepEqual(Array.from(scoped.allowedProjectIds),['p1','p3']);assert.deepEqual(Array.from(scoped.billingProjectIds),['p3']);assert.deepEqual(Array.from(scoped.reviewProjectIds),['p1']);
 const primary=portalScope(projects,'c1',members);assert.deepEqual(Array.from(primary.reviewProjectIds),['p1','p2']);assert.deepEqual(Array.from(primary.billingProjectIds),['p1','p2','p3']);
});

test('email-only primary contacts get a durable mail intent and never a phantom inbox account',async()=>{
 const commands=[];let contact=true;
 const client={release(){},async query(sql){commands.push(sql);if(sql.includes('INSERT INTO workspace_events'))return {rowCount:1,rows:[{id:'event'}]};if(sql.includes('SELECT u.id'))return {rowCount:0,rows:[]};if(sql.includes("SELECT trim(c.data->>'email')")){assert(sql.includes('NOT EXISTS(SELECT 1 FROM "user"'));return {rowCount:contact?1:0,rows:contact?[{email:'primary@example.test',updates:null,reminders:null}]:[]};}if(sql.includes('INSERT INTO message_log'))return {rowCount:1,rows:[{id:'log'}]};return {rowCount:1,rows:[]};}};
 const events=load('lib/workspace/events.ts',{'server-only':{},'@/lib/db/pool':{db:{connect:async()=>client}},'@/lib/site':{SITE_URL:'https://example.test'},'@/lib/outbox':{},'@/lib/email-templates':{},'./notifications-policy':policy,'./notifications-preferences':{effectiveWorkspacePreferences:()=>policy.notificationPreferences(null,7)}});
 const input={id:'12345678-1234-4123-8123-123456789abc',projectId:'p1',clientId:'c1',kind:'project.stage_changed',category:'progress',actorId:'owner',actorName:'Owner',title:'Project changed',summary:'The shared stage changed',href:'/admin/projects/p1',visibility:'client',recipients:[{userId:'client:c1'}]};
 await events.emitWorkspaceEvent(input);assert(commands.some(sql=>sql.includes('INSERT INTO workspace_email_intents')));assert(!commands.some(sql=>sql.includes('INSERT INTO workspace_notifications')));
 contact=false;commands.length=0;await events.emitWorkspaceEvent({...input,id:'22345678-1234-4123-8123-123456789abc'});assert(!commands.some(sql=>sql.includes('INSERT INTO workspace_email_intents')));
});
test('department notices commit without granting project membership or exposing project details',async()=>{
 let adopted=false;const emitted=[],queries=[];
 const client={id:'c1',name:'Client',company:'Company',email:'primary@example.test',departments:[]};
 const tx={async query(sql){queries.push(sql);if(sql.includes('SELECT data')){assert(sql.includes("collection='CLIENTS'"));return {rows:[{data:client}],rowCount:1};}if(sql.includes('SELECT id,name'))return {rows:[{id:'d1',name:'Branding'}],rowCount:1};if(sql.includes('SELECT DISTINCT u.id'))return {rows:[{id:'staff1'}],rowCount:1};if(sql.includes('SELECT id,role'))return {rows:[],rowCount:0};if(sql.includes('SELECT id FROM "user"'))return {rows:[],rowCount:0};return {rows:[],rowCount:1};}};
 const departmentModule=load('lib/workspace/department-events.ts',{'server-only':{},'@/lib/db/transaction':{transaction:async work=>work(tx)},'@/lib/admin/persist':{adoptPersistedRecord(collection){assert.equal(collection,'CLIENTS');adopted=true;}},'./access':{requireWorkspaceUser:async()=>({userId:'owner',name:'Owner',kind:'staff'})},'./events':{emitWorkspaceEvent:async(event,connection)=>{assert.equal(connection,tx);assert.equal(adopted,false);emitted.push(event);}}});
 const result=await departmentModule.commitClientDepartments({clientId:'c1',departmentIds:['d1']});assert(adopted);assert.equal(result.eventIds.length,2);assert.equal(emitted[1].projectId,'client:c1');assert.equal(emitted[1].recipients[0].userId,'staff1');assert(!queries.some(sql=>sql.includes('workspace_project_members')));assert.equal(emitted[0].recipients[0].userId,'client:c1');
});

test('financial service reminders retain billing routing and the exact recorded deadline',async()=>{
 const deadline=new Date(Date.now()-60_000),writes=[];let queried=false;
 const tx={release(){},async query(sql,args=[]){writes.push({sql,args});if(sql.includes('INSERT INTO workspace_events'))return {rowCount:1,rows:[{id:args[0]}]};if(sql.includes('SELECT u.id'))return {rowCount:1,rows:[{id:'billing1',email:'billing@example.test',role:'client'}]};if(sql.includes('INSERT INTO message_log'))return {rowCount:1,rows:[{id:'message1'}]};return {rowCount:1,rows:[]};}};
 const database={connect:async()=>tx,async query(sql){if(sql.includes('SELECT * FROM workspace_events')){queried=true;assert(sql.includes("category='billing' AND stale_key LIKE 'service:%'"));return {rowCount:1,rows:[{id:'source1',project_id:'p1',client_id:'c1',title:'Renewal terms',summary:'Review renewal',href:'/admin/projects/p1',visibility:'client',due_at:deadline,stale_key:'service:renewal1',category:'billing',recipient_purpose:'billing'}]};}return {rowCount:1,rows:[{user_id:'billing1',href:'/portal/projects/p1'}]};}};
 const events=load('lib/workspace/events.ts',{'server-only':{},'@/lib/db/pool':{db:database},'@/lib/site':{SITE_URL:'https://example.test'},'@/lib/outbox':{},'@/lib/email-templates':{},'./notifications-policy':policy,'./notifications-preferences':{effectiveWorkspacePreferences:()=>policy.notificationPreferences(null,7)},'./access':{projectRecipients:async(_id,_audience,purpose)=>{assert.equal(purpose,'billing');return [{userId:'billing1'}];}}});
 await events.queueWorkspaceReminders();assert(queried);const event=writes.find(write=>write.sql.includes('INSERT INTO workspace_events'));assert.equal(event.args[4],'reminders');assert.equal(event.args[11],deadline.toISOString());assert.equal(event.args[13],'billing');
});

test('a revoked project member is excluded before notification and intent are persisted',async()=>{
 const writes=[];
 const tx={release(){},async query(sql){writes.push(sql);if(sql.includes('INSERT INTO workspace_events'))return {rowCount:1,rows:[{id:'event'}]};if(sql.includes('SELECT u.id'))return {rowCount:1,rows:[{id:'departed',email:'staff@example.test',role:'staff'}]};if(sql.includes('LEFT JOIN workspace_project_members'))return {rowCount:0,rows:[]};return {rowCount:1,rows:[]};}};
 const events=load('lib/workspace/events.ts',{'server-only':{},'@/lib/db/pool':{db:{connect:async()=>tx}},'@/lib/site':{SITE_URL:'https://example.test'},'@/lib/outbox':{},'@/lib/email-templates':{},'./notifications-policy':policy,'./notifications-preferences':{effectiveWorkspacePreferences:()=>policy.notificationPreferences(null,7)}});
 await events.emitWorkspaceEvent({id:'12345678-1234-4123-8123-123456789abc',projectId:'p1',kind:'project.details_changed',category:'progress',actorId:'owner',actorName:'Owner',title:'Private update',summary:'Internal project details',href:'/admin/projects/p1',visibility:'internal',recipients:[{userId:'departed'}]});
 assert(!writes.some(sql=>sql.includes('INSERT INTO workspace_notifications')));assert(!writes.some(sql=>sql.includes('INSERT INTO workspace_email_intents')));assert.equal(writes.at(-1),'COMMIT');
});

test('legacy billing adds scoped contacts without repeating primary mail; support excludes secondary contacts',async()=>{
 const emitted=[],audiences=[];const people=[{userId:'owner',role:'owner',email:'owner@example.test'},{userId:'primary',role:'client',email:'primary@example.test'},{userId:'secondary',role:'client',email:'billing@example.test'},{userId:'staff',role:'staff',email:'staff@example.test'}];
 const notices=load('lib/workspace/legacy-notifications.ts',{'server-only':{},'@/lib/admin/store':{getClient:()=>({id:'c1',email:'primary@example.test'}),getInvoice:()=>({projectId:'p1',clientId:'c1'}),getEstimate:()=>null,getPayments:()=>[]},'./access':{projectRecipients:async(_id,audience)=>{audiences.push(audience);return people.filter(p=>audience==='internal'?p.role!=='client':audience==='client'?p.role==='client':true);}},'./events':{emitWorkspaceEvent:async event=>emitted.push(event)}});
 await notices.stageLegacyMoneyNotification({key:'invoice:i1',clientId:'c1',about:{kind:'invoice',id:'i1'},title:'Invoice',summary:'Invoice issued',by:'Owner',existingAddress:'primary@example.test'});
 assert.equal(emitted[0].recipients.find(p=>p.userId==='primary').suppressEmailReason,'The existing transactional email handles this recipient.');assert.equal(emitted[0].recipients.find(p=>p.userId==='secondary').suppressEmailReason,undefined);assert(!emitted[0].recipients.some(p=>p.userId==='staff'));
 await notices.stageLegacyMoneyNotification({key:'paid-notice:pay1',clientId:'c1',about:{kind:'invoice',id:'i1'},title:'Payment recorded',summary:'A studio notice',by:'Owner',existingAddress:'owner@example.test'});assert.equal(emitted[1].visibility,'internal');assert.deepEqual(Array.from(emitted[1].recipients,p=>p.userId),['owner']);
 await notices.stageLegacySupportNotification({ticket:{id:'t1',projectId:'p1',clientId:'c1'},key:'support-reply:m1',title:'Reply',summary:'Question answered',by:'Owner',audience:'client',existingAddress:'primary@example.test'});assert.deepEqual(Array.from(emitted[2].recipients,p=>p.userId),['primary']);assert.equal(emitted[2].recipients[0].href,'/portal/support/t1');
});

test('invitation reminders never reconstruct an account link and expire into owner escalation',async()=>{
 const sent=[],deadline=new Date('2026-10-11T09:00:00Z');const candidates=[{id:'invite-open',email:'primary@example.test',name:'Client',role:'client',client_id:'c1',expires_at:deadline,expired:false},{id:'invite-expired',email:'staff@example.test',name:'Staff',role:'staff',client_id:null,expires_at:deadline,expired:true}];
 const reminder=load('lib/workspace/invitation-reminders.ts',{'server-only':{},'@/lib/db/pool':{db:{query:async sql=>({rows:sql.includes('FROM invitations')?candidates:[{id:'owner'}],rowCount:2})}},'./access':{clientRecipients:async()=>[{userId:'client:c1',email:'primary@example.test'},{userId:'other',email:'other@example.test'}]},'./events':{emitWorkspaceEvent:async value=>sent.push(value)}});
 await reminder.queueInvitationReminders();assert.equal(sent.length,3);assert.equal(sent.filter(value=>value.kind==='invitation.expiring_client').length,1);assert.deepEqual(Array.from(sent.find(value=>value.kind==='invitation.expiring_client').recipients).map(value=>value.userId),['client:c1']);assert.equal(sent.find(value=>value.kind==='invitation.expired').visibility,'internal');assert(sent.every(value=>!value.href.includes('/invite/')&&!value.summary.includes('token')));const keys=sent.map(value=>value.id);await reminder.queueInvitationReminders();assert.deepEqual(sent.slice(3).map(value=>value.id),keys);
});
test('team writes reject revoked management and closed projects inside the write transaction',async()=>{
 let archived=false,active=true,member=false;const actor={id:'staff',role:'staff',kind:'staff',readOnly:false,project:{id:'p1'},clientId:'c1'};const tx={query:async sql=>({rows:sql.includes('FROM "user"')?(active?[{role:'staff'}]:[]):sql.includes("collection='PROJECTS'")?[{data:{id:'p1',clientId:'c1',archived,ownerIds:[]}}]:sql.includes("collection='CLIENTS'")?[{data:{id:'c1'}}]:member?[{can_manage:true}]:[],rowCount:1})};const guard=load('lib/workspace/team-guard.ts',{'server-only':{}});
 await assert.rejects(()=>guard.assertTeamActor(tx,actor,true),/access changed/);member=true;await guard.assertTeamActor(tx,actor,true);archived=true;await assert.rejects(()=>guard.assertTeamActor(tx,actor,true),/no longer open/);archived=false;active=false;await assert.rejects(()=>guard.assertTeamActor(tx,actor,true),/access changed/);
});