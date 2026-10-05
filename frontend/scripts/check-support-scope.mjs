import assert from "node:assert/strict";
import { registerHooks } from "node:module";
const state = { token: "A".repeat(43), queries: [], writes: [], rows: [], client: { id: "c1", email: "client@example.com" }, missing: false, cookieWrites: [] };
globalThis.__supportTest = state;
registerHooks({
  resolve(specifier, context, next) {
    const mock = { "server-only": "empty", "next/headers": "headers", "@/lib/db/pool": "db", "@/lib/db/transaction": "transaction", "@/lib/admin/store": "store", "next/server": "response", "@/lib/auth": "auth" }[specifier];
    if (specifier === "@/lib/users/support") return { url: new URL("../lib/users/support.ts", import.meta.url).href, shortCircuit: true };
    if (mock) return { url: `support-test:${mock}`, shortCircuit: true };
    if (specifier === "./support-policy") return { url: new URL("../lib/users/support-policy.ts", import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith("support-test:")) return next(url, context);
    const pre = "const s=globalThis.__supportTest;";
    const source = {
      empty: "export {};",
      response: 'export class NextResponse extends Response { static json(value,options){return new Response(JSON.stringify(value),options);} static redirect(url,status){return Response.redirect(url,status);} }',
      auth: pre+'export const auth={api:{getSession:async()=>{s.authCalls=(s.authCalls||0)+1;return s.actor;}}};',
      headers: pre + 'export async function headers(){return new Headers();} export async function cookies(){return {has:()=>Boolean(s.token),get:()=>s.token?{value:s.token}:undefined,set:(name,token,options)=>{s.cookieWrites.push({name,token,options});s.token=token;},delete:()=>{s.token=null;}};}',
      store: pre + 'export const getClient=()=>s.client;',
      db: pre + 'export const db={query:async(sql,args)=>{s.queries.push({sql,args});if(s.missing)throw Error("database unavailable");return {rows:s.rows};}};',
      transaction: pre + 'export const transaction=async(fn)=>fn({query:async(sql,args)=>{s.writes.push({sql,args});if(s.missing)throw Error("database unavailable");if(sql.includes("SELECT u."))return {rowCount:1,rows:[{id:"owner"}]};if(sql.includes("SELECT ")&&sql.includes("email"))return {rowCount:1,rows:[{email:s.client.email}]};return {rowCount:1,rows:[]};}});',
    }[url.slice("support-test:".length)];
    return { format: "module", source, shortCircuit: true };
  },
});
const { resolveSupportView, createSupportView, endSupportView } = await import("../lib/users/support.ts");
const actor = { user: { id: "owner" }, session: { id: "s1", createdAt: new Date() } };
assert.equal(await resolveSupportView(null), null);
state.token="bad"; assert.equal(await resolveSupportView(actor), null); assert.equal(state.queries.length,0);
state.token="A".repeat(43);
assert.equal(await resolveSupportView(actor),null);
state.rows=[{id:"v1",target_id:"client",name:"Client",email:state.client.email,client_id:"c1",expires_at:new Date(Date.now()+60000)}];
assert.equal((await resolveSupportView(actor)).targetId,"client");
const {sql,args}=state.queries.at(-1);
for(const clause of [`a."role" = 'owner'`, 'a."deactivatedAt" IS NULL', `u."role" = 'client'`, 'u."deactivatedAt" IS NULL', 's."expiresAt" > now()', 'v.actor_id = $2', 'v.actor_session_id = $3', 'v.revoked_at IS NULL', 'v.expires_at > now()']) assert.ok(sql.includes(clause),clause);
assert.deepEqual(args.slice(1),["owner","s1"]); assert.match(args[0],/^[a-f0-9]{64}$/);
for(const patch of [{archived:true},{mergedInto:"c2"},{email:"other@example.com"}]){const before=state.client;state.client={...before,...patch};assert.equal(await resolveSupportView(actor),null);state.client=before;}
state.missing=true;await assert.rejects(resolveSupportView(actor));state.missing=false;
await assert.rejects(createSupportView(actor,"client","c1","help"),/Exit/);
state.token=null;
for(const time of ["invalid",new Date(Date.now()+60000),new Date(Date.now()-16*60000)]) await assert.rejects(createSupportView({...actor,session:{...actor.session,createdAt:time}},"client","c1","help"),/Sign in/);
await assert.rejects(createSupportView(actor,"client","c1",""),/reason/);
await createSupportView(actor,"client","c1","Review project");
assert.equal(state.cookieWrites.length,1);assert.equal(state.cookieWrites[0].options.httpOnly,true);assert.equal(state.cookieWrites[0].options.maxAge,900);
const actorCheck=state.writes.find(x=>x.sql.includes('SELECT u.')).sql;assert.ok(actorCheck.includes('s."createdAt" >= now()'));assert.ok(actorCheck.includes('s."expiresAt" > now()'));
const insert=state.writes.find(x=>x.sql.includes('INSERT INTO user_support_sessions'));assert.match(insert.args[0],/^[a-f0-9]{64}$/);assert.notEqual(insert.args[0],state.token);
state.missing=true;await assert.rejects(endSupportView(actor));assert.equal(state.token,null);
const { POST } = await import("../app/api/support/exit/route.ts");
state.actor=actor;state.missing=false;state.token="A".repeat(43);
for(const origin of [null,"https://other.example"]) {
 const h=origin?{origin}:{};const count=state.authCalls||0;
 const response=await POST(new Request("https://wdc.example/api/support/exit",{method:"POST",headers:h}));
 assert.equal(response.status,403);assert.equal(state.authCalls||0,count);assert.ok(state.token);
}
const exited=await POST(new Request("https://wdc.example/api/support/exit",{method:"POST",headers:{origin:"https://wdc.example"}}));
assert.equal(exited.status,303);assert.equal(state.token,null);assert.ok(exited.headers.get("location").endsWith("/admin/settings/users?notice=support-ended"));
console.log("Support scope checks passed: persisted authority predicates, identity binding, client link, freshness, token hashing, cookie boundary and exit recovery.");
