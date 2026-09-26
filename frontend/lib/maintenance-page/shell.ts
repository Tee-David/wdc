/**
 * THE SHELL every maintenance template renders inside.
 *
 * One page, one string, no dependency on the app: the thing being maintained
 * is the app, so this must not need its CSS, its JavaScript or its fonts'
 * hashed filenames. Everything here is inline except three static files that
 * the proxy never blocks (anything with a file extension passes it): the two
 * Space Grotesk weights in /fonts, the mark in /brand, and Matter.js for the
 * templates that need real rigid-body physics.
 *
 * WHAT THE SHELL OWNS, so that no template has to:
 *  - the lockup: heading, the admin's message, the countdown, the notify-me
 *    capsule and the ways to reach the studio;
 *  - the runtime (`window.WDC`): the maintenance clock, the free area of the
 *    screen a scene may use, a render loop that stops when the tab is hidden,
 *    and reduced motion;
 *  - the preview bar an admin sees, with a clock to scrub through.
 *
 * THE LOCKUP HAS TWO LAYOUTS, chosen by one media query (SIDE): a column
 * beside the scene on wide screens and short landscape phones, and a strip
 * along the bottom everywhere else. Scenes never guess which: `WDC.area()`
 * measures the lockup and says what is left.
 *
 * THIS PAGE IS ALWAYS NAVY. It is the brand's holding page, like the heroes,
 * so it commits to the dark ground in both themes and sets every colour
 * itself rather than following the host's.
 */
import type { TemplateDef, TemplateId } from "./registry";

export type TemplateModule = {
  css: string;
  body: (ctx: BodyContext) => string;
  script: string;
  /** Static scripts the template needs before its own, e.g. Matter.js. */
  vendor?: string[];
};

export type BodyContext = {
  esc: (s: string) => string;
  option: (key: string) => string;
};

/** Everything the page's script is told. Serialised into the page as JSON. */
export type PageData = {
  template: TemplateId;
  clock: boolean;
  since: number;
  backBy: number | null;
  preview: boolean;
  notify: string;
  options: Record<string, string>;
};

export type ShellInput = {
  def: TemplateDef;
  mod: TemplateModule;
  data: PageData;
  message: string;
  contactEmail: string;
  portalUrl: string;
  /** Only in a preview: the neighbouring templates, for flicking through. */
  nav?: { prev: TemplateDef; next: TemplateDef; href: (id: TemplateId) => string };
};

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** JSON for inside a <script> element: nothing in it can close the element. */
const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, " ");

const MARK = "/brand/icon-white-accent.svg";

/* The lockup sits beside the scene here, and along the bottom everywhere else. */
export const SIDE_QUERY = "(min-width: 1000px), (min-width: 640px) and (max-height: 540px) and (orientation: landscape)";

