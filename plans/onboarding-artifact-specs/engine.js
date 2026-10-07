/* WDC onboarding artifact engine. Shared by the three service pages. CFG comes from the service file. */
(function(){
'use strict';
var UN="I'm not sure, please advise me";
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var CFG=window.CFG, Q=CFG.Q, QM={}; Q.forEach(function(q){QM[q.id]=q});
var A={}, U={}, FI=0, SCR=0, prevVis={}, CUR={fam:'green',shade:45,hex:null,pop:false,mode:'hsb'};
/* ---------- colour helpers (plan 6.2) ---------- */
var NAMES="alice blue f0f8ff,antique white faebd7,aqua 00ffff,aquamarine 7fffd4,azure f0ffff,beige f5f5dc,bisque ffe4c4,black 000000,blanched almond ffebcd,blue 0000ff,blue violet 8a2be2,brown a52a2a,burlywood deb887,cadet blue 5f9ea0,chartreuse 7fff00,chocolate d2691e,coral ff7f50,cornflower blue 6495ed,cornsilk fff8dc,crimson dc143c,dark blue 00008b,dark cyan 008b8b,dark goldenrod b8860b,dark grey a9a9a9,dark green 006400,dark khaki bdb76b,dark magenta 8b008b,dark olive green 556b2f,dark orange ff8c00,dark orchid 9932cc,dark red 8b0000,dark salmon e9967a,dark sea green 8fbc8f,dark slate blue 483d8b,dark slate grey 2f4f4f,dark turquoise 00ced1,dark violet 9400d3,deep pink ff1493,deep sky blue 00bfff,dim grey 696969,dodger blue 1e90ff,fire brick b22222,floral white fffaf0,forest green 228b22,fuchsia ff00ff,gainsboro dcdcdc,ghost white f8f8ff,gold ffd700,goldenrod daa520,grey 808080,green 008000,green yellow adff2f,honeydew f0fff0,hot pink ff69b4,indian red cd5c5c,indigo 4b0082,ivory fffff0,khaki f0e68c,lavender e6e6fa,lavender blush fff0f5,lawn green 7cfc00,lemon chiffon fffacd,light blue add8e6,light coral f08080,light cyan e0ffff,light goldenrod fafad2,light grey d3d3d3,light green 90ee90,light pink ffb6c1,light salmon ffa07a,light sea green 20b2aa,light sky blue 87cefa,light slate grey 778899,light steel blue b0c4de,light yellow ffffe0,lime 00ff00,lime green 32cd32,linen faf0e6,maroon 800000,medium aquamarine 66cdaa,medium blue 0000cd,medium orchid ba55d3,medium purple 9370db,medium sea green 3cb371,medium slate blue 7b68ee,medium spring green 00fa9a,medium turquoise 48d1cc,medium violet red c71585,midnight blue 191970,mint cream f5fffa,misty rose ffe4e1,moccasin ffe4b5,navajo white ffdead,navy 000080,old lace fdf5e6,olive 808000,olive drab 6b8e23,orange ffa500,orange red ff4500,orchid da70d6,pale goldenrod eee8aa,pale green 98fb98,pale turquoise afeeee,pale violet red db7093,papaya whip ffefd5,peach puff ffdab9,peru cd853f,pink ffc0cb,plum dda0dd,powder blue b0e0e6,purple 800080,red ff0000,rosy brown bc8f8f,royal blue 4169e1,saddle brown 8b4513,salmon fa8072,sandy brown f4a460,sea green 2e8b57,seashell fff5ee,sienna a0522d,silver c0c0c0,sky blue 87ceeb,slate blue 6a5acd,slate grey 708090,snow fffafa,spring green 00ff7f,steel blue 4682b4,tan d2b48c,teal 008080,thistle d8bfd8,tomato ff6347,turquoise 40e0d0,violet ee82ee,wheat f5deb3,white ffffff,white smoke f5f5f5,yellow ffff00,yellow green 9acd32".split(',').map(function(s){var i=s.lastIndexOf(' ');return {n:s.slice(0,i),h:s.slice(i+1)}});
function h2r(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function r2h(r){return '#'+r.map(function(v){v=Math.max(0,Math.min(255,Math.round(v)));return (v<16?'0':'')+v.toString(16)}).join('')}
function r2hsl(r){var R=r[0]/255,G=r[1]/255,B=r[2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B),l=(mx+mn)/2,s=0,h=0,d=mx-mn;if(d){s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===R?((G-B)/d+(G<B?6:0)):mx===G?((B-R)/d+2):((R-G)/d+4);h*=60}return [h,s,l]}
function hsl2h(h,s,l){h=((h%360)+360)%360;var c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return r2h([(r+m)*255,(g+m)*255,(b+m)*255])}
function hsv2r(h,s,v){var c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r=0,g=0,b=0;h=((h%360)+360)%360;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return [(r+m)*255,(g+m)*255,(b+m)*255]}
function r2hsv(r){var R=r[0]/255,G=r[1]/255,B=r[2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B),d=mx-mn,h=0;if(d){h=mx===R?((G-B)/d+(G<B?6:0)):mx===G?((B-R)/d+2):((R-G)/d+4);h*=60}return [h,mx?d/mx:0,mx]}
var FAM={red:[0,.72],orange:[26,.95],yellow:[50,.92],green:[135,.6],blue:[215,.7],purple:[275,.55],pink:[330,.75],brown:[24,.42],neutral:[225,.06]};
function famHex(f,shade){var p=FAM[f];return hsl2h(p[0],p[1],0.9-(shade/100)*0.75)}
function colName(hex){var r=h2r(hex),best=null,bd=1e9;NAMES.forEach(function(c){var q=h2r(c.h),d=2*Math.pow(r[0]-q[0],2)+4*Math.pow(r[1]-q[1],2)+3*Math.pow(r[2]-q[2],2);if(d<bd){bd=d;best=c}});
  var n=best.n,hs=r2hsl(r);if(!/^(light|dark|deep|pale|medium)/.test(n)){if(hs[2]>=.8)n='light '+n;else if(hs[2]<=.22&&hs[1]>=.35)n='deep '+n;else if(hs[2]<=.28)n='dark '+n}
  return n.charAt(0).toUpperCase()+n.slice(1)}
var LIKE=['Like it','Quite like it','Like it a lot','Really like it','Love it'];
function sortColours(list){var left=list.slice(),out={},rm=function(c){left.splice(left.indexOf(c),1);return c};if(!list.length)return out;
  var f=list.filter(function(c){return c.first})[0]||list.slice().sort(function(a,b){return b.like-a.like})[0];out.primary=rm(f);
  var dist=function(a,b){var x=h2r(a.hex),y=h2r(b.hex);return Math.sqrt(Math.pow(x[0]-y[0],2)+Math.pow(x[1]-y[1],2)+Math.pow(x[2]-y[2],2))};
  left.sort(function(a,b){return b.like-a.like});
  var s=left.filter(function(c){return dist(c,out.primary)>120})[0];if(s)out.secondary=rm(s);
  var ac=left.filter(function(c){var hs=r2hsl(h2r(c.hex));return hs[1]>.55&&hs[2]>.25&&hs[2]<.8})[0];if(ac)out.accent=rm(ac);
  var tx=left.filter(function(c){var hs=r2hsl(h2r(c.hex));return hs[2]<.2&&hs[1]<.4})[0];if(tx)out.text=rm(tx);
  var nu=left.filter(function(c){var hs=r2hsl(h2r(c.hex));return hs[1]<.25||hs[2]>.85})[0];if(nu)out.neutral=rm(nu);
  if(left.length)out.extra=left;return out}
function colLine(c){return c.name+' | '+c.hex.toUpperCase()+' | like '+c.like+' of 5'+(c.first?' | first choice':'')}
/* ---------- state helpers ---------- */
function has(id,v){var a=A[id];return Array.isArray(a)?a.indexOf(v)>-1:a===v}
window.has=has;
function depthMin(lv){var f=CFG.flows[2],s=0;f.order.forEach(function(i){var q=QM[i];if(!q.parent&&q.type!=='notice'&&i!==f.head&&(q.d||1)<=lv)s+=q.sec||SEC[q.type]||15});return Math.max(1,Math.ceil(s/60))}
window.depthMin=depthMin;
function empty(q){var a=A[q.id];if(q.type==='notice')return false;if(a==null)return true;if(Array.isArray(a))return !a.length;return String(a).trim()===''}
function answered(q){return !empty(q)||!!U[q.id]}
function level(f){if(!f.gate)return 99;if(U[f.head]&&!A[f.head])return 2;var v=A[f.head];return (f.levels&&f.levels[v])||1}
function vis(q,fi){var f=CFG.flows[fi];if(f.order.indexOf(q.id)<0)return false;
  if(q.id!==f.head&&f.gate){var lv=q[f.gate]||1;if(lv>level(f))return false}
  if(q.parent&&!vis(QM[q.parent],fi))return false;return q.fn?!!q.fn(A):true}
function visList(fi){return CFG.flows[fi].order.map(function(i){return QM[i]}).filter(function(q){return vis(q,fi)})}
var SEC={text:25,url:20,long:45,number:10,choice:10,yesno:6,multi:18,cards:25,motion:20,check:40,upload:20,links:25,colours:60,notice:0,reveal:10};
function minutes(fi){var s=0;visList(fi).forEach(function(q){if(!answered(q))s+=q.sec||SEC[q.type]||15});return s?Math.max(1,Math.ceil(s/60)):0}
function optT(o){return typeof o==='string'?o:o.t}
function optV(o){return typeof o==='string'?o:o.v}
function ansText(q){var a=A[q.id];if(U[q.id]&&empty(q))return 'Not sure. The client asked the studio to advise.';
  if(q.type==='colours')return (a||[]).map(function(c){return c.name+' '+c.hex.toUpperCase()+' (like '+c.like+' of 5'+(c.first?', first choice':'')+')'}).join(', ');
  var map=function(v){var o=(q.opts||[]).filter(function(o){return optV(o)===v})[0];return o?optT(o):v};
  if(Array.isArray(a))return a.map(map).join(', ');return map(a)}
/* ---------- table ---------- */
var TYPEL={text:'Short text',url:'Web address',long:'Long text',number:'Number',choice:'Choose one',yesno:'Yes or no',multi:'Choose any',cards:'Picture cards, choose any',motion:'Clip tiles, choose any',check:'Searchable checklist, choose any',upload:'File upload',links:'Links box',colours:'Colour system',notice:'Notice, no input',reveal:'Hidden reveal, choose one'};
function gateText(f,q){if(f.tech&&f.tech.indexOf(q.id)>-1)return 'Asked last, only if it applies.';if(!f.gate||f.head===q.id)return '';var lv=q[f.gate]||1;return lv>1?(f.levelText&&f.levelText[lv]||''):''}
function unsureText(q){if(q.type==='notice')return 'None';if(q.unsure)return UN;if(q.unsureOpt)return 'Offered as an answer: '+q.unsureOpt;return 'Not offered, the client is the only source'}
function rowHtml(q,fi){var f=CFG.flows[fi],v=vis(q,fi),g=gateText(f,q),c=q.cond||'Always';if(f.head===q.id)c=q.condHead||'Always. This is the first question of this flow.';
  var key=q.key?'<span class="keyc">'+esc(q.key)+'</span><br><span class="tag '+(q.old?'optl':'navy')+'">'+(q.old?'Existing key':'New key')+'</span>':'<span class="sm">No stored answer</span>';
  return '<tr class="'+(v?'':'hid')+'"><td><span class="'+(q.parent?'lvl':'')+'"><b>'+(q.parent?'Follow up: ':'')+esc(q.label)+'</b></span>'+(q.hint?'<br><span class="sm">'+esc(q.hint)+'</span>':'')+(q.scope?'<br><span class="sm"><b>Always visible note:</b> '+esc(q.scope)+'</span>':'')+'</td>'
   +'<td>'+esc(q.typeNote||TYPEL[q.type]||q.type)+(q.opts&&q.type!=='notice'?'<br><span class="sm">'+q.opts.map(function(o){return esc(optT(o))}).join(', ')+'</span>':'')+'</td>'
   +'<td>'+(q.type==='notice'?'':'<span class="tag '+(q.req?'req':'optl')+'">'+(q.req?'Required':'Optional')+'</span>')+'</td>'
   +'<td>'+esc(c)+(g?'<br><b>'+esc(g)+'</b>':'')+'</td><td>'+key+'</td><td>'+esc(unsureText(q))+'</td>'
   +'<td><span class="tag '+(v?'navy':'optl')+'">'+(v?'Showing now':'Hidden now')+'</span></td></tr>'}
function renderTable(){var fi=FI,f=CFG.flows[fi];$('#tbody').innerHTML=f.order.map(function(i){return rowHtml(QM[i],fi)}).join('');
  var n=visList(fi).filter(function(q){return q.type!=='notice'}).length,tot=f.order.filter(function(i){return QM[i].type!=='notice'}).length;
  $('#tcount').textContent=tot+' questions in this flow. '+n+' showing now with the picks in the preview.'}
/* ---------- controls ---------- */
function ctl(q){var id=q.id,a=A[id],t=q.type,o='';
  if(t==='text'||t==='url'||t==='number')return '<input type="text" id="i-'+id+'" data-in="'+id+'" value="'+esc(a||'')+'" placeholder="'+esc(q.ph||'')+'"'+(t==='number'?' inputmode="numeric"':'')+(t==='url'?' inputmode="url" autocapitalize="none"':'')+' aria-label="'+esc(q.label)+'">';
  if(t==='long'||t==='links')return '<textarea id="i-'+id+'" data-in="'+id+'" placeholder="'+esc(q.ph||'')+'" aria-label="'+esc(q.label)+'">'+esc(a||'')+'</textarea>';
  if(t==='choice'||t==='yesno'){var opts=t==='yesno'?[{v:'yes',t:'Yes'},{v:'no',t:'No'}]:q.opts;
    return '<div class="opts" role="radiogroup" aria-label="'+esc(q.label)+'">'+opts.map(function(x,i){var v=optV(x);var d=typeof x==='object'&&(typeof x.d==='function'?x.d():x.d);return '<label class="opt'+(d?' stack':'')+'"><input type="radio" name="r-'+id+'" id="o-'+id+'-'+i+'" data-ch="'+id+'" data-v="'+esc(v)+'"'+(a===v?' checked':'')+'><span>'+esc(optT(x))+(d?'<br><small>'+esc(d)+'</small>':'')+'</span></label>'}).join('')+'</div>'}
  if(t==='multi')return '<div class="opts" role="group" aria-label="'+esc(q.label)+'">'+q.opts.map(function(x,i){var v=optV(x);return '<label class="opt'+(x.d?' stack':'')+'"><input type="checkbox" id="o-'+id+'-'+i+'" data-mu="'+id+'" data-v="'+esc(v)+'"'+((a||[]).indexOf(v)>-1?' checked':'')+'><span>'+(x.g?'<span class="grp">'+esc(x.g)+'</span><br>':'')+esc(optT(x))+(x.d?'<br><small>'+esc(x.d)+'</small>':'')+'</span></label>'}).join('')+'</div>';
  if(t==='cards')return '<div class="cards" role="group" aria-label="'+esc(q.label)+'">'+q.opts.map(function(x,i){var imgs=(x.img||[]).map(function(k,j){return '<img src="'+(window.IMG&&IMG[k]||'')+'" alt="'+esc(x.alt?x.alt[j]:'')+'" style="--i:'+j+'" width="210" height="210" loading="lazy">'}).join('');
    var sug=q.suggest&&q.suggest(A,x.v)?'<span class="sug tag req">Suggested</span>':'';
    var media=imgs?'<div class="media">'+imgs+'</div>':'<div class="tile sq"><span>'+esc(x.tile||'Clip pending')+'</span></div>';
    return '<label class="card'+(imgs&&x.img.length>1?' anim':'')+'" style="--cyc:'+(3*(x.img||[1]).length)+'s">'+'<input type="checkbox" id="o-'+id+'-'+i+'" data-mu="'+id+'" data-v="'+esc(x.v)+'"'+((a||[]).indexOf(x.v)>-1?' checked':'')+'>'+media+sug+'<span class="badge" aria-hidden="true">Picked</span><span class="ctext"><b>'+esc(x.t)+'</b><small>'+esc(x.d)+'</small>'+(x.cap?'<em>Samples: '+esc(x.cap)+'</em>':'<em>'+esc(x.capNote||'')+'</em>')+'</span></label>'}).join('')+'</div>';
  if(t==='motion')return '<div class="mopts" role="group" aria-label="'+esc(q.label)+'">'+q.opts.map(function(x,i){return '<label class="mopt"><input type="checkbox" id="o-'+id+'-'+i+'" data-mu="'+id+'" data-v="'+esc(x.v)+'"'+((a||[]).indexOf(x.v)>-1?' checked':'')+'>'+(x.clip?'<div class="tile '+(x.clip==='9:16'?'v':'')+'"><span>Clip pending</span></div>':'<div class="tile" style="background:var(--stage);color:var(--ink)"><span>No clip</span></div>')+'<span class="ctext"><b>'+esc(x.t)+'</b><small>'+esc(x.d)+'</small></span></label>'}).join('')+'</div>';
  if(t==='check'){var picked=(a||[]);return '<div class="chk"><input type="search" id="s-'+id+'" data-srch="'+id+'" placeholder="Search features, for example payments" aria-label="Search the list"><div class="picked" id="p-'+id+'">'+(picked.length?picked.map(function(p){return '<span class="tag req">'+esc(p)+'</span>'}).join(''):'<span class="sm">Nothing picked yet. '+q.groups.reduce(function(n,g){return n+g.items.length},0)+' features to choose from.</span>')+'</div><div class="chkl" id="l-'+id+'" tabindex="0" aria-label="Feature list, scrolls">'+q.groups.map(function(g,gi){return '<div class="chkg"><h4>'+esc(g.g)+'</h4><div class="opts">'+g.items.map(function(it,i){var v=it;return '<label class="opt" data-txt="'+esc((g.g+' '+it).toLowerCase())+'"><input type="checkbox" id="o-'+id+'-'+gi+'-'+i+'" data-mu="'+id+'" data-v="'+esc(v)+'"'+(picked.indexOf(v)>-1?' checked':'')+'><span>'+esc(it)+'</span></label>'}).join('')+'</div></div>'}).join('')+'<p class="sm" id="nm-'+id+'" hidden>Nothing matches. Try another word, or write it in the box below.</p></div></div>';}
  if(t==='upload'){var fl=a||[];return '<label class="drop'+(q.big?' big':'')+'"><input type="file" multiple id="i-'+id+'" data-up="'+id+'"><b>'+esc(q.dropTitle||'Drop files here or tap to choose')+'</b><span class="sm">'+esc(q.dropNote||'Pictures, PDFs and documents. This is a mock. Nothing leaves this page.')+'</span></label><div class="files">'+fl.map(function(n){return '<span class="tag optl">'+esc(n)+'</span>'}).join('')+'</div>'}
  if(t==='notice')return '<div class="notice">'+q.html+'</div>';
  if(t==='reveal'){return '<details class="rev"'+(a?' open':'')+'><summary>'+esc(q.revealLabel||'I already know what I want')+'</summary><div class="opts" role="radiogroup" aria-label="'+esc(q.label)+'" style="margin-top:6px">'+q.opts.map(function(x,i){var v=optV(x);return '<label class="opt"><input type="radio" name="r-'+id+'" id="o-'+id+'-'+i+'" data-ch="'+id+'" data-v="'+esc(v)+'"'+(a===v?' checked':'')+'><span>'+esc(optT(x))+'</span></label>'}).join('')+'</div></details>'}
  if(t==='colours')return colourWidget(q);
  return ''}
function colourWidget(q){var list=A[q.id]||[],cur=CUR.hex||famHex(CUR.fam,CUR.shade),nm=colName(cur),max=list.length>=5;
  var h='<details class="col" id="cw" '+(CUR.open||list.length?'open':'')+' data-open="1"><summary>Colours you like <span class="tag optl">Optional</span> <span class="tag navy">'+list.length+' of 5</span></summary><div class="colin">';
  h+='<p class="sm">These are suggestions. They may change in later meetings. The studio sorts them into main, second and accent colours for you.</p>';
  h+='<div><b>1. Pick a colour family</b></div><div class="fams" role="group" aria-label="Colour family">'+Object.keys(FAM).map(function(f){return '<button type="button" class="fam" data-act="fam" data-v="'+f+'" aria-pressed="'+(CUR.fam===f&&!CUR.hex)+'"><i style="background:'+famHex(f,45)+'"></i>'+f.charAt(0).toUpperCase()+f.slice(1)+'</button>'}).join('')+'</div>';
  h+='<div class="shade"><b><label for="shade">2. Slide to the shade</label></b><input type="range" id="shade" min="0" max="100" value="'+CUR.shade+'" aria-valuetext="'+esc(nm)+'"><div class="likel"><span>Lighter</span><span>Darker</span></div></div>';
  h+='<div class="cur"><span class="sw" style="background:'+cur+'"></span><div><b id="curname">'+esc(nm)+'</b><br><span class="sm" id="curhex">'+cur.toUpperCase()+'</span></div></div>';
  h+='<div class="hexrow"><button type="button" class="ptrig" data-act="pop" aria-haspopup="dialog"><i style="background:'+cur+'"></i>Pick a color</button><label class="sr" for="hexin">Type a hex code</label><input type="text" id="hexin" inputmode="text" autocapitalize="none" placeholder="#0B5D3B" maxlength="7" aria-label="Type a hex code"></div>';
  h+='<button type="button" class="btn" data-act="addcol"'+(max?' disabled':'')+'>'+(max?'You have five colours':'Add this colour')+'</button>';
  h+='<div class="links" aria-label="Optional ideas"><span class="sm" style="width:100%">Need ideas? These help, and they are optional.</span><a href="https://www.pinterest.com/" target="_blank" rel="noopener">Pinterest</a><a href="https://dribbble.com/" target="_blank" rel="noopener">Dribbble</a><a href="https://coolors.co/" target="_blank" rel="noopener">Coolors</a></div>';
  h+='<div class="clist" id="clist">'+list.map(function(c,i){return '<div class="crow"><div class="h"><span class="sw" style="background:'+c.hex+'"></span><b>'+esc(c.name)+'</b><span class="sm">'+c.hex.toUpperCase()+'</span><button type="button" class="btn sec" data-act="rmcol" data-i="'+i+'" aria-label="Remove '+esc(c.name)+'">Remove</button></div><div class="like"><label class="likel" for="lk'+i+'"><span>Like it</span><span id="lkt'+i+'">'+LIKE[c.like-1]+'</span><span>Love it</span></label><input type="range" id="lk'+i+'" data-like="'+i+'" min="1" max="5" step="1" value="'+c.like+'" aria-valuetext="'+LIKE[c.like-1]+'"></div><label class="opt"><input type="radio" name="first" data-first="'+i+'"'+(c.first?' checked':'')+'><span>First choice</span></label></div>'}).join('')+'</div>';
  h+='</div></details>';return h}
function popHtml(){var cur=CUR.hex||famHex(CUR.fam,CUR.shade),r=h2r(cur),hv=r2hsv(r),hs=r2hsl(r),P=['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#f43f5e'];
  CUR.hsv=CUR.hsv&&r2h(hsv2r(CUR.hsv[0],CUR.hsv[1],CUR.hsv[2]))===cur?CUR.hsv:hv;var v=CUR.hsv;
  var ch=CUR.mode==='rgb'?[['R',r[0]],['G',r[1]],['B',r[2]]]:CUR.mode==='hsl'?[['H',Math.round(hs[0])],['S',Math.round(hs[1]*100)],['L',Math.round(hs[2]*100)]]:[['H',Math.round(v[0])],['S',Math.round(v[1]*100)],['B',Math.round(v[2]*100)]];
  return '<div class="pback" id="popback"><div class="pop" role="dialog" aria-modal="true" aria-label="Pick a color" id="pop"><div class="ph"><h4>Pick a color</h4><button type="button" class="btn" data-act="popclose">Done</button></div>'
  +'<div class="presets" role="group" aria-label="Preset colours">'+P.map(function(p){return '<button type="button" class="ps" data-act="preset" data-v="'+p+'" style="background:'+p+'" aria-label="Preset '+p+'" aria-pressed="'+(p===cur)+'"></button>'}).join('')+'</div>'
  +'<div class="area" id="area" tabindex="0" role="slider" aria-label="Saturation and brightness" aria-valuetext="Saturation '+Math.round(v[1]*100)+' percent, brightness '+Math.round(v[2]*100)+' percent" style="background:hsl('+Math.round(v[0])+',100%,50%)"><div class="gw"></div><div class="gb"></div><div class="th" style="left:'+(v[1]*100)+'%;top:'+((1-v[2])*100)+'%;background:'+cur+'"></div></div>'
  +'<div><div class="hrow"><label for="huei">Hue</label><output id="hueo">'+Math.round(v[0])+'</output></div><input type="range" class="hue" id="huei" min="0" max="360" value="'+Math.round(v[0])+'" aria-label="Hue"></div>'
  +'<label class="ff"><i style="background:'+cur+'"></i><span class="sr">Hex code</span><input type="text" id="pophex" value="'+cur.toUpperCase()+'" maxlength="7" aria-label="Hex code"></label>'
  +'<details class="rev"><summary>More options</summary><div class="seg" role="group" aria-label="Colour model" style="margin:6px 0">'+['hsl','hsb','rgb'].map(function(m){return '<button type="button" data-act="mode" data-v="'+m+'" aria-pressed="'+(CUR.mode===m)+'">'+m.toUpperCase()+'</button>'}).join('')+'</div><div class="chan">'+ch.map(function(c,i){return '<label>'+c[0]+'<input type="text" inputmode="numeric" data-chan="'+i+'" value="'+c[1]+'" aria-label="'+c[0]+' channel"></label>'}).join('')+'</div></details>'
  +'<p class="sm">This colour moves into the steps above. You can still pick its name feel, how much you like it and your first choice there.</p></div></div>'}
/* ---------- preview ---------- */
function pack(fi){var l=visList(fi),sc=[],cur=null,w=0,cnt=0;l.forEach(function(q){var wt=q.type==='notice'?0:(/cards|check|colours|upload|motion/.test(q.type)?2:1);
  if(!cur||(!q.parent&&q.type!=='notice'&&((w+wt>5&&w>0)||cnt>=4))){cur=[];sc.push(cur);w=0;cnt=0}cur.push(q);w+=wt;if(!q.parent&&q.type!=='notice')cnt++});return sc}
function qHtml(q,rv){var fi=FI,f=CFG.flows[fi],tags='';
  if(q.type!=='notice')tags='<span class="tag '+(q.req?'req':'optl')+'">'+(q.req?'Required':'Optional')+'</span>';
  var h='<div class="q'+(q.parent?' child':'')+(rv?' rv':'')+'" data-qid="'+q.id+'">';
  if(q.type!=='notice'&&q.type!=='reveal')h+='<div class="ql"><span id="l-'+q.id+'">'+esc(q.label)+'</span>'+tags+'</div>';
  if(q.hint)h+='<p class="hint">'+esc(q.hint)+'</p>';
  if(q.scope)h+='<div class="notice"><b>Good to know.</b> '+esc(q.scope)+'</div>';
  h+=ctl(q);
  if(q.unsure&&q.type!=='notice')h+='<button type="button" class="unsure" data-act="unsure" data-q="'+q.id+'" aria-pressed="'+(!!U[q.id])+'">'+(U[q.id]?'Marked: '+UN+'. Tap to undo.':UN)+'</button>';
  return h+'</div>'}
function renderPreview(){var fi=FI,f=CFG.flows[fi],sc=pack(fi),n=sc.length;if(SCR>n)SCR=n;
  var pv=visList(fi),cur={};pv.forEach(function(q){cur[q.id]=1});
  var body;
  if(SCR===n){body=reviewHtml(true)}
  else{body=sc[SCR].map(function(q){return qHtml(q,!prevVis[q.id])}).join('')}
  var min=minutes(fi),qs=pv.filter(function(q){return q.type!=='notice'}),done=qs.filter(answered).length;
  $('#pbody').innerHTML=body;
  $('#pmeta').innerHTML='<span>'+(SCR===n?'Review':'Screen '+(SCR+1)+' of '+n)+'</span><span>'+(min?'About '+min+' min left':'Ready to review')+'</span>';
  $('#pbar').style.transform='scaleX('+(qs.length?done/qs.length:0)+')';
  $('#pbarw').setAttribute('aria-valuenow',Math.round((qs.length?done/qs.length:0)*100));
  $('#pbarw').setAttribute('aria-label','Progress, '+done+' of '+qs.length+' answered');
  $('#pback').disabled=SCR===0;$('#pnext').textContent=SCR===n-1?'Review':SCR===n?'Back to start':'Next';
  $('#pnext').dataset.last=SCR===n?'1':'';
  prevVis=cur;watchCards();$('#pbody').scrollTop=0}
function watchCards(){if(!window.IntersectionObserver)return;var io=window.__io||(window.__io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('off',!e.isIntersecting)})}));$$('.card.anim').forEach(function(c){io.observe(c)})}
/* ---------- studio, review ---------- */
function studioData(){var fi=FI,pts=0,facts=[],risks=[],adv=[],need=[],contrib=[];
  visList(fi).forEach(function(q){if(q.type==='notice')return;
    if(U[q.id]&&empty(q))adv.push(q.label);
    if(!empty(q)){var n=q.note?q.note(A):undefined;if(n!==null){facts.push(n===undefined?(q.short||q.label)+': '+ansText(q):n)}
      if(q.pts){var p=q.pts(A);if(p){pts+=p.n;contrib.push(p.t+' '+(p.n>0?'+':'')+p.n)}}
      if(q.risk){var r=q.risk(A);if(r)risks=risks.concat(r)}}
    if(q.req&&!answered(q))need.push(q.label)});
  var band=CFG.bands.filter(function(b){return pts<=b.max})[0]||CFG.bands[CFG.bands.length-1];
  return {pts:pts,band:band.t,facts:facts,risks:risks,adv:adv,need:need,contrib:contrib}}
