import fs from 'fs';
const OLD = new URL('../hero-motion/src/', import.meta.url).pathname;
const oldShell = fs.readFileSync(OLD + 'shell.html', 'utf8');
const U = oldShell.slice(oldShell.indexOf('const U = (() => {'), oldShell.indexOf('const CONCEPTS = [];'));
const pieces = fs.readdirSync(OLD).filter(f => /^c\d\d-.*\.js$/.test(f)).sort().map(f => fs.readFileSync(OLD + f, 'utf8')).join('\n');
let eng = fs.readFileSync(OLD + 'engine.js', 'utf8');
const rep = (a, b) => { if (!eng.includes(a)) throw new Error('missing: ' + a); eng = eng.replace(a, b); };
rep('const p = CONCEPTS[i];', 'const p = (env.set || CONCEPTS)[i];');
rep('this.envs = [mkEnv(this.ptr), mkEnv(this.ptr)];', 'this.envs = [mkEnv(this.ptr), mkEnv(this.ptr)]; this.envs.forEach(e => { e.set = o.set; e.dprMax = o.dprMax; });');
rep('env.dpr = Math.min(dprCap, window.devicePixelRatio || 1);', 'env.dpr = Math.min(dprCap, env.dprMax || 9, window.devicePixelRatio || 1);');
rep('rm() { return rmq.matches && !this.force; }', 'rm() { return (rmq.matches || window.__simRM) && !this.force; }');
let meas = '';
try { meas = 'window.__MEAS = ' + fs.readFileSync('meas.json', 'utf8') + ';\n'; } catch (e) {}
const app = fs.readFileSync('src/app.js', 'utf8');
let out = fs.readFileSync('src/shell.html', 'utf8');
out = out.replace('/*U*/', () => U).replace('/*PIECES*/', () => pieces).replace('/*ENGINE*/', () => eng).replace('/*APP*/', () => meas + app);
fs.writeFileSync('wdc-hero-reconciled.html', out);
// local preview copy with a skeleton
fs.writeFileSync('preview.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + out + '</body></html>');
console.log('built', out.length);
