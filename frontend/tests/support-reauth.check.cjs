/* eslint-disable @typescript-eslint/no-require-imports -- Native auth/support regression checks, without real accounts or writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), Buffer, URL, Headers, FormData, Date, Error, process });
  return exports;
}
(async () => {
  const session = { user: { id: 'owner', role: 'owner' }, session: { id: 'original', createdAt: new Date() } };
  const redirect = destination => { throw new Error(`redirect:${destination}`); };
  const route = load('components/auth/login-route.tsx', {
    'next/headers': { headers: async () => new Headers() }, 'next/navigation': { redirect },
    '@/lib/auth': { auth: { api: { getSession: async () => session } } },
    '@/lib/roles': { safeDestination: () => '/admin' },
    '@/components/auth/auth-shell': { AuthShell: 'shell' },
    '@/components/auth/login-experience': { __esModule: true, default: 'experience' },
  });
  await assert.rejects(route.LoginRoute({ query: Promise.resolve({}), initialStep: 'identify' }), /redirect:\/admin/);
  const shown = await route.LoginRoute({ query: Promise.resolve({ reauthenticate: '1' }), initialStep: 'identify' });
  assert.equal(shown.props.children.props.previousSessionId, 'original');
  assert.equal(shown.props.children.props.completed, null);
  let current = session;
  let magicCalls = 0, magicInput;
  const adapter = load('lib/auth/adapter.ts', {
    '@/lib/auth-client': { authClient: { getSession: async () => ({ data: current }), signIn: { magicLink: async input => { magicCalls++; magicInput = input; return {}; } } } },
    './validation': { authEmail: email => email },
  }).realAdapter({ requested: '/admin/users', google: false, previousSessionId: 'original' });
  assert.equal((await adapter.sendMagicLink('qa@example.com')).ok, true);
  assert.equal(magicCalls, 1);
  assert.match(magicInput.errorCallbackURL, /^\/login\?reauthenticate=1&redirect=/);
  assert.equal((await adapter.checkMagicStatus('qa')).reason, 'pending');
  current = { ...session, session: { id: 'fresh' } };
  assert.equal((await adapter.checkMagicStatus('qa')).ok, true);
  current = { user: session.user };
  assert.equal((await adapter.checkMagicStatus('qa')).reason, 'pending');

  const policy = load('lib/users/support-policy.ts', {});
  const jar = new Map();
  let actorAllowed = true, targetAllowed = true, queries = [], readRows = [];
  const db = { query: async (sql, args) => {
    queries.push({ sql, args });
    if (sql.includes('FOR UPDATE')) return { rowCount: sql.includes('JOIN "session"') ? Number(actorAllowed) : Number(targetAllowed), rows: [] };
    return { rows: readRows, rowCount: readRows.length };
  } };
  const support = load('lib/users/support.ts', {
    'server-only': {}, 'next/headers': { cookies: async () => ({ has: key => jar.has(key), get: key => jar.has(key) ? { value: jar.get(key) } : undefined, set: (key, value) => jar.set(key, value), delete: key => jar.delete(key) }) },
    '@/lib/db/pool': { db }, '@/lib/db/transaction': { transaction: async work => work(db) },
    '@/lib/admin/store': {}, './support-policy': policy,
  });
  const old = { ...session, session: { ...session.session, createdAt: new Date(Date.now() - 16 * 60000) } };
  await assert.rejects(support.createStaffSupportView(old, 'staff', 'QA reason'), /Sign in again/);
  assert.equal(queries.length, 0);
  await support.createStaffSupportView(session, 'staff', 'QA reason');
  assert.equal(jar.has(policy.SUPPORT_STAFF_COOKIE), true);
  assert.ok(queries.some(q => q.sql.includes("NULL,'staff'") && q.sql.includes("INTERVAL '15 minutes'")));
  await assert.rejects(support.createStaffSupportView(session, 'staff', 'QA reason'), /Exit the current/);
  readRows = [{ id: 'view', target_id: 'staff', name: 'QA Staff', email: 'qa@example.com', actor_name: 'QA Owner', expires_at: new Date(Date.now() + 60000) }];
  assert.equal((await support.resolveStaffSupportView(session)).targetId, 'staff');
  const scope = queries.at(-1).sql;
  for (const fragment of ["a.\"role\" = 'owner'", "u.\"role\" = 'staff'", 's."expiresAt" > now()', 'v.expires_at > now()', 'v.revoked_at IS NULL', 'v.actor_session_id = $3']) assert.ok(scope.includes(fragment), fragment);
  readRows = [];
  assert.equal(await support.resolveStaffSupportView(session), null);
  await support.endSupportView(session);
  assert.equal(jar.size, 0);
  actorAllowed = false;
  await assert.rejects(support.createStaffSupportView(session, 'staff', 'QA reason'), /not available/);
  actorAllowed = true; targetAllowed = false;
  await assert.rejects(support.createStaffSupportView(session, 'staff', 'QA reason'), /not available/);
  assert.equal(jar.size, 0);
  targetAllowed = true;
  let origin = 'https://example.com', actionSession = session;
  const actions = load('lib/users/support-actions.ts', {
    'next/headers': { headers: async () => new Headers({ host: 'example.com', ...(origin ? { origin } : {}) }) },
    'next/navigation': { redirect }, '@/lib/auth': { auth: { api: { getSession: async () => actionSession } } },
    './support': support, './support-policy': policy, '@/lib/rate-limit': { rateLimit: () => ({ ok: true }) },
    '@/lib/admin/validate': { FAIL: (errors, message) => ({ ok: false, errors, message }) },
  });
  const fd = new FormData(); fd.set('targetId', 'staff'); fd.set('reason', 'QA reason');
  actionSession = old;
  assert.equal((await actions.startStaffSupport({}, fd)).signIn, true);
  actionSession = { ...session, user: { ...session.user, role: 'staff' } };
  assert.equal((await actions.startStaffSupport({}, fd)).ok, false);
  actionSession = session; origin = '';
  assert.equal((await actions.startStaffSupport({}, fd)).ok, false);
  origin = 'https://example.com';
  await assert.rejects(actions.startStaffSupport({}, fd), /redirect:\/admin/);
  assert.equal(jar.has(policy.SUPPORT_STAFF_COOKIE), true);
  await support.endSupportView(session);
  console.log('Fresh-login recovery, old-session magic-link polling, owner/staff locks, cookie start/expiry/revocation scope and Exit passed; no real accounts or database writes.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