function renderStudio(){var d=studioData(),f=CFG.flows[FI];var has=d.facts.length||d.contrib.length;
  var h='<h3>What the studio sees</h3><p class="sm">Built only from the answers picked in the preview. Nothing here is guessed. The client never sees this panel.</p>';
  if(!has&&!d.adv.length){h+='<p style="margin-top:10px">Nothing picked yet. Pick something in the preview and this note fills in.</p>';$('#studio').innerHTML=h;return}
  h+='<div class="sgrid" style="margin-top:12px"><div class="srow"><span class="kv">Size and complexity</span><span class="big">'+esc(d.pts?d.band:'Not enough picked yet')+'</span><span class="sm">Score '+d.pts+'. '+esc(CFG.sizeRule)+'</span>'+(d.contrib.length?'<span class="sm">Adds up from: '+esc(d.contrib.join(', '))+'.</span>':'')+'</div>';
  h+='<div class="srow"><span class="kv">Flow</span><b>'+esc(f.name)+'</b><span class="sm">'+esc(f.studioNote||'')+'</span></div></div>';
  h+='<h3 style="margin-top:14px">Scope note</h3><ul>'+(d.facts.length?d.facts.map(function(x){return '<li>'+esc(x)+'</li>'}).join(''):'<li>No answers yet.</li>')+'</ul>';
  h+='<h3 style="margin-top:14px">Risks</h3><ul>'+(d.risks.length?d.risks.map(function(x){return '<li>'+esc(x)+'</li>'}).join(''):'<li>None raised by the picks so far.</li>')+'</ul>';
  if(d.adv.length)h+='<h3 style="margin-top:14px">Asked the studio to advise on</h3><ul>'+d.adv.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>';
  if(d.need.length)h+='<h3 style="margin-top:14px">Still needed</h3><ul>'+d.need.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>';
  if(CFG.extra){var e=CFG.extra(A,{sortColours:sortColours,colLine:colLine,esc:esc});if(e)h+=e}
  $('#studio').innerHTML=h}
