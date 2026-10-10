/* eslint-disable @typescript-eslint/no-require-imports -- Native isolated arithmetic regression. */
process.chdir(require('path').join(__dirname,'..'));const fs=require('fs'),path=require('path'),ts=require('typescript'),Module=require('module');const cache={};function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const m=new Module(file);cache[file]=m;m.paths=Module._nodeModulePaths(path.dirname(file));const real=m.require.bind(m);m.require=name=>name==='server-only'?{}:name.startsWith('@/')?load(''+name.replace('@/','')+'.ts'):name.startsWith('./')?load(path.resolve(path.dirname(file),name)+'.ts'):real(name);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return m.exports;}
const assert=require('node:assert/strict'),rules=load('lib/admin/money-rules.ts');
const invoice=(id,currency,unit)=>({id,number:id,status:'Sent',currency,paid:0,lines:[{description:'QA service',qty:1,unit}],vatRate:0});
const invoices=[invoice('qa-ngn','NGN',70000),invoice('qa-usd','USD',10000)];
const payments=[{id:'p1',invoiceId:'qa-ngn',amount:70000,method:'Bank transfer'},{id:'p2',invoiceId:'qa-usd',amount:5000,method:'Bank transfer'}];
const result=rules.reconcileClient(invoices,payments,[{amount:2500,currency:'USD'}]);
assert.equal(result.invoiced,70000);assert.equal(result.held,0);assert.ok(result.balanced);
const usd=result.groups.find(row=>row.currency==='USD');assert.equal(usd.invoiced,10000);assert.equal(usd.received,5000);assert.equal(usd.outstanding,5000);assert.equal(usd.held,2500);assert.ok(usd.balanced);
const receipt=load('lib/money/receipt-model.ts').receiptState({payment:{amount:5000},invoice:{...invoices[1],paid:5000}});assert.equal(payments[1].amount,5000);assert.equal(invoices[1].lines[0].unit,10000);assert.notEqual(payments[1].amount,invoices[1].lines[0].unit);assert.equal(receipt.stamp,'part');assert.equal(receipt.totals.due,5000);
(async()=>{
 cache[path.resolve('lib/admin/session.ts')]={exports:{getAdminRequest:async()=>({session:{user:{role:'owner'}}})}};
 cache[path.resolve('lib/admin/persist.ts')]={exports:{syncStore:async()=>{}}};
 cache[path.resolve('lib/admin/store.ts')]={exports:{getPaymentsFor:()=>[],getPaymentByToken:()=>null,getInvoice:()=>null}};
 cache[path.resolve('lib/settings/store.ts')]={exports:{hydrateSettings:async()=>{}}};
 const invoiceRoute=load('app/admin/money/[id]/receipt/route.ts');
 const noPayment=await invoiceRoute.GET(new Request('http://localhost/admin/money/qa/receipt'),{params:Promise.resolve({id:'qa'})});assert.equal(noPayment.status,404);
 const receiptRoute=load('app/r/[token]/pdf/route.ts');
 const noReceipt=await receiptRoute.GET({headers:new Headers()},{params:Promise.resolve({token:'qa-no-payment'})});assert.equal(noReceipt.status,404);
 console.log('Separated currencies, partial-payment receipt and no-receipt-before-payment checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
