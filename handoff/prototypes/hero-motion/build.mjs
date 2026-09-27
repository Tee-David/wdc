import fs from 'fs';
const shell = fs.readFileSync('src/shell.html','utf8');
const files = fs.readdirSync('src').filter(f=>/^c\d\d-.*\.js$/.test(f)).sort();
const js = files.map(f=>`<script>\n${fs.readFileSync('src/'+f,'utf8')}\n</script>`).join('\n');
const eng = ['engine.js','views.js'].map(f=>`<script>\n${fs.readFileSync('src/'+f,'utf8')}\n</script>`).join('\n');
const out = shell.replace('<!--CONCEPTS-->', () => js).replace('<!--ENGINE-->', () => eng);
fs.writeFileSync('index.html', out);
// publish copy: no doctype/html/head/body wrappers, no charset/viewport metas, starts with the title
let pub = out.replace(/<!doctype html>\s*/i,'').replace(/<html[^>]*>\s*/i,'').replace(/<\/html>\s*/i,'').replace(/<head>\s*/i,'').replace(/<\/head>\s*/i,'').replace(/<body>\s*/i,'').replace(/<\/body>\s*/i,'')
  .replace(/<meta charset="utf-8">\s*/i,'').replace(/<meta name="viewport"[^>]*>\s*/i,'');
const title = '<title>WDC Hero Motion</title>';
pub = title + '\n' + pub.replace(title + '\n', '').trim() + '\n';
fs.writeFileSync('wdc-hero-motion.html', pub);
console.log('built', files.length, out.length, pub.length);