function reviewHtml(inPhone){var fi=FI,rows='',need=[];
  visList(fi).forEach(function(q){if(q.type==='notice')return;if(q.req&&!answered(q))need.push(q);if(!answered(q))return;
    var sc=pack(fi),si=0;sc.forEach(function(s,i){if(s.indexOf(q)>-1)si=i});
    rows+='<div class="rrow"><span class="kv">'+esc(q.label)+'</span><b>'+esc(ansText(q))+'</b>'+(inPhone?'<a href="#" data-act="goto" data-s="'+si+'">Change</a>':'')+'</div>'});
  var h='<div class="review"><h3>Here is what we heard</h3><p class="sm">Check it over. Tap Change to fix anything.</p>'+(rows||'<p>No answers yet.</p>')+'</div>';
  if(need.length)h+='<div class="notice"><b>Still needed before you can send.</b><ul>'+need.map(function(q){return '<li>'+esc(q.label)+'</li>'}).join('')+'</ul></div>';
  h+='<div class="review"><h3>What happens next</h3><ul>'+CFG.next.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div>';
  if(inPhone)h+='<div class="notice">The agreement section comes after this screen. See the section further down this page.</div>';
  return h}
function renderReview(){$('#review').innerHTML=reviewHtml(false)}
/* ---------- engagement ---------- */
var HEAD=[
['What the engagement covers, and what it does not','This engagement covers only the work you picked in this form and in your quote. Anything not listed is not included. New work is quoted separately.'],
['What you must provide, and when','You give us the material and answers we ask for, on time. Late or missing material moves the dates.'],
['Revisions and changes','Your quote says how many rounds of changes are included. Work outside that, or new scope, goes through a change request. We price it and you approve it before we start.'],
['Timelines depend on you','Dates depend on how fast you give feedback and approvals. When we wait on you, the dates move.'],
['Fees, deposits and third party costs','Fees and any deposit are set out in your quote. Third party costs are yours to pay, such as platforms, stores, ad spend and tools. We tell you before they apply.'],
['Ownership','Ownership of the finished work passes to you after full payment. The studio keeps the right to show the work in its portfolio.'],
['What you promise about what you supply','You promise that you own, or have the right to use, everything you give us. That includes logos, images, fonts, music, text and data.'],
['Cover for claims about your material','You cover the studio against claims that come from material you supply or instructions you give us.'],
['No guarantees of results','We work with care. We cannot promise results, such as rankings, traffic, sales, ad performance or app store approval.'],
['Changes by other companies','Platforms and stores can change their rules, such as Google, Meta, app stores and payment providers. The studio is not liable for those changes.'],
['Limit of liability','The studio limits its liability as set out in your quote and agreement. The law does not allow a limit in some cases, such as fraud, and those cases stay unlimited. Limit to be set by the studio lawyer.'],
['Your customers’ data','You are responsible for using your customers’ data lawfully. Tell us what data we will handle.'],
['Ending the engagement, law and disputes','Either side can end the engagement by written notice. You pay for work done up to that date. Nigerian law applies. We try to settle a dispute by talking first. The steps after that are to be set by the studio lawyer.']];
function renderEng(){var E=CFG.eng,h='<div class="ban"><div><span class="tag draft">DRAFT</span> <span class="tag draft">NOT LEGAL ADVICE</span> <span class="tag navy">Behind a flag</span></div><p><b>This text is a draft by the studio team. It is not legal advice.</b> It stays off in the live form until a qualified Nigerian lawyer has reviewed and fitted it to Nigerian law and to the signed agreement. A ticked box may carry less weight than a signed agreement.</p><p class="sm">Flag state in the live form: OFF. The sections below are shown here so the owner and the lawyer can read them.</p></div><div class="eng">';
  HEAD.forEach(function(x,i){var n=i+1,txt=(E.over&&E.over[n])||x[1],ex=(E.extra&&E.extra[n])||[];
    h+='<div class="eh"><h3>'+n+'. '+esc(x[0])+'</h3><p>'+esc(txt)+'</p>'+(ex.length?'<div class="svc"><span class="kv">Specific to '+esc(CFG.shortName)+'</span><ul>'+ex.map(function(e){return '<li>'+esc(e)+'</li>'}).join('')+'</ul></div>':'')+'<label class="ack"><input type="checkbox" data-ack="'+n+'"> I have read and accept section '+n+'</label></div>'});
  h+='</div><div class="panel wide"><label for="fullname"><b>Type your full name to accept</b></label><input type="text" id="fullname" autocomplete="off" placeholder="First and last name"><button type="button" class="btn" id="accept" aria-disabled="true">Accept and send</button><p class="sm" id="acc-note" aria-live="polite">Tick all 13 sections and type your full name.</p><div class="code" id="rec" hidden></div></div>';
  $('#eng').innerHTML=h}
