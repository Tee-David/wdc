import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, next) {
    if(specifier==='@/lib/users/support-policy')return {url:new URL('../lib/users/support-policy.ts',import.meta.url).href,shortCircuit:true};
    const kind={'next/server':'response','better-auth/cookies':'cookies','@/lib/admin/capture':'capture','@/lib/maintenance':'maintenance'}[specifier];
    return kind?{url:'proxy-test:'+kind,shortCircuit:true}:next(specifier,context);
  },
  load(url,context,next){
    if(!url.startsWith('proxy-test:'))return next(url,context);
    const source={
      response:'export class NextRequest {} export class NextResponse extends Response {static next(){return new Response(null,{headers:{"x-test-through":"yes"}})} static json(body,opts){return new Response(JSON.stringify(body),opts)} static redirect(url,status=307){return Response.redirect(url,status)}}',
      cookies:'export const getSessionCookie=()=>null;',
      capture:'export const isAdminCapture=()=>false;',
      maintenance:'export const maintenance=async()=>({on:false});export const maintenancePage=async()=>"";export const PASS_COOKIE="pass";export const passValid=()=>false;export const retryAfter=()=>60;'
    }[url.slice('proxy-test:'.length)];
    return {format:'module',source,shortCircuit:true};
  }
});
const {proxy}=await import('../proxy.ts');
const request=(path,method='GET',support=true)=>({nextUrl:new URL('https://wdc.example'+path),url:'https://wdc.example'+path,method,headers:new Headers(),cookies:{has:()=>support,get:()=>undefined}});
// A support cookie with no auth cookie still needs an actionable unavailable/Exit screen.
assert.equal((await proxy(request('/portal'))).headers.get('x-test-through'),'yes');
assert.equal((await proxy(request('/portal/projects/p1'))).headers.get('x-test-through'),'yes');
assert.equal((await proxy(request('/portal','POST'))).status,403);
assert.equal((await proxy(request('/api/users/export'))).status,403);
assert.equal((await proxy(request('/api/support/exit','POST'))).headers.get('x-test-through'),'yes');
assert.equal((await proxy(request('/admin'))).headers.get('location'),'https://wdc.example/portal?notice=support-read-only');
assert.ok((await proxy(request('/portal','GET',false))).headers.get('location').startsWith('https://wdc.example/login?'));
console.log('Support proxy recovery: absent original cookie reaches Exit, restricted reads and all writes fail closed.');
