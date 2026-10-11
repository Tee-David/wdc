  /* ======================= tools: real CSV and Excel files, import with a sample, bulk select, filters ======================= */

  /* ---------- files: CSV, a small Excel (.xlsx) writer and reader, and the download ---------- */
  csvText(headers, rows) {
    var q = function (v) { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + [headers].concat(rows).map(function (r) { return r.map(q).join(','); }).join('\r\n') + '\r\n';
  }
  crc32(b) {
    var t = this._crcT; if (!t) { t = this._crcT = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) crc = t[(crc ^ b[i]) & 255] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  zipStore(files) {
    var enc = new TextEncoder(), parts = [], cen = [], off = 0;
    var u16 = function (v) { return [v & 255, (v >> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
    var self = this;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = self.crc32(data);
      var head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      cen.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
      off += head.length + name.length + data.length;
    });
    var cenLen = cen.reduce(function (a, p) { return a + p.length; }, 0);
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cenLen), u32(off), u16(0)));
    return new Blob(parts.concat(cen, [end]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  colLetter(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  xlsxBlob(headers, rows, sheet) {
    var self = this, esc = function (v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var cell = function (v, r, c, head) {
      var ref = self.colLetter(c) + (r + 1), st = head ? ' s="1"' : '';
      if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
      return '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + esc(v == null ? '' : v) + '</t></is></c>';
    };
    var all = [headers].concat(rows), widths = headers.map(function (h, c) { var w = String(h).length; rows.forEach(function (r) { w = Math.max(w, String(r[c] == null ? '' : r[c]).length); }); return Math.min(48, Math.max(10, w + 2)); });
    var sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' + widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols><sheetData>' + all.map(function (r, ri) { return '<row r="' + (ri + 1) + '">' + r.map(function (v, ci) { return cell(v, ri, ci, ri === 0); }).join('') + '</row>'; }).join('') + '</sheetData></worksheet>';
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    return this.zipStore([
      { name: '[Content_Types].xml', text: X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: '_rels/.rels', text: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', text: X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + esc((sheet || 'Sheet1').slice(0, 31)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', text: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', text: X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>' },
      { name: 'xl/worksheets/sheet1.xml', text: sheetXml }
    ]);
  }
  saveBlob(name, blob) {
    try { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return true; } catch (e) { return false; }
  }
  fileBlob(kind, headers, rows, sheet) { return kind === 'xlsx' ? this.xlsxBlob(headers, rows, sheet) : new Blob([this.csvText(headers, rows)], { type: 'text/csv;charset=utf-8' }); }
  parseCsv(text) {
    text = text.replace(/^﻿/, ''); var first = text.split(/\r?\n/)[0] || '', d = [',', ';', '\t'].map(function (x) { return [x, first.split(x).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === d) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }
  /* Reads a CSV or an Excel file into rows of text. Excel files are unzipped in the browser. */
  readTable(file) {
    var self = this;
    if (file.size > 5 * 1048576) return Promise.reject(new Error('That file is over 5 MB. Split it and import in two goes.'));
    var name = (file.name || '').toLowerCase();
    if (/\.(csv|txt)$/.test(name)) return file.text().then(function (t) { return self.tableOf(self.parseCsv(t)); });
    if (/\.xlsx$/.test(name)) return file.arrayBuffer().then(function (buf) { return self.readXlsx(buf); }).then(function (rows) { return self.tableOf(rows); });
    return Promise.reject(new Error('Use a CSV or an Excel (.xlsx) file. The sample shows the layout.'));
  }
  tableOf(rows) {
    if (rows.length < 2) throw new Error('We found a header row but no data rows. Add at least one row under the headers.');
    if (rows.length > 2001) throw new Error('That file has more than 2,000 rows. Split it and import in two goes.');
    return { headers: rows[0].map(function (h) { return String(h).trim(); }), rows: rows.slice(1) };
  }
  readXlsx(buf) {
    var self = this, b = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder(), end = -1, i;
    for (i = b.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
    if (end < 0) return Promise.reject(new Error('That does not look like an Excel file. Open it, save it as .xlsx and try again.'));
    var n = dv.getUint16(end + 10, true), p = dv.getUint32(end + 16, true), entries = {};
    for (i = 0; i < n; i++) {
      var method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true), nm = dec.decode(b.subarray(p + 46, p + 46 + nl));
      entries[nm] = { method: method, csz: csz, lo: lo }; p += 46 + nl + el + cl;
    }
    var read = function (name) {
      var e = entries[name]; if (!e) return Promise.resolve(null);
      var ln = dv.getUint16(e.lo + 26, true), le = dv.getUint16(e.lo + 28, true), data = b.subarray(e.lo + 30 + ln + le, e.lo + 30 + ln + le + e.csz);
      if (e.method === 0) return Promise.resolve(dec.decode(data));
      if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('This browser cannot open compressed Excel files. Save the sheet as CSV instead.'));
      return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(function (ab) { return dec.decode(ab); });
    };
    var firstSheet = Object.keys(entries).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); }).sort()[0];
    return Promise.all([read('xl/sharedStrings.xml'), read(firstSheet)]).then(function (r) {
      if (!r[1]) throw new Error('We could not find a sheet in that file.');
      var P = new DOMParser(), ss = [];
      if (r[0]) [].forEach.call(P.parseFromString(r[0], 'application/xml').getElementsByTagName('si'), function (si) { ss.push([].map.call(si.getElementsByTagName('t'), function (t) { return t.textContent; }).join('')); });
      var rows = [];
      [].forEach.call(P.parseFromString(r[1], 'application/xml').getElementsByTagName('row'), function (row) {
        var out = [];
        [].forEach.call(row.getElementsByTagName('c'), function (c) {
          var ref = c.getAttribute('r') || '', letters = ref.replace(/[0-9]/g, ''), idx = 0; for (var k = 0; k < letters.length; k++) idx = idx * 26 + letters.charCodeAt(k) - 64; idx--;
          var t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], val = '';
          if (t === 's' && v) val = ss[+v.textContent] || ''; else if (t === 'inlineStr') val = [].map.call(c.getElementsByTagName('t'), function (x) { return x.textContent; }).join(''); else if (v) val = v.textContent;
          while (out.length < idx) out.push(''); out[idx] = val;
        });
        rows.push(out);
      });
      return rows.filter(function (r2) { return r2.some(function (x) { return String(x).trim() !== ''; }); });
    });
  }

  /* ---------- export: choose the file, the rows and the columns, then a real file downloads ---------- */
  exportSheet(spec) {
    var self = this, I = this.icons(), cols = spec.cols, titles = cols.map(function (c) { return c.t; });
    var scopes = [['All ' + spec.all.length + ' ' + spec.noun, spec.all]];
    if (spec.filtered && spec.filtered.length !== spec.all.length) scopes.unshift(['The ' + spec.filtered.length + ' in this view', spec.filtered]);
    if (spec.selected && spec.selected.length) scopes.unshift([spec.selected.length + ' selected', spec.selected]);
    var rowsFor = function (f) { var hit = scopes.filter(function (x) { return x[0] === f.scope; })[0] || scopes[0]; return hit[1]; };
    this.open(this.sh({ eyebrow: 'Export', title: 'Export ' + spec.noun, icon: I.down, iconTone: 'var(--ad-tone-brand)',
      body: 'A real file downloads to this device. Open it in Excel, Numbers or Google Sheets.',
      chipSets: function () { return [{ key: 'fmt', label: 'File type', opts: ['CSV', 'Excel'], hint: 'CSV is plain text. Excel keeps column widths and a bold header row.' }, { key: 'scope', label: 'Rows', opts: scopes.map(function (x) { return x[0]; }) }, { key: 'cols', label: 'Columns', multi: true, opts: titles, hint: 'Untick what you do not need.' }]; },
      form: { fmt: 'CSV', scope: scopes[0][0], cols: titles.slice() },
      notice: function (ctx) { var f = ctx.form, n = rowsFor(f).length, c = (f.cols || []).length; return { tone: 'var(--ad-tone-neutral)', icon: I.file, title: n + (n === 1 ? ' row' : ' rows') + ', ' + c + (c === 1 ? ' column' : ' columns'), body: 'Dates read like 14 Oct 2026. Naira figures are plain numbers so a spreadsheet can add them up.' }; },
      primary: function (ctx) { return 'Download ' + (ctx.form.fmt === 'Excel' ? 'the Excel file' : 'the CSV'); }, secondary: 'Cancel',
      primaryDis: function (ctx) { if (!(ctx.form.cols || []).length) return 'Choose at least one column.'; if (!rowsFor(ctx.form).length) return 'There is nothing to export for that choice.'; return ''; },
      onPrimary: function (ctx) {
        var f = ctx.form, use = cols.filter(function (c) { return (f.cols || []).indexOf(c.t) >= 0; }), rows = rowsFor(f).map(function (r) { return use.map(function (c) { return c.v(r); }); });
        var ext = f.fmt === 'Excel' ? 'xlsx' : 'csv', name = spec.file + '-2026-10-10.' + ext, ok = self.saveBlob(name, self.fileBlob(ext, use.map(function (c) { return c.t; }), rows, spec.noun.replace(/^./, function (m) { return m.toUpperCase(); })));
        self.say(ok ? 'Downloaded ' + name + '. ' + rows.length + (rows.length === 1 ? ' row' : ' rows') + ', ' + use.length + ' columns.' : 'Your browser blocked the download. Allow downloads for this page and try again.');
      } }));
  }

  /* ---------- import: a sample to download, a file to bring back, a check of every row, then the import ---------- */
  importSheet(spec) {
    var self = this, I = this.icons(), headers = spec.fields.map(function (f) { return f.t; });
    var sampleBtn = function (kind) { return { label: 'Download', fn: function () { var ok = self.saveBlob(spec.file + '-sample.' + kind, self.fileBlob(kind, headers, spec.sample, spec.noun)); self.say(ok ? 'Sample downloaded. Replace the example rows with yours.' : 'Your browser blocked the download. Allow downloads for this page and try again.'); } }; };
    this.open(this.sh({ eyebrow: 'Import', title: 'Import ' + spec.noun, icon: I.upload, iconTone: 'var(--ad-tone-brand)', focus: 'shPrimary',
      body: spec.intro, listTitle: 'Start with the sample', search: false,
      list: [{ t: 'Sample CSV', s: 'Opens in Excel, Numbers or Google Sheets', ini: 'CSV', av: 'var(--ad-tone-brand)', act: sampleBtn('csv') }, { t: 'Sample Excel file', s: 'The same three example rows, ready to overwrite', ini: 'XLS', av: 'var(--ad-tone-good)', act: sampleBtn('xlsx') }],
      fields: [{ key: 'upload', type: 'file', label: 'Your file', accept: '.csv,.xlsx', hint: 'CSV or Excel, up to 5 MB and 2,000 rows. The first row holds the column names.' }],
      checks: [], notice: function (ctx) { var u = ctx.form.upload; return u ? null : { tone: 'var(--ad-tone-neutral)', icon: I.eye, title: 'Required columns: ' + spec.fields.filter(function (f) { return f.req; }).map(function (f) { return f.t; }).join(', '), body: spec.rule }; },
      primary: function (ctx) { var u = ctx.form.upload; return u ? 'Check ' + u.rows.length + (u.rows.length === 1 ? ' row' : ' rows') : 'Check the rows'; }, secondary: 'Cancel',
      primaryDis: function (ctx) { return ctx.form.upload ? '' : 'Choose your file first.'; }, keepOpen: true,
      onPrimary: function (ctx) { self.importReview(spec, ctx.form.upload); } }));
  }
  importReview(spec, up) {
    var self = this, I = this.icons(), norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
    var map = spec.fields.map(function (f) { var names = [f.k, f.t].concat(f.alias || []).map(norm), j = -1; up.headers.forEach(function (h, k) { if (j < 0 && names.indexOf(norm(h)) >= 0) j = k; }); return { f: f, j: j }; });
    var missing = map.filter(function (m) { return m.f.req && m.j < 0; }), seen = {}, recs = [];
    up.rows.forEach(function (r, i) {
      var rec = { _row: i + 2 }; map.forEach(function (m) { rec[m.f.k] = m.j >= 0 ? String(r[m.j] == null ? '' : r[m.j]).trim() : ''; });
      if (!Object.keys(rec).some(function (k) { return k !== '_row' && rec[k]; })) return;
      rec._why = spec.check(rec, seen) || ''; recs.push(rec);
    });
    var ready = recs.filter(function (r) { return !r._why; }), skipped = recs.filter(function (r) { return r._why; });
    var matched = map.filter(function (m) { return m.j >= 0; }).map(function (m) { return m.f.t; }), unmatched = up.headers.filter(function (h) { return !map.some(function (m) { return m.j >= 0 && up.headers[m.j] === h; }); });
    this.open(this.sh({ eyebrow: 'Import · ' + up.name, title: 'Check the rows', icon: I.check, iconTone: missing.length ? 'var(--ad-tone-bad)' : 'var(--ad-tone-good)', back: true,
      rows: [{ k: 'Rows read', v: '' + recs.length }, { k: 'Ready to import', v: '' + ready.length }, { k: 'Skipped', v: skipped.length ? skipped.length + ', see the list' : 'None' }, { k: 'Columns matched', v: matched.length + ' of ' + spec.fields.length }],
      notice: missing.length ? { tone: 'var(--ad-tone-bad)', icon: I.alert, title: 'A required column is missing: ' + missing.map(function (m) { return m.f.t; }).join(', '), body: 'Add it to the file, or rename the column to match, then choose the file again.' } : (unmatched.length ? { tone: 'var(--ad-tone-neutral)', icon: I.eye, title: 'Ignored columns: ' + unmatched.join(', '), body: 'They are not part of the import. Nothing is lost from your file.' } : null),
      listTitle: 'Rows', search: true, searchPh: 'Search the rows',
      list: recs.map(function (r) { return { t: spec.label(r), s: spec.detail(r) + (r._why ? '' : ''), ini: spec.initials ? spec.initials(r) : spec.label(r).charAt(0), av: r._why ? 'var(--ad-tone-bad)' : 'var(--ad-tone-good)', tag: r._why || 'Ready', tone: r._why ? 'var(--ad-tone-bad)' : 'var(--ad-tone-good)', k: 'row ' + r._row }; }),
      primary: ready.length ? 'Import ' + ready.length + (ready.length === 1 ? ' ' + spec.one : ' ' + spec.noun) : 'Nothing to import', secondary: skipped.length ? 'Download the skipped rows' : 'Back',
      primaryDis: function () { return missing.length ? 'Add the missing column first.' : (ready.length ? '' : 'Every row was skipped. Fix them in the file and choose it again.'); },
      onSecondary: function () { if (!skipped.length) { self.sheetBack(); return 'stay'; } var ok = self.saveBlob(spec.file + '-skipped.csv', self.fileBlob('csv', ['Row'].concat(headers(spec)).concat(['Why skipped']), skipped.map(function (r) { return [r._row].concat(spec.fields.map(function (f) { return r[f.k]; })).concat([r._why]); }))); self.say(ok ? 'Skipped rows downloaded, with the reason for each.' : 'Your browser blocked the download.'); return 'stay'; },
      onPrimary: function () { spec.onImport(ready); self.say('Imported ' + ready.length + (ready.length === 1 ? ' ' + spec.one : ' ' + spec.noun) + (skipped.length ? '. ' + skipped.length + ' skipped.' : '.')); } }), true);
    function headers(sp) { return sp.fields.map(function (f) { return f.t; }); }
  }

  /* ---------- bulk select: a checkbox on every row, a bar of actions while anything is ticked ---------- */
  selMap(key) { return (this.state.bsel || {})[key] || {}; }
  setSelMap(key, m) { var b = Object.assign({}, this.state.bsel); b[key] = m; this.setState({ bsel: b }); }
  rowSel(key, id, label) {
    var self = this, on = !!this.selMap(key)[id];
    return { sel: on ? 'true' : 'false', selCls: on ? 'on' : '', selRow: on ? 'selRow' : '', selAria: (on ? 'Deselect ' : 'Select ') + label, togSel: function (e) { if (e && e.stopPropagation) e.stopPropagation(); var m = Object.assign({}, self.selMap(key)); if (m[id]) delete m[id]; else m[id] = true; self.setSelMap(key, m); } };
  }
  /* The toolbar above a table or list. cfg: noun, pageIds, allIds, rowsById(ids), acts, exportFn, importFn, facets, rows */
  toolsView(key, cfg) {
    var self = this, I = this.icons(), sel = this.selMap(key), ids = Object.keys(sel).filter(function (k) { return sel[k]; });
    var live = {}; (cfg.allIds || []).forEach(function (i) { live[i] = true; }); ids = ids.filter(function (i) { return live[i]; });
    var pageOn = (cfg.pageIds || []).filter(function (i) { return sel[i]; }).length, pageN = (cfg.pageIds || []).length;
    var flt = this.fltOf(key), chips = [];
    (cfg.facets || []).forEach(function (fc) {
      if (fc.type === 'range') { if (flt[fc.k + 'From'] || flt[fc.k + 'To']) chips.push({ t: fc.t + ': ' + (flt[fc.k + 'From'] ? self.fmtDate(flt[fc.k + 'From']) : 'any') + ' to ' + (flt[fc.k + 'To'] ? self.fmtDate(flt[fc.k + 'To']) : 'any'), aria: 'Remove the ' + fc.t + ' filter', remove: function () { var f = Object.assign({}, self.fltOf(key)); delete f[fc.k + 'From']; delete f[fc.k + 'To']; self.setFlt(key, f); } }); return; }
      (flt[fc.k] || []).forEach(function (v) { chips.push({ t: fc.t + ': ' + v, aria: 'Remove ' + fc.t + ' ' + v, remove: function () { var f = Object.assign({}, self.fltOf(key)); f[fc.k] = (f[fc.k] || []).filter(function (x) { return x !== v; }); if (!f[fc.k].length) delete f[fc.k]; self.setFlt(key, f); } }); });
    });
    var chosen = function () { return cfg.rowsById ? cfg.rowsById(ids) : []; };
    return {
      bulk: ids.length > 0, idle: ids.length === 0, count: ids.length + ' selected', sr: ids.length + ' ' + cfg.noun + ' selected',
      acts: (cfg.acts || []).map(function (a) { return { label: a.label, d: a.icon || I.check, cls: a.danger ? 'danger' : '', fn: function () { a.fn(chosen(), function () { self.setSelMap(key, {}); }); } }; }),
      exportSel: function () { if (cfg.exportFn) cfg.exportFn(chosen()); }, clear: function () { self.setSelMap(key, {}); },
      headState: pageN && pageOn === pageN ? 'true' : (pageOn ? 'mixed' : 'false'), headCls: pageN && pageOn === pageN ? 'on' : (pageOn ? 'mix' : ''), headAria: pageOn === pageN && pageN ? 'Deselect all ' + pageN + ' on this page' : 'Select all ' + pageN + ' on this page',
      togAll: function () { var m = Object.assign({}, self.selMap(key)); if (pageN && pageOn === pageN) cfg.pageIds.forEach(function (i) { delete m[i]; }); else cfg.pageIds.forEach(function (i) { m[i] = true; }); self.setSelMap(key, m); },
      allMore: ids.length > 0 && ids.length < (cfg.allIds || []).length && pageN && pageOn === pageN && (cfg.allIds || []).length > pageN, allLabel: 'Select all ' + (cfg.allIds || []).length, selectAll: function () { var m = {}; (cfg.allIds || []).forEach(function (i) { m[i] = true; }); self.setSelMap(key, m); },
      hasFilters: !!(cfg.facets && cfg.facets.length), fn: chips.length, hasFn: chips.length > 0, chips: chips, hasChips: chips.length > 0, openFilters: function () { self.filterSheet(key, cfg); }, clearFilters: function () { self.setFlt(key, {}); self.say('Filters cleared.'); },
      canExport: !!cfg.exportFn, exportFn: function () { cfg.exportFn([]); }, canImport: !!cfg.importFn, importFn: function () { cfg.importFn(); }
    };
  }

  /* ---------- filters: each table or list says what can be filtered, the sheet collects it, chips show it ---------- */
  fltOf(key) { return (this.state.flt || {})[key] || {}; }
  setFlt(key, f) { var all = Object.assign({}, this.state.flt), patch = { flt: all, ra: (this.state.ra || 0) + 1 }, st = this.state; all[key] = f; ['cpage', 'ppage', 'mpage', 'bpage', 'spage', 'tpage', 'fpage', 'apage', 'lpage', 'qpage'].forEach(function (k) { if (k in st) patch[k] = 0; }); this.setState(patch); }
  applyFlt(key, rows, facets) {
    var flt = this.fltOf(key);
    return rows.filter(function (r) {
      return (facets || []).every(function (fc) {
        if (fc.type === 'range') { var v = fc.get(r), a = flt[fc.k + 'From'], b = flt[fc.k + 'To']; if (!a && !b) return true; if (!v) return false; return (!a || v >= a) && (!b || v <= b); }
        var sel = flt[fc.k]; if (!sel || !sel.length) return true; var got = fc.get(r); got = Array.isArray(got) ? got : [got]; return got.some(function (g) { return sel.indexOf(g) >= 0; });
      });
    });
  }
  filterSheet(key, cfg) {
    var self = this, I = this.icons(), flt = this.fltOf(key), facets = cfg.facets || [], form = {};
    facets.forEach(function (fc) { if (fc.type === 'range') { form[fc.k + 'From'] = flt[fc.k + 'From'] || ''; form[fc.k + 'To'] = flt[fc.k + 'To'] || ''; } else form[fc.k] = (flt[fc.k] || []).slice(); });
    var sets = facets.filter(function (fc) { return fc.type !== 'range'; }), ranges = facets.filter(function (fc) { return fc.type === 'range'; });
    var count = function (rows) { return self.applyFlt(key, rows, facets).length; };
    this.open(this.sh({ eyebrow: 'Filters', title: 'Filter ' + cfg.noun, icon: I.search, iconTone: 'var(--ad-tone-brand)', body: 'Pick any combination. Nothing is hidden for good, and Clear all brings everything back.', form: form,
      chipSets: sets.map(function (fc) { return { key: fc.k, label: fc.t, multi: true, opts: fc.opts, hint: fc.hint || '' }; }),
      fields: ranges.reduce(function (a, fc) { return a.concat([{ key: fc.k + 'From', type: 'date', label: fc.t + ' from', min: '2000-01-01', clearable: true }, { key: fc.k + 'To', type: 'date', label: fc.t + ' to', min: '2000-01-01', clearable: true }]); }, []),
      notice: function (ctx) {
        var f = ctx.form, tmp = Object.assign({}, self.state.flt); tmp[key] = f; var n = (cfg.unfiltered || cfg.rows || []).filter(function (r) { return (facets).every(function (fc) { if (fc.type === 'range') { var v = fc.get(r), a = f[fc.k + 'From'], b = f[fc.k + 'To']; if (!a && !b) return true; if (!v) return false; return (!a || v >= a) && (!b || v <= b); } var sl = f[fc.k]; if (!sl || !sl.length) return true; var g = fc.get(r); g = Array.isArray(g) ? g : [g]; return g.some(function (x) { return sl.indexOf(x) >= 0; }); }); }).length;
        return { tone: n ? 'var(--ad-tone-neutral)' : 'var(--ad-tone-warn)', icon: I.eye, title: n + (n === 1 ? ' ' + (cfg.one || cfg.noun) : ' ' + cfg.noun) + ' match', body: n ? 'This is what the list shows after you apply.' : 'Nothing matches that combination. Loosen one of the filters.' };
      },
      primary: 'Apply filters', secondary: 'Clear all',
      onPrimary: function (ctx) { var f = {}, any = false; facets.forEach(function (fc) { if (fc.type === 'range') { var a = ctx.form[fc.k + 'From'], b = ctx.form[fc.k + 'To']; if (a) { f[fc.k + 'From'] = a; any = true; } if (b) { f[fc.k + 'To'] = b; any = true; } } else if ((ctx.form[fc.k] || []).length) { f[fc.k] = ctx.form[fc.k]; any = true; } }); self.setFlt(key, f); self.say(any ? 'Filters applied.' : 'No filters set. Showing everything.'); },
      onSecondary: function () { self.setFlt(key, {}); self.say('Filters cleared.'); } }));
  }

  /* ---------- the client import: columns, a sample, and the rules that stop a second record for the same person ---------- */
  clientImportSpec(existing, land) {
    var self = this;
    return { noun: 'clients', one: 'client', file: 'wdc-clients', intro: 'Bring clients over from a spreadsheet. Every row is checked against your current clients first, so nobody gets a second record or a second portal.', rule: 'One row per person. The email is how a returning client is matched, and the phone is the second check.',
      fields: [{ k: 'name', t: 'Business name', req: true, alias: ['company', 'business', 'organisation'] }, { k: 'contact', t: 'Main contact', req: true, alias: ['contact name', 'person', 'full name', 'contact person'] }, { k: 'email', t: 'Email', req: true, alias: ['email address'] }, { k: 'phone', t: 'Phone', alias: ['phone number', 'mobile', 'whatsapp'] }, { k: 'services', t: 'Services', alias: ['service', 'interested in'] }, { k: 'status', t: 'Status', alias: ['type', 'stage'] }],
      sample: [['Baba Fresh Foods', 'Funke A.', 'funke@babafresh.ng', '+234 802 000 0001', 'Social media; Brand identity', 'Client'], ['Kemi Hair Studio', 'Kemi O.', 'hello@kemihair.ng', '+234 805 000 0002', 'Website', 'Lead'], ['Zuri Fashion House', 'Zuri K.', 'zuri@zurifashion.ng', '+234 807 000 0003', 'SEO', 'Client']],
      check: function (r, seen) {
        if (!r.name) return 'Missing business name'; if (!r.contact) return 'Missing contact'; if (!r.email) return 'Missing email';
        var em = r.email.toLowerCase(), dg = self.digitsOf(r.phone);
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return 'Invalid email'; if (self.isTempEmail(em)) return 'Temporary inbox';
        var hit = existing().filter(function (c) { return (c.email && c.email.toLowerCase() === em) || (dg.length >= 10 && self.digitsOf(c.phone) === dg); })[0]; if (hit) return 'Already a client: ' + hit.name;
        if (seen[em]) return 'Repeated in this file'; seen[em] = true; return '';
      },
      label: function (r) { return r.name || 'No name'; }, detail: function (r) { return (r.contact || 'No contact') + ' · ' + (r.email || 'No email'); }, initials: function (r) { return (r.name || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(); },
      onImport: function (ready) {
        var stamp = Date.now();
        land(ready.map(function (r, i) { var ini = (r.name).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(), lead = /lead/i.test(r.status); return { id: 'imp' + stamp + i, name: r.name, ini: ini, tone: '#000065', contact: r.contact, email: r.email, phone: r.phone || 'Not given', services: r.services ? r.services.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean) : ['Not set'], live: 0, owed: 0, late: 0, retainer: 0, since: lead ? '' : 'Oct 2026', last: 'Imported from a spreadsheet', lastWhen: 'Just now', status: lead ? 'lead' : 'active', portal: lead ? 'No portal yet' : 'Invite sent today', isNew: true }; }));
      } };
  }