function updEng(){var ticks=$$('[data-ack]:checked').length,nm=($('#fullname').value||'').trim(),ok=ticks===13&&nm.split(/\s+/).length>=2;
  $('#accept').setAttribute('aria-disabled',ok?'false':'true');$('#acc-note').textContent=ok?'Ready. In the live form this stores the text version, the date and time, the ticks and the answers.':'Ticked '+ticks+' of 13'+(nm.split(/\s+/).length<2?'. Type your first and last name.':'.')}
/* ---------- orchestration ---------- */
function renderTabs(){$('#tabs').innerHTML=CFG.flows.map(function(f,i){return '<button type="button" role="tab" class="tab" id="tab'+i+'" aria-selected="'+(i===FI)+'" aria-controls="work" data-act="flow" data-i="'+i+'"><strong>'+(i+1)+'. '+esc(f.name)+'</strong><span>'+esc(f.short)+'</span><span><b>About '+Math.max(minutes(i),1)+' min</b> at the picks in the preview</span></button>'}).join('');
  var f=CFG.flows[FI];$('#flowinfo').innerHTML='<p><b>'+esc(f.name)+'.</b> '+esc(f.blurb)+'</p><p class="sm"><b>Best for:</b> '+esc(f.best)+'</p>'}
function all(light){renderTabs();renderTable();renderStudio();renderReview();if(!light)renderPreview();else{var n=pack(FI).length;var qs=visList(FI).filter(function(q){return q.type!=='notice'}),d=qs.filter(answered).length;$('#pbar').style.transform='scaleX('+(qs.length?d/qs.length:0)+')';var m=minutes(FI);$('#pmeta').lastChild.textContent=m?'About '+m+' min left':'Ready to review'}}
function sig(){return visList(FI).map(function(q){return q.id}).join()}
function change(full){if(full)renderPreview();all(!full)}
function setAns(id,v){if(v===''||v==null||(Array.isArray(v)&&!v.length))delete A[id];else A[id]=v;if(!empty(QM[id]))delete U[id]}
function focusKeep(fn){var a=document.activeElement,id=a&&a.id;fn();if(id){var e=document.getElementById(id);if(e&&e!==document.activeElement)e.focus({preventScroll:true})}}
function refresh(){focusKeep(function(){var keep=$('#pbody').scrollTop;renderPreview();$('#pbody').scrollTop=keep;renderTabs();renderTable();renderStudio();renderReview()})}
document.addEventListener('input',function(e){var t=e.target,id=t.dataset&&t.dataset.in;
  if(id){setAns(id,t.value);var before=sig();if(before!==window.__sig){window.__sig=before;refresh()}else all(true);return}
  if(t.dataset.srch){var s=t.value.toLowerCase().trim(),n=0;$$('#l-'+t.dataset.srch+' label.opt').forEach(function(l){var m=!s||l.dataset.txt.indexOf(s)>-1;l.hidden=!m;if(m)n++});$$('#l-'+t.dataset.srch+' .chkg').forEach(function(g){g.hidden=!$$('label.opt',g).some(function(l){return !l.hidden})});$('#nm-'+t.dataset.srch).hidden=n>0;return}
  if(t.id==='shade'){CUR.shade=+t.value;CUR.hex=null;CUR.hsv=null;updCur();return}
  if(t.id==='hexin'){var v=t.value.trim();if(/^#?[0-9a-f]{6}$/i.test(v)){CUR.hex=(v[0]==='#'?v:'#'+v).toLowerCase();CUR.hsv=null;updCur(true)}return}
  if(t.dataset.like!=null){var i=+t.dataset.like;A.colours[i].like=+t.value;$('#lkt'+i).textContent=LIKE[t.value-1];t.setAttribute('aria-valuetext',LIKE[t.value-1]);all(true);return}
  if(t.id==='huei'){var hv=CUR.hsv||r2hsv(h2r(CUR.hex||famHex(CUR.fam,CUR.shade)));CUR.hsv=[+t.value,hv[1],hv[2]];setHsv();return}
  if(t.id==='pophex'){var vv=t.value.trim();if(/^#?[0-9a-f]{6}$/i.test(vv)){CUR.hex=(vv[0]==='#'?vv:'#'+vv).toLowerCase();CUR.hsv=null;updCur(true,true)}return}
  if(t.dataset.chan!=null)return;
  if(t.id==='fullname')updEng()});
function updCur(hexTyped,pop){var cur=CUR.hex||famHex(CUR.fam,CUR.shade),nm=colName(cur);$('#curname').textContent=nm;$('#curhex').textContent=cur.toUpperCase();var sw=$('#cw .cur .sw');if(sw)sw.style.background=cur;var tr=$('#cw .ptrig i');if(tr)tr.style.background=cur;var sh=$('#shade');if(sh)sh.setAttribute('aria-valuetext',nm);
  if(!hexTyped)$$('#cw .fam').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===CUR.fam&&!CUR.hex))});else $$('#cw .fam').forEach(function(b){b.setAttribute('aria-pressed','false')});
  if(CUR.pop&&!pop)refreshPop()}
