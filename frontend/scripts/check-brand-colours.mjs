import assert from 'node:assert/strict';
import { COLOUR_ROLES, formatColours, parseColours, normalizeHex, colourProblem, shadeHex, hexShade, suggestRoles, contrastRatio, MAIN_COLOUR_ROLE, OTHER_COLOUR_ROLE } from '../lib/brand-colours.ts';
import { FEELINGS, CHIPS, nameColour } from '../lib/colour-palettes.ts';

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

assert.equal(FEELINGS.length, 6, 'six feeling cards');
assert.equal(CHIPS.length, 11, 'eleven named chips');
for (const feeling of FEELINGS) {
  assert.equal(feeling.palettes.length, 3, `${feeling.name} has three palettes`);
  feeling.palettes.forEach((palette, number) => {
    const label = `${feeling.name}, palette ${number + 1}`;
    assert.equal(palette.length, 4, `${label} has four colours`);
    const hexes = palette.map((colour) => normalizeHex(colour.hex));
    for (const [index, colour] of palette.entries()) {
      assert.ok(colour.name.trim() && colour.name.length <= 40 && !/[|\r\n]/.test(colour.name), `${label}: plain name for ${colour.hex}`);
      assert.ok(hexes[index], `${label}: ${colour.hex} is a valid hex`);
      assert.notEqual(hexes[index], '#FF6500', `${label}: the site orange is never a palette colour`);
    }
    assert.equal(new Set(hexes).size, 4, `${label} has no duplicate hex`);
    const pairs = [];
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) pairs.push(contrastRatio(hexes[a], hexes[b]));
    assert.ok(Math.max(...pairs) >= 4.5, `${label} has a text and background pair at 4.5 or more`);
  });
}
for (const chip of CHIPS) assert.equal(nameColour(chip.hex), chip.name, `chip ${chip.name} names itself`);
assert.equal(nameColour('#abc'), nameColour('#AABBCC'));
assert.equal(nameColour('not a colour'), 'Colour');
assert.equal(nameColour('#1E5B3A'), 'Dark green');

const roles = (rows) => suggestRoles(rows).map((row) => row.role);
assert.deepEqual(roles([{ name: 'Deep navy', hex: '#14284B' }, { name: 'Sky blue', hex: '#5B9BD5' }, { name: 'Mist', hex: '#E6EEF7' }, { name: 'Slate', hex: '#3E4C59' }]),
  [MAIN_COLOUR_ROLE, 'Supporting colour (secondary)', 'Neutral / background', OTHER_COLOUR_ROLE]);
assert.deepEqual(roles([{ name: 'Black', hex: '#111111' }, { name: 'Red', hex: '#D62828' }, { name: 'Yellow', hex: '#F7B500' }, { name: 'White', hex: '#FFFFFF' }]),
  [MAIN_COLOUR_ROLE, 'Supporting colour (secondary)', 'Highlight (accent)', 'Neutral / background']);
assert.deepEqual(roles([{ name: 'Navy', hex: '#14284B' }, { name: 'Charcoal', hex: '#222222' }]), [MAIN_COLOUR_ROLE, 'Text']);
assert.deepEqual(roles([{ name: 'Only', hex: '' }]), [MAIN_COLOUR_ROLE]);
assert.deepEqual(roles([]), []);
assert.equal(suggestRoles([{ name: 'Lead', hex: '#abc' }])[0].hex, '#AABBCC');

console.log(`Brand colour checks passed: ${FEELINGS.length} feelings, ${FEELINGS.length * 3} palettes, ${CHIPS.length} chips, role suggestions and the old contract cases.`);