const SHELL_CSS = String.raw`
@font-face{font-family:"WDC Grotesk";src:url("/fonts/space-grotesk-500.woff2") format("woff2");font-weight:300 600;font-style:normal;font-display:swap}
@font-face{font-family:"WDC Grotesk";src:url("/fonts/space-grotesk-700.woff2") format("woff2");font-weight:700 900;font-style:normal;font-display:swap}
:root{
  color-scheme:dark;
  --navy:#000065;--navy-deep:#00003f;--navy-lift:#12128a;--navy-line:#2a2aa0;
  --orange:#ff6500;--orange-ink:#c95000;--white:#fff;--black:#000;--mist:#c7c9ec;--mist-dim:#9a9ccf;
  /* One family, as on the rest of the site: display at 700, everything else at 500. */
  --display:"WDC Grotesk","Space Grotesk",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  --body:"WDC Grotesk","Space Grotesk",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  /* The button pair on a dark ground: white fill, black label. */
  --btn-fill:#fff;--btn-ink:#000;
  /* Written by the runtime from the lockup's real position; these are only the first guess. */
  --scene-l:16px;--scene-t:16px;--scene-r:16px;--scene-b:220px;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{height:100%}
body{margin:0;background:var(--navy);color:var(--white);font:500 1rem/1.55 var(--body);overflow:hidden;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
button,input{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--orange);outline-offset:3px}
.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.stage{position:fixed;inset:0;overflow:hidden}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:44px;padding:0 1.15rem;border-radius:999px;border:2px solid var(--btn-fill);font:600 .95rem/1 var(--body);cursor:pointer;text-decoration:none;white-space:nowrap;transition:background-color .18s,color .18s,transform .12s}
.btn-primary{background:var(--btn-fill);color:var(--btn-ink)}
.btn-primary:hover{background:var(--btn-ink);color:var(--btn-fill)}
.btn-secondary{background:var(--btn-ink);color:var(--btn-fill)}
.btn-secondary:hover{background:var(--btn-fill);color:var(--btn-ink)}
.btn:active{transform:translateY(1px) scale(.98)}
.btn[disabled]{opacity:.6;cursor:progress}

/* ---- the lockup ---- */
.wdc-scrim{position:fixed;z-index:29;pointer-events:none;inset:auto 0 0 0;height:calc(var(--scene-b-gap,230px) + 40px);background:linear-gradient(0deg,rgba(0,0,58,.97) 0%,rgba(0,0,58,.9) 60%,rgba(0,0,58,0) 100%)}
.wdc-lock{position:fixed;z-index:30;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:.75rem 1rem}
.wdc-lock>*{grid-column:1/-1;min-width:0}
.wdc-brand{display:none;align-items:center;gap:.6rem;font:500 .85rem/1 var(--body);color:var(--mist);letter-spacing:.01em}
.wdc-brand img{width:22px;height:23px;display:block}
.wdc-head{grid-column:1}
.wdc-lock h1{margin:0;font:700 clamp(1.8rem,7vw,2.3rem)/.95 var(--display);letter-spacing:-.04em;text-wrap:balance}
.wdc-lock h1 span{color:var(--orange)}
.wdc-lede{display:none;margin:1rem 0 0;font:500 1.02rem/1.5 var(--body);color:var(--mist);max-width:22rem;overflow-wrap:anywhere}
.wdc-time{grid-column:2;display:flex;flex-direction:column;align-items:flex-end;gap:.2rem;text-align:right}
.wdc-time b{font:700 1.2rem/1 var(--display);letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--orange);white-space:nowrap}
.wdc-time span{font:500 .72rem/1.3 var(--body);color:var(--mist)}
.wdc-time strong{font-weight:600;color:var(--white)}
.wdc-local{display:none}
.wdc-cap{display:flex;align-items:center;gap:.25rem;background:var(--white);border-radius:999px;padding:.28rem;transition:box-shadow .2s;
  /* a light surface in a dark page: the pair goes back to its paper colours */
  --btn-fill:#000;--btn-ink:#fff}
.wdc-cap:focus-within,.wdc-cap.bad{box-shadow:0 0 0 3px var(--orange)}
.wdc-cap input{flex:1;min-width:0;min-height:44px;border:0;background:transparent;padding:0 .35rem 0 1rem;color:var(--black);font:500 1rem/1 var(--body)}
.wdc-cap input::placeholder{color:#5d5d78}
.wdc-cap input:focus{outline:none}
.wdc-cap .btn{flex:none}
.wdc-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.wdc-note{margin:.5rem 0 0 1rem;font:500 .8rem/1.35 var(--body);color:var(--mist)}
.wdc-note.bad{color:#ffb27a}
.wdc-thanks{display:grid;gap:.85rem}
.wdc-thanks>p{margin:0;display:flex;align-items:center;gap:.7rem;font:500 1rem/1.35 var(--body);min-width:0}
.wdc-thanks>p>span{min-width:0;overflow-wrap:anywhere}
.wdc-thanks i{flex:none;width:30px;height:30px;border-radius:50%;background:var(--orange);display:grid;place-items:center}
.wdc-ask{display:grid;gap:.5rem}
.wdc-ask small{font:500 .8rem/1.3 var(--body);color:var(--mist)}
.wdc-ask div{display:flex;flex-wrap:wrap;gap:.4rem}
.wdc-ask button{min-height:40px;padding:0 .9rem;border-radius:999px;border:1.5px solid #4f4fc0;background:var(--navy-deep);color:var(--white);font:500 .85rem/1 var(--body);cursor:pointer;transition:background-color .15s,color .15s,border-color .15s}
.wdc-ask button:hover{border-color:var(--white)}
.wdc-ask button[aria-pressed=true]{background:var(--white);color:var(--black);border-color:var(--white)}
.wdc-micro{margin:0;font:500 .82rem/1.5 var(--body);color:var(--mist)}
.wdc-micro a,.wdc-micro button{font:inherit;color:var(--white);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(255,255,255,.4);text-underline-offset:3px;overflow-wrap:anywhere}
.wdc-micro a:hover,.wdc-micro button:hover{text-decoration-color:var(--orange)}
.wdc-micro .dot{margin:0 .4rem;color:#5d5dc8}
@media (max-width:380px){.wdc-need{display:none}}

@media ${SIDE_QUERY}{
  .wdc-scrim{inset:0 auto 0 0;height:auto;width:calc(var(--scene-l) - 8px);background:linear-gradient(90deg,rgba(0,0,58,.95) 0%,rgba(0,0,58,.86) 70%,rgba(0,0,58,0) 100%)}
  .wdc-lock{left:clamp(24px,4.2vw,64px);right:auto;top:50%;bottom:auto;transform:translateY(-50%);width:min(23rem,40vw);grid-template-columns:1fr;gap:1.5rem;max-height:calc(100dvh - 24px)}
  .wdc-lock>*,.wdc-head,.wdc-time{grid-column:1}
  .wdc-brand{display:flex}
  .wdc-lede{display:block}
  .wdc-lock h1{font-size:clamp(2.6rem,4.8vw,4.4rem);letter-spacing:-.045em}
  .wdc-time{flex-direction:row;align-items:center;gap:.9rem;padding-left:.9rem;border-left:3px solid var(--orange);text-align:left}
  .wdc-time b{font-size:1.75rem;color:var(--white)}
  .wdc-time span{font-size:.85rem}
  .wdc-local{display:block}
}
/* short screens in the side layout: keep what matters */
@media (min-width:640px) and (max-height:620px) and (orientation:landscape){
  .wdc-lock{gap:.9rem}
  .wdc-brand,.wdc-note{display:none}
  .wdc-lede{margin-top:.5rem;font-size:.92rem}
  .wdc-lock h1{font-size:clamp(2rem,4.4vw,3rem)}
}

/* ---- the preview bar (admins only) ---- */
.wdc-pv{position:fixed;z-index:60;top:0;left:0;right:0;display:flex;align-items:center;flex-wrap:wrap;gap:.5rem .9rem;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;background:#000;color:#fff;font:500 .82rem/1.2 var(--body)}
.wdc-pv b{background:var(--orange);color:#000;border-radius:999px;padding:.3rem .55rem;font:700 .72rem/1 var(--display);letter-spacing:.04em;text-transform:uppercase}
.wdc-pv .nm{font-weight:600}
.wdc-pv .dim{color:#b5b5c9}
.wdc-pv nav{margin-left:auto;display:flex;gap:.4rem}
.wdc-pv a{color:#fff;text-decoration:none;border:1.5px solid #fff;border-radius:999px;min-height:34px;padding:0 .75rem;display:inline-flex;align-items:center}
.wdc-pv a:hover{background:#fff;color:#000}
.wdc-pv label{display:flex;align-items:center;gap:.5rem}
.wdc-pv input{width:clamp(80px,18vw,170px);accent-color:var(--orange);height:26px}
.wdc-pv output{min-width:3.2em;font-variant-numeric:tabular-nums;color:#b5b5c9}
@media (max-width:640px){.wdc-pv .dim{display:none}}

/* WE'RE BACK: the moment the site answers again, like the offline page's
   "back online". A navy panel rises over the scene, says so, and a bar that
   knows its length (1.6s) runs before the real page loads. */
.wdc-back{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:var(--navy);color:#fff;transform:translateY(100%);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.wdc-back.on{transform:none}
.wdc-back>div{display:grid;justify-items:center;gap:1rem;text-align:center;padding:1.5rem}
.wdc-back .tick{width:4.25rem;height:4.25rem;border-radius:50%;display:grid;place-items:center;background:#1f7a3a;transform:scale(.6);opacity:0;transition:transform .45s .35s cubic-bezier(.2,.9,.25,1.3),opacity .3s .35s}
.wdc-back.on .tick{transform:none;opacity:1}
.wdc-back .tick svg{width:2.2rem;height:2.2rem}
.wdc-back h2{margin:0;font:700 clamp(2rem,6vw,3.4rem)/1 var(--display);letter-spacing:-.03em}
.wdc-back h2 i{font-style:normal;color:var(--orange)}
.wdc-back p{margin:0;font:500 1rem/1.4 var(--body);color:#c7c9ec}
.wdc-back .bar{width:min(16rem,70vw);height:4px;border-radius:4px;background:#1f1f7a;overflow:hidden}
.wdc-back .bar i{display:block;height:100%;background:var(--orange);transform-origin:left;transform:scaleX(0)}
.wdc-back.on .bar i{transform:scaleX(1);transition:transform 1.6s .5s linear}

@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}
`;