function setHsv(){var v=CUR.hsv;CUR.hex=r2h(hsv2r(v[0],v[1],v[2]));var r=h2r(CUR.hex);var a=$('#area');if(a){a.style.background='hsl('+Math.round(v[0])+',100%,50%)';var th=$('.th',a);th.style.left=v[1]*100+'%';th.style.top=(1-v[2])*100+'%';th.style.background=CUR.hex;a.setAttribute('aria-valuetext','Saturation '+Math.round(v[1]*100)+' percent, brightness '+Math.round(v[2]*100)+' percent')}
  $('#hueo').textContent=Math.round(v[0]);$('#pophex').value=CUR.hex.toUpperCase();var i=$('.ff i');if(i)i.style.background=CUR.hex;$$('.ps').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===CUR.hex))});updCur(true,true)}
function refreshPop(){var p=$('#popback');if(!p)return;var keep=document.activeElement&&document.activeElement.id;var scr=$('#pop').scrollTop;p.outerHTML=popHtml();$('#pop').scrollTop=scr;if(keep){var e=document.getElementById(keep);if(e)e.focus({preventScroll:true})}}
function openPop(){CUR.pop=true;CUR.hsv=null;var d=document.createElement('div');d.innerHTML=popHtml();document.body.appendChild(d.firstChild);sizePop();var x=$('#area');x.focus();CUR.opener=document.activeElement}
function closePop(){CUR.pop=false;var p=$('#popback');if(p)p.remove();updCur(true);var b=$('#cw .ptrig');if(b)b.focus()}
function sizePop(){var vv=window.visualViewport;document.documentElement.style.setProperty('--vvh',(vv?vv.height:window.innerHeight)+'px')}
if(window.visualViewport)window.visualViewport.addEventListener('resize',sizePop);
document.addEventListener('change',function(e){var t=e.target,d=t.dataset;
  if(d.ch){setAns(d.ch,d.v);refresh();return}
  if(d.mu){var cur=(A[d.mu]||[]).slice(),i=cur.indexOf(d.v);if(t.checked&&i<0)cur.push(d.v);if(!t.checked&&i>-1)cur.splice(i,1);setAns(d.mu,cur);
    if(QM[d.mu].type==='check'){var p=$('#p-'+d.mu);p.innerHTML=cur.length?cur.map(function(x){return '<span class="tag req">'+esc(x)+'</span>'}).join(''):'<span class="sm">Nothing picked yet.</span>';all(true)}else refresh();return}
  if(d.up){setAns(d.up,Array.prototype.slice.call(t.files).map(function(f){return f.name}));refresh();return}
  if(d.first!=null){A.colours.forEach(function(c,i){c.first=i===+d.first});all(true);return}
  if(d.ack||t.dataset.ack)updEng()});
