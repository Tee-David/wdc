import assert from 'node:assert/strict';
import { COLOUR_ROLES, formatColours, parseColours, normalizeHex, colourProblem, shadeHex, hexShade } from '../lib/brand-colours.ts';

assert.equal(normalizeHex('#abc'), '#AABBCC');
assert.equal(normalizeHex('123456'), '#123456');
for (const input of ['#abcd', '#12345678', 'red', '#zzzzzz']) assert.equal(normalizeHex(input), null);
const rows = COLOUR_ROLES.slice(0, 5).map((role, index) => ({ name: `Colour ${index}, warm (soft)`, hex: index ? '' : '#abc', role }));
const text = formatColours(rows);
assert.equal(colourProblem(text), null);
assert.deepEqual(parseColours(text), rows.map((row) => ({ ...row, hex: row.hex ? '#AABBCC' : '' })));
assert.equal(formatColours(parseColours(text)), text);
assert.ok(colourProblem(formatColours([...rows, { name: 'Sixth', hex: '', role: COLOUR_ROLES[5] }])));
assert.ok(colourProblem(formatColours([{ name: 'Bad code', hex: '#gggggg', role: 'Not decided' }])));
assert.ok(colourProblem(formatColours([{ name: 'Bad role', hex: '', role: 'Invented' }])));
assert.ok(colourProblem(formatColours([{ name: 'Two\nlines', hex: '', role: 'Not decided' }])));
assert.ok(colourProblem(formatColours([{ name: 'Bad | delimiter', hex: '', role: 'Not decided' }])));
assert.equal(formatColours([{ name: '', hex: '', role: 'Not decided' }]), '');
for (const legacy of ['Deep green, cream; no exact codes yet.', 'Navy (#000065) — main colour', 'Six or more historic colour notes\nremain intact.']) {
  assert.equal(parseColours(legacy), null);
  assert.equal(colourProblem(legacy), null);
}
assert.equal(shadeHex(0, 100, 100), '#FF0000');
assert.equal(shadeHex(120, 100, 100), '#00FF00');
assert.equal(shadeHex(240, 100, 100), '#0000FF');
assert.equal(shadeHex(240, 0, 100), '#FFFFFF');
assert.equal(shadeHex(240, 100, 0), '#000000');
for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000']) assert.equal(shadeHex(...hexShade(hex)), hex);
console.log('Brand colour contract checks passed (round trips, bounds, invalid input, legacy notes, shade conversion).');
