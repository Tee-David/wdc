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

  function paintTime(){
    var left = fmtLeft(remaining());
    document.querySelectorAll('[data-count]').forEach(function(e){ e.textContent = left; });
    document.querySelectorAll('[data-count-short]').forEach(function(e){ e.textContent = 'Back in '+left; });
    document.querySelectorAll('[data-back-lagos]').forEach(function(e){ e.textContent = fmt(backBy,'Africa/Lagos'); });
    document.querySelectorAll('[data-back-local]').forEach(function(e){ e.textContent = fmt(backBy); });
  }

  window.WDC = {reduced:reduced, start:start, backBy:backBy, progress:progress, remaining:remaining,
    fmtLeft:fmtLeft, fmt:fmt, onProgress:onProgress, loop:loop};

  /* ---------- prototype chrome ---------- */
  var b = document.querySelector('[data-name]'), bar = document.createElement('div');
  bar.className = 'proto';
  bar.innerHTML = '<span class="tag"><b>'+b.dataset.n+' / 11</b>'+b.dataset.name+'</span>';
  if (b.dataset.clock){
    var c = document.createElement('label'); c.className = 'clock';
    c.innerHTML = '<span>Preview the clock</span><input id="proto-clock" type="range" min="0" max="100" step="0.5"><output id="proto-out"></output>';
    bar.appendChild(c);
    var r = c.querySelector('input'), out = c.querySelector('output');
    r.value = progress()*100; out.textContent = Math.round(progress()*100)+'% done';
    r.addEventListener('input', function(){ override = r.value/100; out.textContent = Math.round(r.value)+'% done'; emit(); });
  }
  document.body.appendChild(bar);

  /* ---------- dock ---------- */
  var dock = document.getElementById('dock'), tog = document.getElementById('dk-toggle');
  function setMin(min){
    dock.classList.toggle('min', min);
    tog.setAttribute('aria-expanded', String(!min));
    tog.setAttribute('aria-label', min ? 'Show the details' : 'Hide the details');
  }
  setMin(innerWidth < 700 || b.dataset.dock === 'min');
  tog.addEventListener('click', function(){ setMin(!dock.classList.contains('min')); });
  document.getElementById('dk-open').addEventListener('click', function(){ setMin(false); document.getElementById('dk-email').focus(); });

  var form = document.getElementById('dk-form'), email = document.getElementById('dk-email'), err = document.getElementById('dk-err');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!email.value.trim() || !email.checkValidity()){
      email.setAttribute('aria-invalid','true');
      err.textContent = email.value.trim() ? 'That address is missing something. Check it and try again.' : 'Add your email address first.';
      email.focus(); return;
    }
    email.removeAttribute('aria-invalid'); err.textContent = '';
    document.getElementById('dk-who').textContent = email.value.trim();
    form.hidden = true; var d = document.getElementById('dk-done'); d.hidden = false; d.focus();
    document.dispatchEvent(new CustomEvent('wdc:notified'));
  });
  email.addEventListener('input', function(){ if (email.getAttribute('aria-invalid')) { email.removeAttribute('aria-invalid'); err.textContent=''; } });

  var copy = document.getElementById('dk-copy');
  copy.addEventListener('click', function(){
    var addr = copy.dataset.email, note = document.getElementById('dk-copied');
    function said(t){ note.textContent = t; }
    try {
      navigator.clipboard.writeText(addr).then(function(){ said('Copied '+addr); }, function(){ said('Copy it from here: '+addr); });
    } catch(_) { said('Copy it from here: '+addr); }
  });

  paintTime(); setInterval(emit, 15000);
})();
</script>
