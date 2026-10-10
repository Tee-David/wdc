/* eslint-disable @typescript-eslint/no-require-imports -- Native tour inventory has no browser, provider or database dependencies. */
const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),path=require('path');
process.chdir(path.join(__dirname,'..'));
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});return exports;}
const admin=load('lib/tours/admin.ts'),client=load('lib/tours/client.ts');
for(const [role,definition] of [['owner',admin.ADMIN_WALKTHROUGH],['staff',admin.ADMIN_WALKTHROUGH],['client',client.CLIENT_WALKTHROUGH]]){
 const steps=definition.steps.filter(step=>!step.roles||step.roles.includes(role));assert.ok(steps.length>0);assert.equal(new Set(steps.map(step=>step.id)).size,steps.length);
 if(role==='staff')assert.ok(!steps.some(step=>step.href?.startsWith('/admin/money')),'Staff tour must not open owner finance');
 if(role==='client')assert.ok(!steps.some(step=>step.href?.startsWith('/admin')),'Client tour must stay in portal');
 console.log(role+': '+steps.length+' role-filtered walkthrough steps, version '+definition.version);
}
assert.ok(admin.ADMIN_PAGE_TOURS['/admin/money'].steps.some(step=>step.target.includes('money-currencies')));
assert.ok(client.CLIENT_PAGE_TOURS['/portal/billing'].steps.some(step=>step.target.includes('money-currencies')));
console.log('Tour role and finance guidance checks passed.');