/* The runtime. Plain script, no build step: this page must work when the app does not. */
const RUNTIME = String.raw`
(function(){
  var D = JSON.parse(document.getElementById('wdc-data').textContent);
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;
  var sideMQ = matchMedia(D.side);
  var override = null, progressFns = [], resizeFns = [];
  var HOUR = 3600000;
  function clamp(x){ return Math.max(0, Math.min(1, x)); }
  /* How far through the work we are. Without a back-by time the scene creeps
     toward 85% over four hours and waits there: nothing claims to be finished
     when nobody said when it would be. */
  function progress(){
    if (override !== null) return override;
    var now = Date.now();
    if (D.backBy) return clamp((now - D.since) / Math.max(60000, D.backBy - D.since));
    return Math.min(.85, (now - D.since) / (4*HOUR));
  }
  function remaining(){
    if (!D.backBy) return null;
    if (override !== null) return Math.max(0, (D.backBy - D.since) * (1 - override));
    return Math.max(0, D.backBy - Date.now());
  }
  function fmtLeft(ms){
    if (ms === null) return '';
    if (ms <= 30000) return 'Any minute';
    var m = Math.ceil(ms/60000), h = Math.floor(m/60), d = Math.floor(h/24);
    if (d >= 2) return d + ' days';
    if (h) return h + 'h ' + String(m%60).padStart(2,'0') + 'm';
    return m + 'm';
  }
  function onProgress(fn){ progressFns.push(fn); fn(progress()); }
  function emit(){ var p = progress(); progressFns.forEach(function(f){ f(p); }); paintTime(); }

  /* One requestAnimationFrame loop per caller, stopped while the tab is hidden. fn(dt seconds, now ms). */
  function loop(fn){
    var id = 0, last = 0, on = false;
    function frame(t){ var dt = last ? Math.min(.05, (t - last)/1000) : 0; last = t; fn(dt, t); if (on) id = requestAnimationFrame(frame); }
    function go(){ if (on || document.hidden) return; on = true; last = 0; id = requestAnimationFrame(frame); }
    function stop(){ on = false; cancelAnimationFrame(id); }
    document.addEventListener('visibilitychange', function(){ document.hidden ? stop() : go(); });
    go();
    return {go:go, stop:stop};
  }

  /* The part of the screen a scene may use: everything the lockup and the preview bar leave. */
  var lockEl = document.getElementById('wdc-lock'), bar = document.getElementById('wdc-pv'), A = null;
  function measure(){
    var W = innerWidth, H = innerHeight, r = lockEl.getBoundingClientRect(), top = (bar ? bar.getBoundingClientRect().bottom : 0) + 16;
    var side = sideMQ.matches;
    A = side ? {l:Math.round(r.right + 28), t:top, r:W - 16, b:H - 16} : {l:16, t:top, r:W - 16, b:Math.max(top + 120, Math.round(r.top - 14))};
    A.w = A.r - A.l; A.h = A.b - A.t; A.side = side; A.W = W; A.H = H; A.cx = A.l + A.w/2; A.cy = A.t + A.h/2;
    var s = document.documentElement.style;
    s.setProperty('--scene-l', A.l + 'px'); s.setProperty('--scene-t', A.t + 'px');
    s.setProperty('--scene-r', (W - A.r) + 'px'); s.setProperty('--scene-b', (H - A.b) + 'px');
    s.setProperty('--scene-b-gap', Math.round(H - r.top) + 'px');
    return A;
  }
  var queued = 0;
  function resized(){
    if (queued) return;
    queued = requestAnimationFrame(function(){ queued = 0; measure(); resizeFns.forEach(function(f){ f(A); }); });
  }
  addEventListener('resize', resized);
  sideMQ.addEventListener && sideMQ.addEventListener('change', resized);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resized);
  measure();

  /* ---- the countdown ---- */
  function short(ms, tz){ var o = {weekday:'short', hour:'2-digit', minute:'2-digit'}; if (tz) o.timeZone = tz; return new Date(ms).toLocaleString('en-GB', o); }
  var sameZone = !D.backBy || short(D.backBy) === short(D.backBy, 'Africa/Lagos');
  function paintTime(){
    var left = fmtLeft(remaining());
    document.querySelectorAll('[data-count]').forEach(function(e){ e.textContent = left; });
    if (D.backBy) document.querySelectorAll('[data-local]').forEach(function(e){
      e.textContent = sameZone ? '' : new Date(D.backBy).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) + ' your time';
    });
  }
  paintTime(); setInterval(function(){ if (!document.hidden) emit(); }, 15000);

  /* ---- we're back ----
     Ask the server whether the site is open again: from the moment the
     countdown runs out (the back-by time opens it by itself), and once a
     minute anyway, because the studio may open it early. The gap grows while
     it is still closed, and only a real answer that is not 503 counts. */
  var backShown = false, probeGap = 5000, probeTimer = 0;
  function showBack(){
    if (backShown) return; backShown = true;
    var el = document.createElement('div');
    el.className = 'wdc-back'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'assertive');
    el.innerHTML = '<div><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg></span>'
      + '<h2>We’re back<i>.</i></h2><p>Opening the site for you.</p><span class="bar" aria-hidden="true"><i></i></span></div>';
    document.body.appendChild(el);
    void el.offsetWidth; el.classList.add('on');
    setTimeout(function(){ location.replace(location.href); }, reduced ? 600 : 2200);
  }
  function probe(){
    clearTimeout(probeTimer);
    if (backShown) return;
    if (document.hidden){ probeTimer = setTimeout(probe, 5000); return; }
    fetch(location.pathname + location.search, {method:'HEAD', cache:'no-store', credentials:'same-origin'})
      .then(function(r){ if (r.status !== 503 && r.ok) showBack(); else next(); }, next);
  }
  function next(){ probeGap = Math.min(probeGap * 1.6, 60000); probeTimer = setTimeout(probe, probeGap); }
  if (!D.preview){
    var left = remaining();
    probeTimer = setTimeout(probe, left !== null && left > 0 ? Math.min(left + 1500, 60000) : (left === 0 ? 1500 : 60000));
    document.addEventListener('visibilitychange', function(){ if (!document.hidden && !backShown){ probeGap = 5000; probe(); } });
  }

  window.WDC = {data:D, reduced:reduced, coarse:coarse, since:D.since, backBy:D.backBy, progress:progress, remaining:remaining,
    fmtLeft:fmtLeft, onProgress:onProgress, loop:loop, area:function(){ return A || measure(); }, onResize:function(fn){ resizeFns.push(fn); }};

  /* ---- preview: the clock can be scrubbed ---- */
  var scrub = document.getElementById('wdc-scrub');
  if (scrub){
    var out = document.getElementById('wdc-scrub-out');
    scrub.value = Math.round(progress()*100); out.textContent = scrub.value + '%';
    scrub.addEventListener('input', function(){ override = scrub.value/100; out.textContent = scrub.value + '%'; emit(); });
  }

  /* ---- notify me ---- */
  var form = document.getElementById('wdc-form'), email = document.getElementById('wdc-email'), note = document.getElementById('wdc-note');
  var hp = document.getElementById('wdc-hp'), done = document.getElementById('wdc-done'), noteText = note.textContent, sent = '';
  function bad(msg){ form.classList.add('bad'); email.setAttribute('aria-invalid','true'); note.textContent = msg; note.classList.add('bad'); }
  function post(body){
    return fetch(D.notify, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body), credentials:'same-origin'})
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return {ok:r.ok, body:j}; }); });
  }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var v = email.value.trim();
    if (!v){ bad('Add your email first.'); email.focus(); return; }
    if (!email.checkValidity()){ bad('That address looks incomplete.'); email.focus(); return; }
    var btn = form.querySelector('button[type=submit]');
    function thanks(){
      sent = v; document.getElementById('wdc-who').textContent = v;
      form.hidden = true; note.hidden = true; done.hidden = false; done.focus();
      if (D.preview) document.getElementById('wdc-ask-q').textContent = 'Preview: nothing was saved. What brings you here?';
    }
    if (D.preview){ thanks(); return; }
    btn.disabled = true; btn.textContent = 'Sending';
    post({email:v, company:hp.value}).then(function(r){
      btn.disabled = false; btn.textContent = 'Notify me';
      if (r.ok) thanks(); else { bad(r.body.error || 'That did not go through. Try again in a moment.'); email.focus(); }
    }, function(){ btn.disabled = false; btn.textContent = 'Notify me'; bad('No connection. Try again in a moment.'); });
  });
  email.addEventListener('input', function(){
    if (!email.getAttribute('aria-invalid')) return;
    form.classList.remove('bad'); email.removeAttribute('aria-invalid'); note.textContent = noteText; note.classList.remove('bad');
  });
  /* One optional question after signing up. A second tap on the same answer takes it back. */
  var q = document.getElementById('wdc-ask-q'), qText = q.textContent;
  document.querySelectorAll('[data-why]').forEach(function(b, _, all){
    b.addEventListener('click', function(){
      var on = b.getAttribute('aria-pressed') !== 'true';
      all.forEach(function(o){ o.setAttribute('aria-pressed', String(o === b && on)); });
      q.textContent = on ? 'Thanks. Noted.' : qText;
      if (!D.preview && sent) post({email:sent, reason: on ? b.getAttribute('data-why') : ''}).catch(function(){});
    });
  });
  var copy = document.getElementById('wdc-copy'), need = document.getElementById('wdc-need');
  copy.addEventListener('click', function(){
    function said(t){ need.textContent = t; setTimeout(function(){ need.textContent = 'Need us now?'; }, 2400); }
    try { navigator.clipboard.writeText(copy.textContent.trim()).then(function(){ said('Copied.'); }, function(){ said('Select to copy:'); }); }
    catch(_) { said('Select to copy:'); }
  });
})();
`;

