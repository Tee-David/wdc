  /* ======================= kit2: searchable lists, the site's own date and time pickers, media attach, shared memory ======================= */

  /* ---------- dates: ISO strings, today is Sat 10 Oct 2026 ---------- */
  today() { return '2026-10-10'; }
  isoOf(y, m, d) { return y + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2); }
  isoAt(iso) { var p = iso.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  addDays(iso, n) { var d = this.isoAt(iso); d.setUTCDate(d.getUTCDate() + n); return this.isoOf(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
  addMonths(iso, n) {
    var d = this.isoAt(iso), y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return this.isoOf(y, m, Math.min(day, last));
  }
  monthName(m) { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]; }
  fmtDate(iso) { if (!iso) return ''; var d = this.isoAt(iso); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + this.monthName(d.getUTCMonth()).slice(0, 3); }
  fmtDateLong(iso) { var d = this.isoAt(iso); return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + this.monthName(d.getUTCMonth()) + ' ' + d.getUTCFullYear(); }
  timesList() { var out = []; for (var i = 0; i < 96; i++) out.push(('0' + Math.floor(i / 4)).slice(-2) + ':' + ('0' + (i % 4) * 15).slice(-2)); return out; }
  digitsOf(p) { return String(p || '').replace(/\D/g, '').slice(-10); }
  isTempEmail(email) { var d = (String(email).split('@')[1] || '').toLowerCase(); return ['mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'sharklasers.com', 'trashmail.com'].indexOf(d) >= 0; }
  fileSize(n) { return n >= 1048576 ? (Math.round(n / 104857.6) / 10) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  /* ---------- shared memory: a few facts survive moving between boards, so a pause or a new client shows up everywhere ---------- */
  shared(key, def) { try { var o = JSON.parse(window.localStorage.getItem('wdc-shared') || '{}'); return key in o ? o[key] : def; } catch (e) { return def; } }
  setShared(key, val) { try { var o = JSON.parse(window.localStorage.getItem('wdc-shared') || '{}'); o[key] = val; window.localStorage.setItem('wdc-shared', JSON.stringify(o)); } catch (e) { /* storage can be off */ } }

  /* ---------- a searchable list: five rows at a time, live search, optional multi select, optional inline "add new" ---------- */
  listView(raw, s) {
    var self = this, PER = 5, base = typeof raw.list === 'function' ? raw.list(s) : (raw.list || []), extra = s.lextra || [], full = base.concat(extra);
    var listSel = !!raw.select, multi = !!raw.multi;
    var searchable = raw.search === true || (raw.search !== false && listSel && full.length > PER);
    var q = (s.lq || '').trim().toLowerCase(), idx = [], i;
    for (i = base.length; i < full.length; i++) idx.push(i);
    for (i = 0; i < base.length; i++) idx.push(i);
    if (q) { var words = q.split(/\s+/); idx = idx.filter(function (k) { var l = full[k], hay = ((l.t || '') + ' ' + (l.s || '') + ' ' + (l.tag || '') + ' ' + (l.k || '')).toLowerCase(); return words.every(function (w) { return hay.indexOf(w) >= 0; }); }); }
    var pages = Math.max(1, Math.ceil(idx.length / PER)), pg = searchable ? Math.min(s.lpg || 0, pages - 1) : 0;
    var vis = searchable ? idx.slice(pg * PER, pg * PER + PER) : idx;
    var isOn = function (k) { return multi ? !!(s.lsel && s.lsel[k]) : s.spick === k; };
    var toggle = function (k) { if (multi) { var m = Object.assign({}, self.state.lsel); m[k] = !m[k]; self.setState({ lsel: m }); } else self.setState({ spick: k }); };
    var list = vis.map(function (k) {
      var l = full[k], on = listSel && isOn(k), act = l.act || null;
      return { t: l.t, s: l.s || '', tag: l.tag || '', tone: l.tone || 'var(--ad-tone-neutral)', hasTag: !!l.tag, radio: listSel && !multi, square: listSel && multi, cls: on ? 'on' : '', role: listSel ? (multi ? 'checkbox' : 'radio') : 'listitem', checked: on ? 'true' : 'false', tab: listSel || l.open ? '0' : '-1', cursor: listSel || l.open ? 'pointer' : 'default',
        hasLogo: !!l.logo, ld: l.logo ? l.logo.d : '', lc: l.logo ? l.logo.c : '', hasAv: !!l.ini, av: l.av || 'var(--ad-tone-brand)', ini: l.ini || '',
        hasAct: !!act, actLabel: act ? act.label : '', actCls: act && act.primary ? 'btn' : 'btn2',
        act: function (e) { if (e && e.stopPropagation) e.stopPropagation(); if (act) act.fn(); },
        pick: function () { if (listSel) toggle(k); else if (l.open) self.open(l.open, true); } };
    });
    var sel = multi ? Object.keys(s.lsel || {}).filter(function (k) { return s.lsel[k]; }).map(Number).sort(function (a, b) { return a - b; }) : (s.spick >= 0 ? [s.spick] : []);
    var chosen = sel.filter(function (k) { return full[k]; }).map(function (k) {
      var l = full[k];
      return { t: l.t, ini: l.ini || l.t.charAt(0), av: l.av || 'var(--ad-tone-brand)', isNew: !!l.isNew, remove: function () { if (multi) { var m = Object.assign({}, self.state.lsel); m[k] = false; self.setState({ lsel: m }); } else self.setState({ spick: -1 }); } };
    });
    var cr = raw.create && listSel ? raw.create : null, cf = s.lcf || {};
    var cerr = cr ? (cr.check ? cr.check(cf, full) : '') : '', cfilled = cr ? (cr.fields || []).every(function (fd) { return !fd.required || (cf[fd.key] || '').trim(); }) : true;
    var ss = {
      has: searchable, lq: s.lq || '', hasQ: !!s.lq, ph: raw.searchPh || 'Search by name or detail',
      onLq: function (e) { self.setState({ lq: e.target.value, lpg: 0 }); }, clearLq: function () { self.setState({ lq: '', lpg: 0 }); },
      hasChosen: chosen.length > 0, chosen: chosen, chosenLabel: multi ? chosen.length + ' chosen' : 'Chosen',
      range: idx.length ? (pg * PER + 1) + ' to ' + (pg * PER + vis.length) + ' of ' + idx.length + (q ? ' matches' : '') : '0 results',
      hint: pages > 1 && !q ? 'Five at a time. Type to search all ' + full.length + '.' : '',
      hasHint: pages > 1 && !q, hasPager: searchable && pages > 1, prevDis: pg === 0, nextDis: pg >= pages - 1,
      prev: function () { self.setState({ lpg: Math.max(0, pg - 1) }); }, next: function () { self.setState({ lpg: Math.min(pages - 1, pg + 1) }); },
      none: searchable && !idx.length, noneText: q ? 'Nobody matches "' + s.lq + '".' : 'Nothing here yet.',
      canCreate: !!cr, creating: !!(cr && s.lcreate), idle: !!(cr && !s.lcreate), createLabel: cr ? cr.label : '', createHint: cr ? (cr.hint || '') : '',
      cfields: cr ? (cr.fields || []).map(function (fd) { return { id: 'cf-' + fd.key, label: fd.label, ph: fd.ph || '', type: fd.type || 'text', mode: fd.mode || 'text', value: cf[fd.key] || '', on: function (e) { var f = Object.assign({}, self.state.lcf); f[fd.key] = e.target.value; self.setState({ lcf: f }); } }; }) : [],
      cerr: cerr, hasCerr: !!cerr && Object.keys(cf).some(function (k) { return (cf[k] || '').trim(); }), cdis: !!cerr || !cfilled,
      startCreate: function () { self.setState({ lcreate: true, lcf: { name: s.lq && !/@/.test(s.lq) ? s.lq : '' } }); setTimeout(function () { var el = document.getElementById('cf-name'); if (el) el.focus(); }, 60); },
      cancelCreate: function () { self.setState({ lcreate: false, lcf: {} }); },
      saveCreate: function () {
        var st = self.state, f = st.lcf || {}, err = cr.check ? cr.check(f, full) : ''; if (err) return;
        var item = Object.assign({ isNew: true, tag: 'New' }, cr.make(f)), ex = (st.lextra || []).concat([item]), at = base.length + ex.length - 1;
        var patch = { lextra: ex, lcreate: false, lcf: {}, lq: '', lpg: 0 };
        if (multi) { var m = Object.assign({}, st.lsel); m[at] = true; patch.lsel = m; } else patch.spick = at;
        self.setState(patch);
      }
    };
    return { list: list, ss: ss, full: full, base: base };
  }
  /* What a client picker offers when someone is not in the list yet. The record is made when the sheet finishes, not before. */
  clientCreate(label) {
    var self = this;
    return {
      label: label || 'Add a new client', hint: 'One record per client. We check the email and phone first.',
      fields: [{ key: 'name', label: 'Business name', ph: 'For example: Nkem Realty', required: true }, { key: 'contact', label: 'Main contact', ph: 'Full name', required: true }, { key: 'email', label: 'Email', ph: 'name@business.ng', type: 'email', mode: 'email', required: true }, { key: 'phone', label: 'Phone', ph: '+234 800 000 0000', type: 'tel', mode: 'tel' }],
      check: function (f, full) {
        var name = (f.name || '').trim(), em = (f.email || '').trim().toLowerCase(), dg = self.digitsOf(f.phone);
        if (!name || !(f.contact || '').trim() || !em) return 'Add the business name, the main contact and an email.';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return 'Check the email address. The portal invite goes there.';
        if (self.isTempEmail(em)) return 'Use a business or personal email, not a temporary inbox.';
        var m = full.filter(function (l) { return l.ref && ((l.ref.email && l.ref.email.toLowerCase() === em) || (dg.length >= 10 && self.digitsOf(l.ref.phone) === dg)); })[0];
        return m ? m.t + ' already uses these details. Choose them from the list instead.' : '';
      },
      make: function (f) {
        var nm = f.name.trim(), ini = nm.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
        return { t: nm, s: f.contact.trim() + ' · ' + f.email.trim(), ini: ini, av: '#000065', ref: { id: 'new' + Date.now(), name: nm, ini: ini, tone: '#000065', contact: f.contact.trim(), email: f.email.trim(), phone: (f.phone || '').trim() || 'Not given', services: ['Not set'], live: 0, owed: 0, late: 0, retainer: 0, since: 'Oct 2026', last: 'Added from a project', lastWhen: 'Just now', status: 'active', portal: 'Invite sent today', isNew: true } };
      }
    };
  }
  /* A client record made inside a picker is kept for every board that lists clients. */
  landClient(ref) {
    if (!ref || !ref.isNew) return;
    var all = this.shared('newClients', []); if (all.some(function (c) { return c.id === ref.id; })) return;
    this.setShared('newClients', [ref].concat(all));
  }
  clientRoster() { var self = this, base = this.clientsData ? this.clientsData() : []; return this.shared('newClients', []).concat(base); }

  /* ---------- fields in a sheet: text, area, date, time, date and time, pictures and video ---------- */
  fieldViews(raw, s) {
    var self = this, F = s.form || {}, I = this.icons(), out = [], ui = s.ui || null;
    var setF = function (key, v) { var f = Object.assign({}, self.state.form); f[key] = v; self.setState({ form: f }); };
    var specs = typeof raw.fields === 'function' ? raw.fields(s) : (raw.fields || []);
    var calIcon = 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', clockIcon = 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2';
    var trig = function (kind, key, label, ph, valText, has, wide, minIso) {
      var openNow = ui && ui.key === key && ui.kind === kind;
      return { isTrig: true, isPlain: false, label: label, cls: wide ? 'wideF' : '', id: 'f-' + key, text: has ? valText : ph, has: has, phCls: has ? '' : 'phTxt', ic: kind === 'date' ? calIcon : clockIcon, expanded: openNow ? 'true' : 'false',
        toggle: function () { var u = self.state.ui; if (u && u.key === key && u.kind === kind) { self.setState({ ui: null }); return; } self.setState({ ui: { key: key, kind: kind, mode: 'days', cursor: F[key] || minIso || self.today(), tq: '' } }); setTimeout(function () { var el = document.querySelector('.adCal'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: self.reduce ? 'auto' : 'smooth' }); }, 60); } };
    };
    specs.forEach(function (fd) {
      var t = fd.type || 'text';
      if (t === 'date' || t === 'datetime') {
        var dk = fd.key, tk = fd.key + 'T', min = fd.min || self.today();
        out.push(trig('date', dk, fd.label, fd.ph || 'Pick a date', self.fmtDate(F[dk] || ''), !!F[dk], t === 'date', min));
        if (t === 'datetime') out.push(trig('time', tk, fd.timeLabel || 'Time', 'Pick a time', F[tk] || '', !!F[tk], false));
        if (ui && (ui.key === dk || ui.key === tk) && (ui.kind === 'date' || ui.kind === 'time')) {
          if (ui.kind === 'date' && ui.key === dk) out.push(self.calPanel(dk, F[dk] || '', min, fd.clearable !== false && !fd.required, function (iso) { setF(dk, iso); if (t === 'datetime' && iso && !F[tk]) setF(tk, '09:00'); self.setState({ ui: null }); }, fd.max));
          if (ui.kind === 'time' && ui.key === tk) out.push(self.timePanel(tk, F[tk] || '', function (v) { setF(tk, v); self.setState({ ui: null }); }));
        }
        if (fd.hint) out[out.length - 1].hint = fd.hint;
        return;
      }
      if (t === 'time') {
        out.push(trig('time', fd.key, fd.label, fd.ph || 'Pick a time', F[fd.key] || '', !!F[fd.key], !!fd.wide));
        if (ui && ui.key === fd.key && ui.kind === 'time') out.push(self.timePanel(fd.key, F[fd.key] || '', function (v) { setF(fd.key, v); self.setState({ ui: null }); }));
        return;
      }
      if (t === 'file') {
        var cur = F[fd.key] || null;
        out.push({ isFile: true, isTrig: false, isPlain: false, key: fd.key, id: 'f-' + fd.key, label: fd.label, cls: 'wideF', hint: fd.hint || '', hasHint: !!fd.hint, accept: fd.accept || '', hasFile: !!cur, noFile: !cur, name: cur ? cur.name : '', info: cur ? cur.rows.length + (cur.rows.length === 1 ? ' row' : ' rows') + ' found · ' + self.fileSize(cur.size) : '',
          onFiles: function (e) { var f = e && e.target && e.target.files && e.target.files[0]; if (!f) return; e.target.value = ''; self.readTable(f).then(function (tb) { setF(fd.key, { name: f.name, size: f.size, headers: tb.headers, rows: tb.rows }); }).catch(function (err) { self.say(err.message || 'We could not read that file.'); }); },
          over: function (e) { if (e && e.preventDefault) e.preventDefault(); }, drop: function (e) { if (e && e.preventDefault) { e.preventDefault(); var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) self.readTable(f).then(function (tb) { setF(fd.key, { name: f.name, size: f.size, headers: tb.headers, rows: tb.rows }); }).catch(function (err) { self.say(err.message || 'We could not read that file.'); }); } },
          clear: function () { setF(fd.key, null); } });
        return;
      }
      if (t === 'media') { out.push(self.mediaField(fd, F[fd.key] || [], function (v) { setF(fd.key, v); })); return; }
      var err = fd.check ? fd.check(F[fd.key] || '', F) : '';
      out.push({ isPlain: true, isTrig: false, key: fd.key, id: 'f-' + fd.key, label: fd.label, ph: fd.ph || '', value: F[fd.key] != null ? F[fd.key] : '', mode: fd.mode || 'text', type: fd.type || 'text', hint: err || fd.hint || '', hasHint: !!(err || fd.hint), hintCls: err ? 'hint err' : 'hint', cls: fd.wide ? 'wideF' : '', isArea: t === 'area', isInput: t !== 'area', on: function (e) { setF(fd.key, e.target.value); } });
    });
    return out.map(function (o) { return Object.assign({ isTrig: false, isPlain: false, isPanelDate: false, isPanelTime: false, isMedia: false, isFile: false, hasHint: !!o.hint, hintCls: 'hint', cls: '' }, o); });
  }
  /* The calendar, as the site draws it: days, then months, then years, with Today and Clear. */
  calPanel(key, value, min, clearable, pick, max) {
    var self = this, u = this.state.ui, cur = u.cursor || value || this.today(), mode = u.mode || 'days', d = this.isoAt(cur), y = d.getUTCFullYear(), m = d.getUTCMonth(), tdy = this.today();
    var go = function (patch) { self.setState({ ui: Object.assign({}, self.state.ui, patch) }); };
    var allowed = function (iso) { return (!min || iso >= min) && (!max || iso <= max); };
    var jump = function (yy, mm) { var last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate(); go({ cursor: self.isoOf(yy, mm, Math.min(d.getUTCDate(), last)) }); };
    var lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), cells = [], i;
    for (i = 0; i < lead; i++) cells.push('');
    for (i = 1; i <= days; i++) cells.push(this.isoOf(y, m, i));
    while (cells.length % 7) cells.push('');
    var weeks = []; for (i = 0; i < cells.length; i += 7) weeks.push({ days: cells.slice(i, i + 7).map(function (iso, c) {
      if (!iso) return { blank: true, isDay: false, k: 'b' + i + c };
      var ok = allowed(iso);
      return { blank: false, isDay: true, k: iso, n: +iso.slice(8), aria: self.fmtDateLong(iso) + (ok ? '' : ', not available'), cls: (iso === value ? 'is-on' : '') + (iso === tdy ? ' is-today' : ''), cur: iso === tdy ? 'date' : 'false', dis: !ok, pick: function () { if (ok) pick(iso); } };
    }) });
    var start = y - (y % 12);
    return { isPanelDate: true, isTrig: false, isPlain: false, key: key, isDays: mode === 'days', isMonths: mode === 'months', isYears: mode === 'years', cls: 'wideF',
      title: this.monthName(m) + ' ' + y, titleAria: this.monthName(m) + ' ' + y + '. Choose a month or year', yearTitle: '' + y, range: start + ' to ' + (start + 11),
      prev: function () { go({ cursor: self.addMonths(cur, -1) }); }, next: function () { go({ cursor: self.addMonths(cur, 1) }); },
      toMonths: function () { go({ mode: 'months' }); }, toYears: function () { go({ mode: 'years' }); },
      prevYear: function () { jump(y - 1, m); }, nextYear: function () { jump(y + 1, m); }, prevYears: function () { jump(y - 12, m); }, nextYears: function () { jump(y + 12, m); },
      heads: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(function (h) { return { h: h }; }), weeks: weeks,
      months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (mm) { return { t: self.monthName(mm).slice(0, 3), aria: self.monthName(mm) + ' ' + y, cls: (mm === m ? 'is-here' : '') + (value && self.isoAt(value).getUTCFullYear() === y && self.isoAt(value).getUTCMonth() === mm ? ' is-on' : ''), pick: function () { jump(y, mm); go({ mode: 'days' }); } }; }),
      years: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (k) { var yy = start + k; return { t: '' + yy, cls: (yy === y ? 'is-here' : '') + (value && self.isoAt(value).getUTCFullYear() === yy ? ' is-on' : ''), pick: function () { jump(yy, m); go({ mode: 'months' }); } }; }),
      todayDis: !allowed(tdy), todayPick: function () { if (allowed(tdy)) pick(tdy); }, hasClear: !!(clearable && value), clearPick: function () { pick(''); }, closeCal: function () { self.setState({ ui: null }); } };
  }
  /* The time, in quarter hours, searchable ("14" finds the afternoon), five rows tall with the rest scrolling inside. */
  timePanel(key, value, pick) {
    var self = this, q = (this.state.ui.tq || '').trim(), all = this.timesList(), rows = all.filter(function (t) { return !q || t.indexOf(q) >= 0 || t.replace(/^0/, '').indexOf(q) === 0; });
    return { isPanelTime: true, isTrig: false, isPlain: false, key: key, cls: 'wideF', tq: this.state.ui.tq || '',
      onTq: function (e) { self.setState({ ui: Object.assign({}, self.state.ui, { tq: e.target.value }) }); },
      quick: ['09:00', '12:00', '15:00', '18:00'].map(function (t) { return { t: t, cls: t === value ? 'on' : '', pick: function () { pick(t); } }; }),
      rows: rows.map(function (t) { return { t: t, cls: t === value ? 'is-on' : '', sel: t === value ? 'true' : 'false', pick: function () { pick(t); } }; }), none: !rows.length, noneText: 'No time matches "' + q + '". Try 14 or 09:30.',
      closeCal: function () { self.setState({ ui: null }); } };
  }
  /* Pictures and video: a real file chooser with thumbnails, or a few sample pictures when there is nothing to hand. */
  mediaField(fd, items, set) {
    var self = this, max = fd.max || 10, left = max - items.length;
    var add = function (list) { var cur = (self.state.form[fd.key] || []).slice(); list.forEach(function (x) { if (cur.length < max) cur.push(x); }); set(cur); };
    var fromFiles = function (files) {
      var out = []; for (var i = 0; i < files.length; i++) { var f = files[i], vid = /^video\//.test(f.type); if (!vid && !/^image\//.test(f.type)) continue; out.push({ id: 'm' + Date.now() + i, name: f.name, size: self.fileSize(f.size), kind: vid ? 'video' : 'image', url: URL.createObjectURL(f) }); }
      if (out.length) add(out); else self.say('Choose pictures or video. Other files go in the Files tab.');
    };
    var sample = function (n) {
      var cols = [['#000065', '#23239b'], ['#b84a00', '#7a2e0e'], ['#15803d', '#0b4d24'], ['#5c3d1f', '#2b2620']], out = [];
      for (var i = 0; i < n; i++) { var c = cols[(items.length + i) % cols.length], svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="290" cy="120" r="46" fill="#fff" fill-opacity=".85"/><path d="M0 330 120 210l90 90 70-60 120 120v40H0z" fill="#fff" fill-opacity=".35"/></svg>'; out.push({ id: 'm' + Date.now() + i, name: 'Sample picture ' + (items.length + i + 1) + '.jpg', size: '1.2 MB', kind: 'image', url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) }); }
      add(out);
    };
    return { isMedia: true, isTrig: false, isPlain: false, key: fd.key, id: 'f-' + fd.key, label: fd.label, cls: 'wideF', hint: fd.hint || '', hasHint: !!fd.hint,
      items: items.map(function (m, i) { return { name: m.name, size: m.size, url: m.url, isImage: m.kind === 'image', isVideo: m.kind === 'video', aria: 'Remove ' + m.name, remove: function () { var cur = (self.state.form[fd.key] || []).slice(); cur.splice(i, 1); set(cur); } }; }), hasItems: items.length > 0,
      count: items.length + ' of ' + max, canAdd: left > 0, full: left <= 0, accept: 'image/*,video/*',
      onFiles: function (e) { if (e && e.target && e.target.files) { fromFiles(e.target.files); e.target.value = ''; } },
      over: function (e) { if (e && e.preventDefault) e.preventDefault(); }, drop: function (e) { if (e && e.preventDefault) { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files) fromFiles(e.dataTransfer.files); } },
      samples: function () { sample(Math.min(3, left)); }, clearAll: function () { set([]); } };
  }

  /* Pull a side sheet wider or narrower from its left edge. Double click puts it back. */
  edgeStart(e) {
    var el = document.getElementById('sheetEl'), edge = e.currentTarget; if (!el) return;
    if (e.preventDefault) e.preventDefault();
    var right = el.getBoundingClientRect().right, W = el.parentElement ? el.parentElement.clientWidth || window.innerWidth : window.innerWidth;
    edge.classList.add('dragging');
    var move = function (ev) { var w = Math.max(380, Math.min(right - ev.clientX, Math.min(980, W - 24))); el.style.setProperty('--shW', Math.round(w) + 'px'); };
    var up = function () { edge.classList.remove('dragging'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