document.addEventListener('click',function(e){var t=e.target.closest('[data-act]');if(!t){if(e.target.id==='popback')closePop();return}var a=t.dataset.act;
  if(a==='flow'){FI=+t.dataset.i;SCR=0;prevVis={};window.__sig=sig();all();return}
  if(a==='unsure'){var id=t.dataset.q;if(U[id])delete U[id];else U[id]=true;refresh();return}
  if(a==='goto'){e.preventDefault();SCR=+t.dataset.s;renderPreview();return}
  if(a==='fam'){CUR.fam=t.dataset.v;CUR.hex=null;CUR.hsv=null;$('#shade').value=CUR.shade;updCur();return}
  if(a==='addcol'){var hex=CUR.hex||famHex(CUR.fam,CUR.shade);var l=(A.colours||[]).slice();if(l.length>=5||l.some(function(c){return c.hex===hex}))return;l.push({hex:hex,name:colName(hex),like:3,first:!l.length});A.colours=l;CUR.open=true;refresh();return}
  if(a==='rmcol'){var l2=A.colours.slice();var rm=l2.splice(+t.dataset.i,1)[0];if(rm.first&&l2.length)l2[0].first=true;setAns('colours',l2);CUR.open=true;refresh();return}
  if(a==='pop'){openPop();return}
  if(a==='popclose'){closePop();return}
  if(a==='preset'){CUR.hex=t.dataset.v;CUR.hsv=null;CUR.hsv=r2hsv(h2r(CUR.hex));setHsv();return}
  if(a==='mode'){CUR.mode=t.dataset.v;refreshPop();return}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&CUR.pop){closePop();return}
  if(e.target.id==='area'){var v=(CUR.hsv||r2hsv(h2r(CUR.hex||famHex(CUR.fam,CUR.shade)))).slice(),st=e.shiftKey?.1:.02,k=e.key;
    if(k==='ArrowRight')v[1]=Math.min(1,v[1]+st);else if(k==='ArrowLeft')v[1]=Math.max(0,v[1]-st);else if(k==='ArrowUp')v[2]=Math.min(1,v[2]+st);else if(k==='ArrowDown')v[2]=Math.max(0,v[2]-st);else return;e.preventDefault();CUR.hsv=v;setHsv()}
  if(CUR.pop&&e.key==='Tab'){var f=$$('#pop button,#pop input,#pop [tabindex="0"],#pop summary').filter(function(x){return x.offsetParent});var i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}
  if(e.target.dataset&&e.target.dataset.chan!=null&&e.key==='Enter'){applyChan()}});