function lagosShort(ms: number) {
  return new Date(ms).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
}

function lockup(i: ShellInput) {
  const d = i.data;
  const time = d.backBy
    ? `<div class="wdc-time"><b data-count></b><span>until <strong>${esc(lagosShort(d.backBy))}</strong> Lagos<span class="wdc-local" data-local></span></span></div>`
    : "";
  return `<div class="wdc-scrim" aria-hidden="true"></div>
<section class="wdc-lock" id="wdc-lock" aria-labelledby="wdc-h1">
  <div class="wdc-brand"><img src="${MARK}" alt="" width="22" height="23">We Dig Creativity</div>
  <div class="wdc-head"><h1 id="wdc-h1">Back shortly<span>.</span></h1><p class="wdc-lede">${esc(i.message)}</p></div>
  ${time}
  <div>
    <form class="wdc-cap" id="wdc-form" novalidate>
      <label class="sr" for="wdc-email">Email address</label>
      <input id="wdc-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="Your email" required maxlength="254" aria-describedby="wdc-note">
      <input class="wdc-hp" id="wdc-hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-primary" type="submit">Notify me</button>
    </form>
    <p class="wdc-note" id="wdc-note" aria-live="polite">One email when we are back. Nothing else.</p>
    <div class="wdc-thanks" id="wdc-done" hidden tabindex="-1">
      <p><i><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i><span>We will email <span id="wdc-who"></span> once.</span></p>
      <div class="wdc-ask" role="group" aria-labelledby="wdc-ask-q">
        <small id="wdc-ask-q" aria-live="polite">So we are ready for you, what brings you here?</small>
        <div><button type="button" aria-pressed="false" data-why="project">A new project</button><button type="button" aria-pressed="false" data-why="client">I am a client</button><button type="button" aria-pressed="false" data-why="browsing">Just looking</button></div>
      </div>
    </div>
  </div>
  <p class="wdc-micro"><span class="wdc-need" id="wdc-need" aria-live="polite">Need us now?</span> <button type="button" id="wdc-copy" aria-label="Copy our email address, ${esc(i.contactEmail)}">${esc(i.contactEmail)}</button><span class="dot" aria-hidden="true">·</span><a href="${esc(i.portalUrl)}">Client portal</a></p>
</section>`;
}

