/* 08 ONE OBJECT: every service, one liquid-chrome form, raymarched in WebGL. */
CONCEPTS.push((() => {
  const { clamp, lerp, seg, ss, E, TAU } = U;
  let gl, prog, loc = {}, cap, scaleF = 1, slow = 0;
  const NAMES = ['Identity', 'Apps', 'Packaging', 'Social', 'Web'];
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision highp float;
uniform vec2 uRes;uniform float uT,uS,uReveal,uCore;uniform mat3 uRot;uniform vec3 uKey;
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
vec3 env(vec3 r){
  vec3 c=mix(vec3(.004,.004,.03),vec3(.02,.02,.2),smoothstep(-.6,.8,r.y));
  c+=vec3(.9,.92,1.)*exp(-abs(r.y-.08)*28.)*.35*uReveal;
  float k=dot(r,normalize(uKey));
  c+=vec3(1.)*smoothstep(.9,.975,k)*3.4*uReveal;
  c+=vec3(.85,.88,1.)*smoothstep(.07,.0,abs(r.x-.62))*smoothstep(-.3,.4,r.y)*1.6*uReveal;
  c+=vec3(.85,.88,1.)*smoothstep(.05,.0,abs(r.x+.7))*smoothstep(0.,.6,r.y)*.9*uReveal;
  c+=vec3(1.)*smoothstep(.97,.995,dot(r,normalize(vec3(-.8,.5,.4))))*1.2*uReveal;
  c+=vec3(1.,.36,0.)*smoothstep(.72,.97,dot(r,normalize(vec3(.9,-.15,-.6))))*2.0;
  c+=vec3(1.,.4,.05)*smoothstep(.55,1.,-r.y)*.35*uCore;
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/min(uRes.x*1.12,uRes.y);
  vec3 ro=vec3(0.,0.,3.4),rd=normalize(vec3(uv,-1.3));
  float t=0.,md=9.;int hit=0;
  for(int i=0;i<96;i++){vec3 p=ro+rd*t;float d=map(p);md=min(md,d);if(d<.0008){hit=1;break;}t+=d*.8;if(t>7.)break;}
  vec2 q=gl_FragCoord.xy/uRes;
  vec3 bg=mix(vec3(.004,.004,.035),vec3(.03,.03,.2),smoothstep(1.2,0.,length(uv-vec2(0.,-.05))));
  bg+=vec3(1.,.35,0.)*.05*uCore*smoothstep(.9,0.,length(uv-vec2(0.,-.55)));
  vec3 col=bg+vec3(.12,.12,.5)*exp(-md*9.)*.35*uReveal;
  if(hit==1){
    vec3 p=ro+rd*t,n=nrm(p),r=reflect(rd,n);
    float fr=pow(1.-max(dot(n,-rd),0.),4.);
    vec3 c;
    c.r=env(normalize(r+n*.035)).r;c.g=env(r).g;c.b=env(normalize(r-n*.035)).b;
    c*=mix(.42,1.,fr);
    c+=vec3(.01,.01,.06);
    c+=vec3(1.,.4,.05)*fr*.25*uCore;
    col=c;
  }
  col=1.-exp(-col*1.35);
  col=pow(col,vec3(.9));
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
  function setup(env) {
    gl = env.getGL(); if (!gl) return;
    if (prog) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const n of ['uRes', 'uT', 'uS', 'uReveal', 'uCore', 'uRot', 'uKey']) loc[n] = gl.getUniformLocation(prog, n);
    loc.p = gl.getAttribLocation(prog, 'p');
  }

  return {
    name: 'One Object', service: 'Every service, in one form',
    pitch: 'A single object of liquid chrome, lit like a product film, becomes each thing the studio makes: a mark, a phone, a box, a loop, a lattice, and back to a drop. The camera changes angle on every cut, so it plays like a reel of one subject.',
    tech: 'Raw WebGL, one fragment shader: a raymarched signed-distance field that blends five shapes by weight, reflecting a procedural studio (softbox, horizon line, orange rim). Per-channel reflection offsets give a whisper of chromatic dispersion. Resolution adapts to frame time and devicePixelRatio is capped.',
    ground: 'Dark in both page themes; chrome needs a dark studio.',
    duration: 10.6, stillT: 7.6, kind: 'gl',
    glScale(env) { const px = env.W * env.H; return Math.min(env.dpr, Math.sqrt(1.0e6 / px)) * scaleF; },
    beats: [['0.0 s', 'Only an orange rim in the dark; the key light swings round and finds a liquid drop.'], ['2.6 s', 'The drop draws itself up into a slab: apps.'], ['4.4 s', 'The slab thickens into a box: packaging.'], ['6.2 s', 'The box opens into a ring: social, the loop.'], ['8.0 s', 'The ring becomes a lattice sphere: the web.'], ['9.8 s', 'The lattice heals back into the drop.'], ['10.6 s', 'Idle: it keeps changing every few seconds; the pointer turns it and moves the key light.']],
    activate(env) {
      setup(env);
      env.layer.innerHTML = '<div style="position:absolute;left:clamp(16px,3vw,40px);bottom:clamp(16px,4%,36px);font:500 12px \'Space Grotesk\',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(235,236,255,.8);display:flex;gap:10px;align-items:center"><span style="color:#ff7a26"></span><span></span></div>';
      cap = env.layer.firstChild;
    },
    init() {},
    reset() { slow = 0; },
    frame(t, dt, env) {
      if (!gl || !prog) return;
      const { ptr, cvgl } = env;
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
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // caption
      const idx = Math.round(s) % 5, near = 1 - Math.min(1, Math.abs(s - Math.round(s)) * 4);
      if (cap) { cap.children[0].textContent = '0' + (idx + 1); cap.children[1].textContent = NAMES[idx]; cap.style.opacity = (near * ss(2.2, 2.8, t)).toFixed(3); }
    }
  };
})());
