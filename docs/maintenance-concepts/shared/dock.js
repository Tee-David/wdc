<script>
/* Shared runtime for every concept: the maintenance window, the dock, the
   prototype chrome, and a render loop that stops when the tab is hidden. */
(function(){
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var now = Date.now();
  /* Demo window: started an hour ago, back on the next quarter hour three hours out. */
  var start = now - 60*60*1000;
  var backBy = Math.ceil((now + 3*60*60*1000)/(15*60*1000))*(15*60*1000);
  var override = null, listeners = [];

  function progress(){
    if (override !== null) return override;
    return Math.min(1, Math.max(0, (Date.now()-start)/(backBy-start)));
  }
  function remaining(){ return Math.max(0, backBy - (start + progress()*(backBy-start))); }
  function fmtLeft(ms, short){
    var m = Math.round(ms/60000), h = Math.floor(m/60); m = m%60;
    if (ms <= 0) return short ? 'Any moment' : 'Any moment';
    return h ? h+'h '+String(m).padStart(2,'0')+'m' : m+'m';
  }
  function fmt(d, tz){
    var o = {weekday:'long', hour:'2-digit', minute:'2-digit'}; if (tz) o.timeZone = tz;
    return new Date(d).toLocaleString('en-GB', o);
  }
  function onProgress(fn){ listeners.push(fn); fn(progress()); }
  function emit(){ var p = progress(); listeners.forEach(function(f){ f(p); }); paintTime(); }

  /* One rAF loop per caller, paused while hidden. fn(dt seconds, t ms). */
  function loop(fn){
    var id = 0, last = 0, running = false;
    function frame(t){ var dt = last ? Math.min(.05,(t-last)/1000) : 0; last = t; fn(dt, t); id = requestAnimationFrame(frame); }
    function go(){ if (running || document.hidden) return; running = true; last = 0; id = requestAnimationFrame(frame); }
    function stop(){ running = false; cancelAnimationFrame(id); }
    document.addEventListener('visibilitychange', function(){ document.hidden ? stop() : go(); });
    go();
    return {stop:stop, go:go};
  }

  function short(d, tz){
    var o = {weekday:'short', hour:'2-digit', minute:'2-digit'}; if (tz) o.timeZone = tz;
    return new Date(d).toLocaleString('en-GB', o);
  }
  /* The visitor's own time is only worth a mention when it differs from Lagos. */
  var sameZone = short(backBy) === short(backBy, 'Africa/Lagos');
  function paintTime(){
    var left = fmtLeft(remaining());
    document.querySelectorAll('[data-count]').forEach(function(e){ e.textContent = left; });
    document.querySelectorAll('[data-back-lagos]').forEach(function(e){ e.textContent = fmt(backBy,'Africa/Lagos'); });
    document.querySelectorAll('[data-back-lagos-short]').forEach(function(e){ e.textContent = short(backBy,'Africa/Lagos'); });
    document.querySelectorAll('[data-local-note]').forEach(function(e){ e.textContent = sameZone ? '' : ', '+new Date(backBy).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' your time'; });
  }

  window.WDC = {reduced:reduced, start:start, backBy:backBy, progress:progress, remaining:remaining,
    fmtLeft:fmtLeft, fmt:fmt, onProgress:onProgress, loop:loop};

  /* ---------- prototype chrome ---------- */
  var b = document.querySelector('[data-name]'), bar = document.createElement('div');
  bar.className = 'proto';
  bar.innerHTML = '<span class="tag"><b>'+b.dataset.n+' / 11</b>'+b.dataset.name+'<span style="color:#9a9ccf">Prototype · forms send nothing</span></span>';
  if (b.dataset.clock){
    var c = document.createElement('label'); c.className = 'clock';
    c.innerHTML = '<span>Preview the clock</span><input id="proto-clock" type="range" min="0" max="100" step="0.5"><output id="proto-out"></output>';
    bar.appendChild(c);
    var r = c.querySelector('input'), out = c.querySelector('output');
    r.value = progress()*100; out.textContent = Math.round(progress()*100)+'% done';
    r.addEventListener('input', function(){ override = r.value/100; out.textContent = Math.round(r.value)+'% done'; emit(); });
  }
  document.body.appendChild(bar);

  /* ---------- the lockup ---------- */
  var form = document.getElementById('dk-form'), email = document.getElementById('dk-email'), note = document.getElementById('dk-note');
  var noteText = note.textContent;
  function bad(msg){ form.classList.add('bad'); email.setAttribute('aria-invalid','true'); note.textContent = msg; note.classList.add('bad'); email.focus(); }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var v = email.value.trim();
    if (!v) return bad('Add your email first.');
    if (!email.checkValidity()) return bad('That address looks incomplete.');
    document.getElementById('dk-who').textContent = v;
    form.hidden = true; note.hidden = true;
    var d = document.getElementById('dk-done'); d.hidden = false; d.focus();
  });
  email.addEventListener('input', function(){
    if (!email.getAttribute('aria-invalid')) return;
    form.classList.remove('bad'); email.removeAttribute('aria-invalid'); note.textContent = noteText; note.classList.remove('bad');
  });
  /* after they sign up, one optional question; a second tap on the same answer takes it back */
  document.querySelectorAll('[data-why]').forEach(function(btn, _, all){
    btn.addEventListener('click', function(){
      var on = btn.getAttribute('aria-pressed') !== 'true';
      all.forEach(function(o){ o.setAttribute('aria-pressed', String(o === btn && on)); });
      document.getElementById('dk-ask').textContent = on ? 'Thanks. Noted.' : 'So we are ready for you, what brings you here?';
    });
  });

  var copy = document.getElementById('dk-copy'), need = document.getElementById('dk-need');
  copy.addEventListener('click', function(){
    var addr = copy.dataset.email;
    function said(t){ need.textContent = t; setTimeout(function(){ need.textContent = 'Need us now?'; }, 2400); }
    try { navigator.clipboard.writeText(addr).then(function(){ said('Copied.'); }, function(){ said('Select to copy:'); }); }
    catch(_) { said('Select to copy:'); }
  });

  paintTime(); setInterval(emit, 15000);
})();
</script>