document.addEventListener('focusout',function(e){if(e.target.dataset&&e.target.dataset.chan!=null)applyChan()});
function applyChan(){var v=$$('[data-chan]').map(function(x){return parseFloat(x.value)||0}),m=CUR.mode,r;if(m==='rgb')r=v;else if(m==='hsl'){r=h2r(hsl2h(v[0],v[1]/100,v[2]/100))}else{r=hsv2r(v[0],Math.min(1,v[1]/100),Math.min(1,v[2]/100))}
  CUR.hex=r2h(r);CUR.hsv=r2hsv(h2r(CUR.hex));if(m==='hsb')CUR.hsv=[v[0],Math.min(1,v[1]/100),Math.min(1,v[2]/100)];setHsv()}
(function(){var p=false,a;document.addEventListener('pointerdown',function(e){a=e.target.closest&&e.target.closest('#area');if(!a)return;p=true;a.setPointerCapture&&a.setPointerCapture(e.pointerId);mv(e);a.focus()});
  document.addEventListener('pointermove',function(e){if(p)mv(e)});document.addEventListener('pointerup',function(){p=false});
  function mv(e){var r=a.getBoundingClientRect(),s=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),v=Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height)),hv=CUR.hsv||r2hsv(h2r(CUR.hex||famHex(CUR.fam,CUR.shade)));CUR.hsv=[hv[0],s,v];setHsv()}})();