function previewBar(i: ShellInput) {
  if (!i.nav) return "";
  const n = i.nav;
  const clock = i.def.clock
    ? `<label><span>Work done</span><input id="wdc-scrub" type="range" min="0" max="100" step="1" aria-label="Scrub the maintenance clock"><output id="wdc-scrub-out"></output></label>`
    : "";
  return `<div class="wdc-pv" id="wdc-pv" role="region" aria-label="Preview controls">
  <b>Preview</b><span class="nm">${esc(i.def.id)} · ${esc(i.def.name)}</span><span class="dim">Visitors do not see this bar.</span>${clock}
  <nav aria-label="Other templates"><a href="${esc(n.href(n.prev.id))}" aria-label="Previous template: ${esc(n.prev.name)}">‹ ${esc(n.prev.id)}</a><a href="${esc(n.href(n.next.id))}" aria-label="Next template: ${esc(n.next.name)}">${esc(n.next.id)} ›</a></nav>
</div>`;
}

/** The whole page, as one string. */
export function renderDocument(i: ShellInput): string {
  const ctx: BodyContext = { esc, option: (k) => i.data.options[k] ?? "" };
  const data = { ...i.data, side: SIDE_QUERY };
  const vendor = (i.mod.vendor ?? []).map((src) => `<script src="${esc(src)}"></script>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#000065">
<title>${i.data.preview ? "Preview: " : ""}Back shortly | We Dig Creativity</title>
<link rel="preload" href="/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>${SHELL_CSS}${i.mod.css}</style></head>
<body data-template="${i.def.id}">
${previewBar(i)}
${i.mod.body(ctx)}
${lockup(i)}
<script type="application/json" id="wdc-data">${json(data)}</script>
<script>${RUNTIME}</script>
${vendor}
<script>${i.mod.script}</script>
</body></html>`;
}
