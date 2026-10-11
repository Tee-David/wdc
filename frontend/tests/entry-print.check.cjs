/* eslint-disable @typescript-eslint/no-require-imports -- Run the real PDF renderer and print route with synthetic entry data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let permitted = true;
let form, entry;
const denyIO = () => { throw new Error('Unexpected database or upload access'); };
const overrides = {
  'server-only': {},
  '@/lib/admin/guard': { allow: async () => permitted ? null : true },
  '@/lib/forms/find': { findForm: async () => form },
  '@/lib/forms/custom': {},
  '@/lib/onboarding-files': { onboardingFiles: async () => [], customFiles: denyIO },
  '@/lib/db/pool': { db: denyIO },
  '@/lib/admin/store': {},
};
function load(file) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file).exports;
  const m = new Module(file);
  m.paths = Module._nodeModulePaths(path.dirname(file));
  cache.set(file, m);
  m.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const resolved = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      return load(fs.existsSync(resolved + '.ts') ? resolved + '.ts' : resolved);
    }
    return require(require.resolve(name, { paths: [root] }));
  };
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, file);
  return m.exports;
}
(async () => {
  process.chdir(root);
  form = load('lib/forms/registry.ts').formByKey('onboarding-branding');
  assert.ok(form);
  const fields = load('lib/onboarding.ts').stepsFor('branding').flatMap(step => step.fields);
  const longField = fields.find(field => field.kind === 'textarea');
  assert.ok(longField, 'Exercise a real long-answer question');
  entry = { id: 'qa-print-only', serial: 7, at: '2026-10-10T12:00:00Z', name: 'QA Contact', email: 'qa@example.com', phone: '', draft: false, answers: {
    company: 'QA Studio', [longField.key]: 'QA beginning. ' + 'Synthetic onboarding answer for print verification. '.repeat(220) + 'QA ending.',
  } };
  const entries = load('lib/forms/entries.ts');
  overrides['@/lib/forms/entries'] = { answeredCount: entries.answeredCount, getEntry: async () => entry };
  const { GET } = load('app/admin/forms/[form]/entries/[entry]/pdf/route.ts');
  const params = { params: Promise.resolve({ form: form.key, entry: entry.id }) };
  const response = await GET(new Request('https://example.com/admin/form/pdf?print=1'), params);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(response.headers.get('content-disposition'), /^inline; filename="branding-onboarding-brief-qa-studio.pdf"$/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wdc-entry-print-'));
  try {
    const pdf = path.join(temp, 'synthetic.pdf');
    fs.writeFileSync(pdf, bytes);
    const result = spawnSync('python', ['-c', `import pymupdf,sys
d=pymupdf.open(sys.argv[1])
assert len(d)>1
text=' '.join(p.get_text() for p in d)
assert 'QA Studio' in text and 'QA beginning.' in text and 'QA ending.' in text
assert 'Synthetic onboarding answer' in text
common=set(x[0] for x in d[0].get_images())
for p in d:
 common &= set(x[0] for x in p.get_images())
 assert p.rect.width>590 and p.rect.height>840
assert common, 'Every page must contain the same watermark image'
print('Actual onboarding print PDF: %s A4 pages, synthetic answers retained, watermark on every page.'%len(d))`, pdf], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    console.log(result.stdout.trim());
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  const download = await GET(new Request('https://example.com/admin/form/pdf'), params);
  assert.match(download.headers.get('content-disposition'), /^attachment;/);
  permitted = false;
  assert.equal((await GET(new Request('https://example.com/admin/form/pdf?print=1'), params)).status, 404);
  console.log('Inline print, attachment download and denied-access route checks passed; no database writes.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
