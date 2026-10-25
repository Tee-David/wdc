/* eslint-disable @typescript-eslint/no-require-imports -- Native check of staff scope, without a database or accounts. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), Error });
  return exports;
}
(async () => {
  let role = 'staff';
  const projects = [
    { id: 'p-lead', clientId: 'c-a', ownerIds: ['me'] },
    { id: 'p-member', clientId: 'c-b', ownerIds: [] },
    { id: 'p-dept', clientId: 'c-dept', ownerIds: [] },
    { id: 'p-other', clientId: 'c-other', ownerIds: [] },
  ];
  const clients = [{ id: 'c-a' }, { id: 'c-b' }, { id: 'c-dept', departments: ['d1'] }, { id: 'c-other', departments: ['d2'] }];
  const db = { query: async (sql) => sql.includes('workspace_project_members') ? { rows: [{ project_id: 'p-member' }] } : { rows: [{ department_id: 'd1' }] } };
  const scope = load('lib/admin/staff-scope.ts', {
    'server-only': {}, '@/lib/db/pool': { db },
    '@/lib/admin/store': { getProjects: () => projects, getClients: () => clients, getTicket: (id) => ({ t1: { clientId: 'c-a' }, t9: { clientId: 'c-other' } })[id], getDeliverable: (id) => ({ d1: { projectId: 'p-lead' }, d9: { projectId: 'p-other' } })[id] },
    '@/lib/admin/validate': { FAIL: (errors, message) => ({ ok: false, errors, message }) },
    '@/lib/admin/guard': { adminRole: async () => role },
    '@/lib/admin/session': { getAdminRequest: async () => ({ session: { user: { id: 'me' } } }) },
  });
  const s = await scope.staffScope('staff');
  assert.deepEqual([...s.projects].sort(), ['p-dept', 'p-lead', 'p-member']);
  assert.deepEqual([...s.clients].sort(), ['c-a', 'c-b', 'c-dept']);
  for (const ok of [{ client: 'c-a' }, { project: 'p-dept' }, { ticket: 't1' }, { deliverable: 'd1' }]) assert.equal(await scope.outOfScope(ok), null, JSON.stringify(ok));
  for (const no of [{ client: 'c-other' }, { project: 'p-other' }, { ticket: 't9' }, { ticket: 'missing' }, { deliverable: 'd9' }, { deliverable: 'missing' }]) assert.equal((await scope.outOfScope(no))?.ok, false, JSON.stringify(no));
  role = 'owner';
  assert.equal(await scope.outOfScope({ client: 'c-other' }), null);
  assert.equal(await scope.staffScope('owner'), null);
  console.log('Staff scope: leads, members and department clients are in; anything else, and any id that does not resolve, is refused; the owner passes.');
})().catch((error) => { console.error(error); process.exit(1); });