$('#accept')&&0;
document.getElementById('app').addEventListener('click',function(e){var t=e.target;if(t.id==='accept'){if(t.getAttribute('aria-disabled')==='true')return;var n=$('#fullname').value.trim();var r=$('#rec');r.hidden=false;r.textContent='PREVIEW ONLY. Nothing was sent. The live record would hold: text version "'+CFG.shortName+' engagement draft 0", accepted by "'+n+'", on '+new Date().toUTCString()+', with 13 section ticks and the form answers.'}
  if(t.id==='pnext'){var n2=pack(FI).length;if(t.dataset.last){SCR=0}else SCR=Math.min(SCR+1,n2);renderPreview()}
  if(t.id==='pback'&&SCR>0){SCR--;renderPreview()}
  if(t.id==='clear'){A={};U={};CUR.open=false;SCR=0;prevVis={};window.__sig=sig();all()}
  if(t.id==='fill'){A=JSON.parse(JSON.stringify(Object.assign({},CFG.defaults,CFG.sample)));U=Object.assign({},CFG.sampleU||{});SCR=0;prevVis={};window.__sig=sig();all()}
  if(t.id==='theme'){var d=document.documentElement,c=d.getAttribute('data-theme');var nx=c==='dark'?'light':c==='light'?'':'dark';if(nx)d.setAttribute('data-theme',nx);else d.removeAttribute('data-theme');t.textContent='Theme: '+(nx||'system');try{localStorage.setItem('wdc-theme',nx)}catch(_){}}});
/* ---------- page shell ---------- */
$('#app').innerHTML=
'<header class="band"><div class="wrap"><div class="top"><span class="eyebrow">Onboarding redesign, '+esc(CFG.shortName)+'</span><button type="button" class="btn" id="theme">Theme: system</button></div><h1>'+esc(CFG.h1)+'</h1><p class="lede">'+esc(CFG.lede)+'</p></div></header>'
+'<main class="wrap"><div class="sec-h"><span class="eyebrow">Three ways to run it</span><h2>Pick a flow</h2><p>The owner picks one flow for this service. Every question below is listed in full, with its condition. The phone preview works for real. Tap the choices and watch the follow up questions appear and disappear.</p></div>'
+'<div class="tabs" id="tabs" role="tablist" aria-label="Flow"></div><div class="flowinfo" id="flowinfo"></div>'
+'<div class="panel" style="margin-top:14px"><b>Preview notes.</b> '+esc(CFG.previewNote)+' <span class="sm">Sample picks are pre-set so branching is visible. Press Clear to start empty, or Fill example to load a full example.</span><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn sec" id="clear">Clear</button><button type="button" class="btn" id="fill">Fill example</button></div></div>'
+'<div class="work" id="work" style="margin-top:22px"><div class="stick"><div class="phone" aria-label="Phone preview of the form"><div class="phead"><div class="pmeta" id="pmeta"><span></span><span></span></div><div class="bar" id="pbarw" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i id="pbar"></i></div></div><div class="pbody" id="pbody" data-lenis-prevent></div><div class="pfoot"><button type="button" class="btn sec" id="pback">Back</button><button type="button" class="btn" id="pnext">Next</button></div></div></div>'
+'<div class="right"><div class="panel studio" id="studio"></div>'
+'<div class="sec-h"><span class="eyebrow">Every question, in order</span><h2>Question map</h2><p id="tcount"></p></div><div class="tw" role="region" aria-label="All questions" tabindex="0"><table><thead><tr><th scope="col">Question</th><th scope="col">Input</th><th scope="col">Tag</th><th scope="col">Shows when</th><th scope="col">Stored key</th><th scope="col">Not sure wording</th><th scope="col">Now</th></tr></thead><tbody id="tbody"></tbody></table></div>'
+'<div class="sec-h"><span class="eyebrow">Last screen</span><h2>Review screen</h2><p>Live from the picks. The same screen ends the phone preview.</p></div><div class="panel" id="review"></div></div></div>'
+'<div class="sec-h"><span class="eyebrow">Before submit</span><h2>Engagement section</h2><p>Thirteen shared headings plus the items for this service. One tick per section and a typed full name.</p></div><div id="eng"></div>'
+'<div class="sec-h"><span class="eyebrow">For the owner</span><h2>Decisions for the owner</h2></div><ol class="dec" id="dec">'+CFG.decisions.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ol><footer class="sm">Preview only. Nothing on this page is sent or stored. Samples are real WDC work from the public site.</footer></main>';
try{var th=localStorage.getItem('wdc-theme');if(th){document.documentElement.setAttribute('data-theme',th);$('#theme').textContent='Theme: '+th}}catch(_){}
A=JSON.parse(JSON.stringify(CFG.defaults||{}));window.__sig=sig();renderEng();all();
window.__wdc={get A(){return A},set A(v){A=v},get FI(){return FI},refresh:refresh,visList:visList,Q:Q,CFG:CFG};
})();
