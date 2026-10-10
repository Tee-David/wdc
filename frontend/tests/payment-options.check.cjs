/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the real account-selection boundary without database writes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache={};
const old={id:'usd',label:'USD account',currency:'USD',bankName:'Bank',accountName:'Studio',accountNumber:'123'},current={...old,routingNumber:'021000021',swift:'QAUS33'};
const settings={'finance.currencies':'["NGN","USD"]','finance.accounts':JSON.stringify([current])};
function load(relative){if(cache[relative])return cache[relative];const file=path.join(root,relative),m=new Module(file);m.paths=Module._nodeModulePaths(path.dirname(file));const native=m.require.bind(module);m.require=name=>name==='server-only'?{}:name==='@/lib/admin/store'?{getSetting:key=>settings[key]}:name==='@/lib/settings/store'?{hydrateSettings:async()=>{}}:name==='./currency'?load('lib/money/currency.ts'):native(name);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return cache[relative]=m.exports;}
(async()=>{const {documentPaymentChoice}=load('lib/money/payment-options.ts');
 assert.deepEqual((await documentPaymentChoice('USD','usd')).paymentAccount,{...current,instructions:'',iban:'',bankAddress:'',accountType:''});
 assert.deepEqual((await documentPaymentChoice('USD','usd',old,'USD')).paymentAccount,old);
 await assert.rejects(documentPaymentChoice('NGN','usd'));
 settings['finance.accounts']='[]';assert.deepEqual((await documentPaymentChoice('USD','usd',old,'USD')).paymentAccount,old);await assert.rejects(documentPaymentChoice('USD','usd'));
 settings['finance.currencies']='["NGN"]';assert.equal((await documentPaymentChoice('USD','usd',old,'USD')).currency,'USD');await assert.rejects(documentPaymentChoice('USD',''));
 console.log('Draft/current account selection, issued snapshots, removed accounts and currency boundaries passed; no database writes.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
