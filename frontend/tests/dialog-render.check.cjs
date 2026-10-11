/* eslint-disable @typescript-eslint/no-require-imports -- Native regression for server-rendered dialog launchers. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let initialOpen = false;
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/admin/dialog.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exportsObject, require: name => name === 'react' ? { useState: () => [initialOpen, () => {}] } : name === 'lucide-react' ? { X: 'icon' } : require(name) });
let calls = 0;
const children = () => { calls++; return 'content'; };
exportsObject.DialogButton({ label: 'Export', title: 'Export users', children });
assert.equal(calls, 0, 'A closed dialog must not read browser-only controls during server rendering');
initialOpen = true;
exportsObject.DialogButton({ label: 'Export', title: 'Export users', children });
assert.equal(calls, 1, 'Opening a dialog must render its content');
console.log('Closed dialogs defer browser-dependent content; open dialogs render their content.');
