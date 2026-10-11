/* eslint-disable @typescript-eslint/no-require-imports -- Executes real support SQL in an always-rolled-back database transaction. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseEnv } = require('node:util');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
let phase = 'load';
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), process, Buffer, Date, Headers, URL, Proxy });
  return exports;
}
(async () => {
  assert.ok(process.argv.includes('--rollback-database'), 'Explicit --rollback-database is required; temporary fixtures are never committed.');
  const env = parseEnv(fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8'));
  process.env.COCKROACHDB_URL = env.COCKROACHDB_URL;
  if (env.COCKROACHDB_CERT) process.env.COCKROACHDB_CERT = env.COCKROACHDB_CERT;
  const { db } = load('lib/db/pool.ts', { 'server-only': {} });
  const owner = 'qa-support-owner-' + randomUUID(), staff = 'qa-support-staff-' + randomUUID(), sessionId = 'qa-support-session-' + randomUUID();
  phase = 'connect';
  const c = await db.connect().catch(async error => { await db.end(); throw error; });
  try {
    assert.equal((await c.query('SELECT current_database() AS name')).rows[0].name, 'defaultdb', 'Unexpected database target');
    await c.query('BEGIN');
    phase = 'seed';
    await c.query('INSERT INTO "user"("id","name","email","role","emailVerified") VALUES($1,$2,$3,$4,true),($5,$6,$7,$8,true)', [owner, 'QA Owner', owner + '@example.invalid', 'owner', staff, 'QA Staff', staff + '@example.invalid', 'staff']);
    // A recent session, rather than a just-created timestamp, avoids local clock skew.
    const row = await c.query(`INSERT INTO "session"("id","expiresAt","token","userId","createdAt") VALUES($1,now()+INTERVAL '1 hour',$2,$3,now()-INTERVAL '1 minute') RETURNING "createdAt"`, [sessionId, randomUUID(), owner]);
    const session = { user: { id: owner, name: 'QA Owner', role: 'owner' }, session: { id: sessionId, createdAt: row.rows[0].createdAt } };
    const jar = new Map();
    const cookieStore = { has: key => jar.has(key), get: key => jar.has(key) ? { value: jar.get(key) } : undefined, set: (key, value) => jar.set(key, value), delete: key => jar.delete(key), toString: () => '' };
    const nextHeaders = { cookies: async () => cookieStore, headers: async () => new Headers() };
    const policy = load('lib/users/support-policy.ts', {});
    const support = load('lib/users/support.ts', { 'server-only': {}, 'next/headers': nextHeaders, '@/lib/db/pool': { db: c }, '@/lib/db/transaction': { transaction: work => work(c) }, '@/lib/admin/store': {}, './support-policy': policy });
    const admin = load('lib/admin/session.ts', { 'server-only': {}, react: { cache: fn => fn }, 'next/headers': nextHeaders, './capture': { isAdminCapture: () => false }, '@/lib/users/support': support, '@/lib/auth': { auth: { api: { getSession: async () => session } } } });
    phase = 'create';
    await support.createStaffSupportView(session, staff, 'Rolled-back integration verification');
    assert.equal((await support.resolveStaffSupportView(session)).targetId, staff);
    phase = 'effective-identity';
    const request = await admin.getAdminRequest();
    assert.equal(request.session.user.role, 'staff');
    assert.equal(request.session.user.id, staff);
    assert.equal(request.support.actorId, owner);
    assert.equal(request.session.session.id, sessionId);
    assert.equal(await support.supportCookiePresent(), true);
    await c.query('UPDATE "user" SET "role"=$2 WHERE "id"=$1', [staff, 'client']);
    assert.equal((await admin.getAdminRequest()).supportUnavailable, true);
    await c.query('UPDATE "user" SET "role"=$2 WHERE "id"=$1', [staff, 'staff']);
    await c.query('UPDATE "user" SET "deactivatedAt"=now() WHERE "id"=$1', [staff]);
    assert.equal(await support.resolveStaffSupportView(session), null);
    await c.query('UPDATE "user" SET "deactivatedAt"=NULL WHERE "id"=$1', [staff]);
    await c.query('UPDATE user_support_sessions SET expires_at=now()-INTERVAL \'1 second\' WHERE actor_id=$1', [owner]);
    assert.equal((await admin.getAdminRequest()).session, null);
    await c.query('UPDATE user_support_sessions SET expires_at=now()+INTERVAL \'15 minutes\' WHERE actor_id=$1', [owner]);
    const token = jar.get(policy.SUPPORT_STAFF_COOKIE);
    await support.endSupportView(session);
    assert.equal(jar.size, 0);
    jar.set(policy.SUPPORT_STAFF_COOKIE, token);
    assert.equal(await support.resolveStaffSupportView(session), null);
    assert.equal(Number((await c.query('SELECT count(*) AS n FROM user_security_events WHERE actor_id=$1', [owner])).rows[0].n), 2);
  } finally {
    await c.query('ROLLBACK').catch(() => {});
    c.release(true);
    try {
      for (const [table, column, ids] of [['user', 'id', [owner, staff]], ['session', 'id', [sessionId]], ['user_support_sessions', 'actor_id', [owner]], ['user_security_events', 'actor_id', [owner]]]) {
        assert.equal(Number((await db.query(`SELECT count(*) AS n FROM "${table}" WHERE "${column}"=ANY($1::STRING[])`, [ids])).rows[0].n), 0, 'Fixture remained after rollback');
      }
    } finally { await db.end(); }
  }
  console.log('Real support SQL and effective staff identity, role/deactivation/expiry/revocation guards, Exit and audit pass; rollback confirmed, no fixture accounts or sessions remain.');
})().catch(error => { console.error('Support database check failed:', phase, error.name, error.code || '', ['Sign in again before starting a support view.','That support view is not available.'].includes(error.message) ? error.message : ''); process.exitCode = 1; });
