// Export every board in screens/ as a page that opens in any browser, without the design canvas.
// It carries a small copy of the canvas runtime (holes, sc-for, sc-if, events, setState): enough to
// render and click through a board. Usage: node design/dashboards/export.js  (writes design/dashboards/standalone/)
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'screens');
const OUT = path.join(__dirname, 'standalone');
fs.mkdirSync(OUT, { recursive: true });
function page(src, title) {
const helmet = src.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
const tpl = src.slice(src.indexOf('</helmet>') + 9, src.lastIndexOf('</x-dc>')).replace(/<sc-(for|if)\b/g, '<template data-$1').replace(/<\/sc-(for|if)>/g, '</template>');
let js = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const stateJson = '{}';
return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${helmet}</head><body><template id="t">${tpl}</template><div id="root"></div>
<script>
const SVG='http://www.w3.org/2000/svg';
function look(s,p){p=p.trim();if(p==='true')return true;if(p==='false')return false;return p.split('.').reduce((o,k)=>o==null?undefined:o[k],s);}
function interp(t,s){return t.replace(/\\{\\{\\s*([^}]+?)\\s*\\}\\}/g,(m,p)=>{const v=look(s,p);return v==null?'':String(v);});}
function hole(r){const m=r.match(/\\{\\{\\s*(.+?)\\s*\\}\\}/);return m&&m[1];}
const EV={click:'click',change:'input',keydown:'keydown',mouseenter:'mouseenter',mousemove:'mousemove',focus:'focus'};
function render(src,s,out){for(const n of src.childNodes){
 if(n.nodeType===3){out.appendChild(document.createTextNode(interp(n.nodeValue,s)));continue;}
 if(n.nodeType!==1)continue;const tag=n.localName;
 if(tag==='template'&&n.hasAttribute('data-for')){const l=look(s,hole(n.getAttribute('list')))||[];const as=n.getAttribute('as');l.forEach(it=>{const c=Object.create(s);c[as]=it;render(n.content,c,out);});continue;}
 if(tag==='template'&&n.hasAttribute('data-if')){if(look(s,hole(n.getAttribute('value'))))render(n.content,s,out);continue;}
 const el=n.namespaceURI===SVG?document.createElementNS(SVG,n.localName):document.createElement(tag);
 for(const a of n.attributes){const nm=a.name,raw=a.value;
  if(/^on/.test(nm)){const fn=look(s,hole(raw)||'');if(typeof fn==='function')el.addEventListener(EV[nm.slice(2)]||nm.slice(2),fn);continue;}
  if(nm==='disabled'){const h=hole(raw);if(h?look(s,h):true)el.setAttribute('disabled','');continue;}
  if(nm==='value'&&(tag==='input'||tag==='textarea')){el.value=interp(raw,s);continue;}
  if(nm==='key')continue;el.setAttribute(nm,interp(raw,s));}
 render(n,s,el);out.appendChild(el);}}
class DCLogic{constructor(p){this.props=p;this.state={};}setState(o){const prev=Object.assign({},this.state);Object.assign(this.state,typeof o==='function'?o(this.state):o);draw(prev);}}
let C;const T=document.getElementById('t').content;
function draw(prev){const root=document.getElementById('root');const f=document.createDocumentFragment();render(T,C.renderVals(),f);root.replaceChildren(f);if(prev&&C.componentDidUpdate)C.componentDidUpdate({},prev);}
const Component=(new Function('DCLogic',${JSON.stringify(js)}+';return Component;'))(DCLogic);
C=new Component({});Object.assign(C.state,${stateJson});window.comp=C;draw();C.componentDidMount&&C.componentDidMount();
</script></body></html>`;
}
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.dc.html')).sort();
for (const f of files) {
  const src = fs.readFileSync(path.join(SRC, f), 'utf8');
  const title = (src.match(/<title>([^<]*)<\/title>/) || [, f])[1];
  fs.writeFileSync(path.join(OUT, f.replace('.dc.html', '.html')), page(src, title));
}
console.log(`${files.length} boards written to ${path.relative(process.cwd(), OUT) || OUT}`);
