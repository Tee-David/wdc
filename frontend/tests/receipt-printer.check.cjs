/* eslint-disable @typescript-eslint/no-require-imports -- Native server-rendered receipt regression. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(relative) {
  const file = path.join(root, relative);
  const compiled = new Module(file);
  compiled.paths = Module._nodeModulePaths(path.dirname(file));
  const originalRequire = compiled.require.bind(module);
  compiled.require = name => {
    if (name.endsWith('.css')) return {};
    if (name === './receipt-actions') return {default: () => null, __esModule: true};
    if (name === '@/lib/money/currency') return load('lib/money/currency.ts');
    return originalRequire(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
  }).outputText, file);
  return compiled.exports;
}
const ReceiptPrinter = load('components/money/receipt-printer.tsx').default;
const {money} = load('lib/money/currency.ts');
const base = {amount: 12500, receiptNo: 'QA-RECEIPT', number: 'QA-INVOICE',
  method: 'Bank transfer', at: '2026-10-10T10:00:00Z', outstanding: 7500,
  lines: [{description: 'Service', qty: 1, amount: 20000}],
  subtotal: 20000, vat: 0, vatRate: 0, total: 20000};
const render = props => renderToStaticMarkup(React.createElement(ReceiptPrinter, {...base, ...props}));
const amountRow = (html, label, amount, currency) =>
  assert.ok(html.includes(`<dt>${label}:</dt><dd>${money(amount, currency)}</dd>`), `${label} must show the exact ${currency} amount`);
for (const currency of ['NGN', 'USD']) {
  const normal = render({currency});
  assert.ok(normal.includes('<b>Payment received</b>'));
  assert.ok(normal.includes('class="rp__tick"'));
  assert.ok(normal.includes('Thank you for your payment.'));
  amountRow(normal, 'Amount received', 12500, currency);
  amountRow(normal, 'Invoice total', 20000, currency);
  assert.ok(normal.includes(`${money(7500, currency)} due`));
  if (currency === 'USD') assert.ok(!normal.includes('₦'));
  for (const [props, heading, net] of [
    [{refunded: 2500}, 'Payment partially refunded', 10000],
    [{refunded: 12500}, 'Payment refunded', 0],
    [{reversed: true, refunded: 2500}, 'Payment reversed', 0],
  ]) {
    const html = render({currency, ...props});
    assert.ok(html.includes(`<b>${heading}</b>`));
    assert.ok(!html.includes('<b>Payment received</b>'));
    assert.ok(!html.includes('class="rp__tick"'));
    assert.ok(!html.includes('Thank you for your payment.'));
    amountRow(html, 'Amount received', 12500, currency);
    amountRow(html, 'Refunded', props.refunded, currency);
    amountRow(html, 'Net payment', net, currency);
  }
}
console.log('Actual POS receipt render passed: NGN/USD, original payment, refunds, net and reversal status.');
