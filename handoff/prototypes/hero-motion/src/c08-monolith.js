/* 08 ONE OBJECT: every service, one liquid-chrome form, raymarched in WebGL. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  let gl, prog, loc = {}, cap, scaleF = 1, slow = 0;
  const lin = h => U.hex(h).map(v => v / 255);
  const NAMES = ['Identity', 'Apps', 'Packaging', 'Social', 'Web'];
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision highp float;
uniform vec2 uRes;uniform float uT,uS,uReveal,uCore,uLight;uniform mat3 uRot;uniform vec3 uKey,uG0,uG1;
float sdRB(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float w(float i){float d=abs(uS-i);d=min(d,abs(uS-i-5.));d=min(d,abs(uS-i+5.));return clamp(1.-d,0.,1.);}
float map(vec3 p){
  p=uRot*p;
  float d=0.;
  float w0=w(0.),w1=w(1.),w2=w(2.),w3=w(3.),w4=w(4.);
  float sw=w0+w1+w2+w3+w4;
  if(w0>0.){float rip=.035*sin(4.*p.x+uT*1.3)*sin(4.3*p.y-uT*1.1)*sin(3.7*p.z+uT*.9);d+=w0*(length(p)-.9+rip);}
  if(w1>0.)d+=w1*sdRB(p,vec3(.5,.98,.075),.075);
  if(w2>0.)d+=w2*sdRB(p,vec3(.64,.64,.64),.09);
  if(w3>0.){vec2 q=vec2(length(p.xy)-.7,p.z);d+=w3*(length(q)-.27);}
  if(w4>0.){vec3 g=p*4.2;float gy=abs(dot(sin(g),cos(g.zxy)))/4.2-.03;d+=w4*max(length(p)-.98,gy*.9);}
  return d/sw;
}
vec3 nrm(vec3 p){vec2 e=vec2(.0012,-.0012);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
/* night studio: navy cyc, softboxes, an orange kicker, and a broad fill from behind the camera so no angle goes black */
vec3 envD(vec3 r){
  vec3 c=mix(vec3(.02,.02,.09),vec3(.06,.06,.32),smoothstep(-.6,.8,r.y));
  c+=vec3(.9,.92,1.)*exp(-abs(r.y-.08)*28.)*.4*uReveal;
  float k=dot(r,normalize(uKey));
  c+=vec3(1.)*smoothstep(.88,.975,k)*3.4*uReveal;
  c+=vec3(.85,.88,1.)*smoothstep(.07,.0,abs(r.x-.62))*smoothstep(-.3,.4,r.y)*1.6*uReveal;
  c+=vec3(.85,.88,1.)*smoothstep(.05,.0,abs(r.x+.7))*smoothstep(0.,.6,r.y)*.9*uReveal;
  c+=vec3(1.)*smoothstep(.97,.995,dot(r,normalize(vec3(-.8,.5,.4))))*1.2*uReveal;
  c+=vec3(1.,.36,0.)*smoothstep(.72,.97,dot(r,normalize(vec3(.9,-.15,-.6))))*2.0;
  c+=vec3(1.,.4,.05)*smoothstep(.55,1.,-r.y)*.35*uCore;
  c+=vec3(.22,.24,.55)*smoothstep(-.3,1.,r.z)*uReveal;
  return c;
}
/* day studio: pale cyc with dark flags and a dark floor, so chrome still has edges on paper */
vec3 envL(vec3 r){
  vec3 c=mix(vec3(.62,.62,.68),vec3(1.,1.,1.02),smoothstep(-.35,.7,r.y));
  c-=vec3(.55,.55,.5)*smoothstep(.1,.0,abs(r.x-.38))*smoothstep(-.2,.5,r.y);
  c-=vec3(.5,.5,.42)*smoothstep(.09,.0,abs(r.x+.62))*smoothstep(-.1,.6,r.y);
  c=mix(c,vec3(.06,.06,.22),smoothstep(-.05,-.55,r.y));
  float k=dot(r,normalize(uKey));
  c+=vec3(1.)*smoothstep(.9,.975,k)*1.6*uReveal;
  c+=vec3(1.,.4,0.)*smoothstep(.72,.97,dot(r,normalize(vec3(.9,-.15,-.6))))*1.3;
  c+=vec3(1.,.42,.05)*smoothstep(.6,1.,-r.y)*.25*uCore;
  return c;
}
vec3 envX(vec3 r){return uLight>.5?envL(r):envD(r);}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/min(uRes.x*1.12,uRes.y);
  vec3 ro=vec3(0.,0.,3.4),rd=normalize(vec3(uv,-1.3));
  float t=0.,md=9.;int hit=0;
  for(int i=0;i<96;i++){vec3 p=ro+rd*t;float d=map(p);md=min(md,d);if(d<.0008){hit=1;break;}t+=d*.8;if(t>7.)break;}
  /* the ground, matched to the page's shared radial ground */
  vec2 fc=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float gd=clamp(length(fc-vec2(.5,.46)*uRes)/(length(uRes)*.62),0.,1.);
  vec3 bg=mix(uG0,uG1,gd);
  float halo=exp(-md*9.)*.35*uReveal;
  if(hit==0){
    vec3 hc=uLight>.5?vec3(-.06,-.06,-.02):vec3(.1,.1,.4);
    gl_FragColor=vec4(bg+hc*halo+vec3(1.,.35,0.)*.05*uCore*smoothstep(.9,0.,length(uv-vec2(0.,-.55)))*(1.-uLight),1.);return;
  }
  vec3 p=ro+rd*t,n=nrm(p),r=reflect(rd,n);
  float fr=pow(1.-max(dot(n,-rd),0.),4.);
  vec3 c;
  c.r=envX(normalize(r+n*.035)).r;c.g=envX(r).g;c.b=envX(normalize(r-n*.035)).b;
  c*=mix(uLight>.5?.8:.62,1.,fr);
  c+=uLight>.5?vec3(.02,.02,.05):vec3(.03,.03,.1);
  /* rim: a white edge on the key side, orange on the other, so the silhouette always reads */
  float side=smoothstep(-.4,.4,dot(n,normalize(vec3(uKey.x,0.,uKey.z))));
  vec3 rim=mix(vec3(1.,.45,.08),vec3(.95,.97,1.),side);
  c+=rim*pow(fr,1.6)*(uLight>.5?.45:.75)*uReveal;
  c+=vec3(1.,.4,.05)*fr*.2*uCore;
  vec3 col;
  if(uLight>.5){col=c/(1.+c*.35);col=pow(col,vec3(.95));}
  else{col=1.-exp(-c*1.5);col=pow(col,vec3(.88));}
  gl_FragColor=vec4(col,1.);
}`;
  function shapeAt(t) {
    const ends = [2.6, 4.4, 6.2, 8.0, 9.8];
    if (t < 10.6) {
      for (let i = 0; i < 5; i++) { if (t < ends[i]) return i; if (t < ends[i] + .8) return i + E.inOutCubic(seg(t, ends[i], ends[i] + .8)); }
      return 5;
    }
    const cyc = 3.4, k = (t - 10.6) / cyc, n = Math.floor(k), f = k - n;
    return (n + E.inOutCubic(seg(f, .72, 1))) % 5;
  }
  function rot(yaw, pitch, roll) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const Ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy], Rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp], Rz = [cr, sr, 0, -sr, cr, 0, 0, 0, 1];
    const mul = (a, b) => { const o = []; for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2]; return o; };
    return mul(Rz, mul(Rx, Ry));
  }
  /* one program per WebGL context: each stage has its own canvas */
  function setup(env) {
    gl = env.getGL(); if (!gl) return;
    if (env._oo) { prog = env._oo.prog; loc = env._oo.loc; return; }
    loc = {};
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const n of ['uRes', 'uT', 'uS', 'uReveal', 'uCore', 'uRot', 'uKey', 'uLight', 'uG0', 'uG1']) loc[n] = gl.getUniformLocation(prog, n);
    loc.p = gl.getAttribLocation(prog, 'p');
    env._oo = { prog, loc, buf: b };
  }

  return {
    name: 'One Object', service: 'Every service, in one form', short: 'Every service', cue: 2.3, focus: [.5, .5],
    fix: 'No longer goes dark at some angles: the night studio gained a broad fill from behind the camera, the floor of the ambient term was raised, and a rim light (white on the key side, orange on the other) traces the silhouette at every angle. New day studio for the light ground, with dark flags so chrome keeps its edges on paper. The background is computed from the same radial ground as every other piece, so it hands off without a seam.',
    pitch: 'A single object of liquid chrome, lit like a product film, becomes each thing the studio makes: a mark, a phone, a box, a loop, a lattice, and back to a drop. The camera changes angle on every cut, so it plays like a reel of one subject.',
    tech: 'Raw WebGL, one fragment shader: a raymarched signed-distance field that blends five shapes by weight, reflecting a procedural studio (softbox, horizon line, orange rim). Per-channel reflection offsets give a whisper of chromatic dispersion. Resolution adapts to frame time and devicePixelRatio is capped.',
    duration: 10.6, stillT: 7.6, kind: 'gl',
    glScale(env) { const px = env.W * env.H; return Math.min(env.dpr, Math.sqrt(1.0e6 / px)) * scaleF; },
    beats: [['0.0 s', 'Only an orange rim in the dark; the key light swings round and finds a liquid drop.'], ['2.6 s', 'The drop draws itself up into a slab: apps.'], ['4.4 s', 'The slab thickens into a box: packaging.'], ['6.2 s', 'The box opens into a ring: social, the loop.'], ['8.0 s', 'The ring becomes a lattice sphere: the web.'], ['9.8 s', 'The lattice heals back into the drop.'], ['10.6 s', 'Idle: it keeps changing every few seconds; the pointer turns it and moves the key light.']],
    activate(env) {
      setup(env);
      env.layer.innerHTML = '<div style="position:absolute;left:20px;bottom:24px;font:500 12px \'Space Grotesk\',sans-serif;letter-spacing:.14em;text-transform:uppercase;display:flex;gap:10px;align-items:center"><span></span><span></span></div>';
      cap = env.layer.firstChild;
    },
    init() {},
    reset() { slow = 0; },
    frame(t, dt, env) {
      setup(env); if (!gl || !prog) return;
      const { ptr, cvgl } = env;
      if (env._oo.buf) gl.bindBuffer(gl.ARRAY_BUFFER, env._oo.buf);
      const T = U.P(env);
      if (dt > 0) { slow = lerp(slow, dt, .05); if (slow > 1 / 28 && scaleF > .5) { scaleF *= .85; slow = 1 / 60; const s = this.glScale(env); cvgl.width = Math.round(env.W * s); cvgl.height = Math.round(env.H * s); } }
      const s = shapeAt(t);
      const idle = ss(10, 11.5, t);
      const yaw = t * .35 + s * 1.1 + ptr.x * .9 * idle, pitch = .35 * Math.sin(s * 1.7 + .4) + ptr.y * .45 * idle, roll = .22 * Math.sin(s * 1.1);
      const reveal = E.inOutCubic(seg(t, .3, 1.8));
      const ka = lerp(-2.4, -.55, reveal) + ptr.x * .6 * idle;
      gl.viewport(0, 0, cvgl.width, cvgl.height);
      gl.useProgram(prog);
      gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(loc.uRes, cvgl.width, cvgl.height);
      gl.uniform1f(loc.uT, t); gl.uniform1f(loc.uS, s); gl.uniform1f(loc.uReveal, .15 + .85 * reveal);
      gl.uniform1f(loc.uCore, .6 + .4 * Math.sin(t * .8));
      gl.uniformMatrix3fv(loc.uRot, false, new Float32Array(rot(yaw, pitch, roll)));
      gl.uniform3f(loc.uKey, Math.sin(ka), .55 - ptr.y * .3 * idle, Math.cos(ka));
      gl.uniform1f(loc.uLight, env.dark ? 0 : 1); gl.uniform3fv(loc.uG0, lin(T.g0)); gl.uniform3fv(loc.uG1, lin(T.g1));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // caption
      const idx = Math.round(s) % 5, near = 1 - Math.min(1, Math.abs(s - Math.round(s)) * 4);
      cap = env.layer.firstChild;
      if (cap) { cap.children[0].textContent = ''; cap.children[0].style.cssText = 'width:7px;height:7px;border-radius:50%;background:#ff6500;display:inline-block'; cap.children[1].textContent = NAMES[idx]; cap.style.opacity = (near * ss(2.2, 2.8, t)).toFixed(3); cap.children[1].style.color = env.dark ? '#ffffff' : '#0b0b1c'; }
    }
  };
})());
