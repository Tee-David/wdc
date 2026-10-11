/* @ds-bundle: {"format": 4, "namespace": "WDC", "components": [{"name": "Button"}, {"name": "IconButton"}, {"name": "DeckActions"}, {"name": "Tag"}, {"name": "AvatarStack"}, {"name": "PlatformMark"}, {"name": "SearchField"}, {"name": "TextField"}, {"name": "Segmented"}, {"name": "ChoiceControls"}, {"name": "Sidebar"}, {"name": "TopBar"}, {"name": "Tabs"}, {"name": "Pagination"}, {"name": "StatTile"}, {"name": "Table"}, {"name": "Timeline"}, {"name": "Stepper"}, {"name": "BarChart"}, {"name": "ContentCalendar"}, {"name": "FileRow"}, {"name": "DeckCard"}, {"name": "Card"}, {"name": "Sheet"}, {"name": "ConfirmSheet"}, {"name": "Menu"}, {"name": "Toast"}, {"name": "SaveBar"}, {"name": "SettingsRow"}, {"name": "QuoteBuilder"}, {"name": "PayFlow"}, {"name": "Receipt"}, {"name": "FilePreview"}, {"name": "PostPreview"}, {"name": "TourCard"}, {"name": "Skeleton"}, {"name": "EmptyState"}, {"name": "InstallCard"}]} */
(function () {
  var reduce = function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var ngn = function (n) { return '\u20a6' + Math.round(n).toLocaleString('en-NG'); };
  var short = function (n) { if (n >= 1e6) return '\u20a6' + (Math.round(n / 1e4) / 100) + 'm'; if (n >= 1e3) return '\u20a6' + Math.round(n / 1e3) + 'k'; return '\u20a6' + Math.round(n); };
  function countUp(el, to, format) {
    format = format || function (n) { return String(Math.round(n)); };
    if (reduce()) { el.textContent = format(to); return; }
    var t0 = performance.now();
    var step = function (t) { var k = Math.min(1, (t - t0) / 1000), e = 1 - Math.pow(1 - k, 3); el.textContent = format(to * e); if (k < 1) requestAnimationFrame(step); else el.textContent = format(to); };
    requestAnimationFrame(step);
  }
  function confetti(layer) {
    if (reduce() || !layer) return;
    var COL = ['#ff6500', '#000065', '#ffb066', '#4a4ad4', '#ff8a2b', '#ffd8b0'], W = layer.clientWidth || innerWidth, H = layer.clientHeight || innerHeight, N = W < 560 ? 44 : 70;
    var noise = function (i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
    for (var i = 0; i < N; i++) {
      var p = document.createElement('i'), size = 6 + noise(i, 6) * 7, round = noise(i, 8) > 0.66;
      p.style.cssText = 'position:absolute;top:-16px;left:' + (noise(i, 1) * 100) + '%;width:' + size + 'px;height:' + (round ? size : size * 0.45) + 'px;background:' + COL[Math.floor(noise(i, 7) * COL.length)] + ';border-radius:' + (round ? '50%' : '2px');
      layer.appendChild(p);
      var drift = (noise(i, 4) - 0.5) * 0.26 * W, spin = 360 + noise(i, 5) * 900;
      var a = p.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + drift + 'px,' + (H * 1.1) + 'px) rotate(' + spin + 'deg)', opacity: 0.9, offset: 0.85 }, { transform: 'translate(' + drift * 1.1 + 'px,' + (H * 1.15) + 'px) rotate(' + spin + 'deg)', opacity: 0 }], { duration: 2600 + noise(i, 3) * 1700, delay: noise(i, 2) * 900, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'both' });
      a.onfinish = (function (node) { return function () { node.remove(); }; })(p);
    }
  }
  window.WDC = { ngn: ngn, short: short, countUp: countUp, confetti: confetti };
})();
