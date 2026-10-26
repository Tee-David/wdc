  /* ======================= Settings · bank accounts =======================
     Naira accounts are checked the way a payment provider checks them: the account number, then the bank, then the name comes back by itself.
     Dollar, pound and euro accounts each ask for what that country's banks need, check the numbers that can be checked, and finish with a test deposit.
     In the live product the naira lookup runs on the server with the provider's key, so no key ever reaches the browser. */
  ngBanks() {
    /* The Paystack list, with the tile colour used when a bank has no logo, and the banks people pick most. */
    var PAL = ['#1d4ed8', '#166534', '#9a3412', '#6b21a8', '#0f766e', '#b91c1c', '#374151', '#0369a1', '#7c2d12', '#4338ca', '#86198f', '#155e75'], FREQ = ['044', '011', '058', '033', '057', '999992', '999991', '50211', '50515', '232', '214', '070'];
    if (this._ngb) return this._ngb;
    this._ngb = this.ngBankData().map(function (x) {
      var h = 0; x[0].split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 997; });
      var short = x[0].replace(/\s*\(.*\)\s*$/, '').replace(/\b(Limited|Ltd|Plc|PLC|Microfinance Bank|MFB|Bank|Nigeria|Digital Services)\b/g, '').trim() || x[0];
      return { n: x[0], c: x[1], tone: PAL[h % PAL.length], freq: FREQ.indexOf(x[1]) >= 0, ini: short.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(), img: x[2] ? 'https://www.google.com/s2/favicons?domain=' + x[2] + '&sz=128' : '', kw: '' };
    });
    return this._ngb;
  }
  bankBy(code) { return this.ngBanks().filter(function (b) { return b.c === code; })[0]; }
  /* NUBAN: the tenth digit is a check digit of the bank code plus the nine serial digits. This is how a bank is suggested from a number alone. */
  nubanOk(acct, code) {
    if (!/^\d{10}$/.test(acct) || !/^\d{3}$/.test(code)) return false;
    var d = (code + acct.slice(0, 9)).split('').map(Number), w = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3], sum = 0, i;
    for (i = 0; i < 12; i++) sum += d[i] * w[i];
    return (10 - sum % 10) % 10 === +acct.charAt(9);
  }
  /* Same two steps as nomarc and NairaGate. Fintech wallets (OPay, PalmPay, Kuda, Moniepoint) are known by the first three digits. Every other bank is found by the NUBAN check digit, so more than one can fit and the person confirms. */
  bankCands(acct) {
    var self = this, all = this.ngBanks();
    if (!/^\d{10}$/.test(acct)) return [];
    var FIN = { '700': '999992', '701': '999992', '702': '999992', '703': '999992', '704': '999992', '705': '999992', '706': '999992', '707': '999992', '708': '999992', '900': '999992', '901': '999992', '902': '999992', '903': '999992', '904': '999992', '905': '999992', '906': '999992', '800': '999991', '801': '999991', '803': '999991', '807': '999991', '227': '50211', '814': '50515', '070': '50515' };
    var fin = FIN[acct.slice(0, 3)];
    if (fin) return all.filter(function (b) { return b.c === fin; });
    return all.filter(function (b) { return b.c.length === 3 && self.nubanOk(acct, b.c); }).sort(function (a, b) { return a.n.localeCompare(b.n); }).slice(0, 4);
  }
  /* the Bank field of the add-account sheet: a picker row with the bank's logo, banks suggested from the number, then the status of the lookup */
  bankField(fd, F, setF) {
    var self = this, acct = (F.acct || '').trim(), bc = F.bankCode || '', bk = bc ? this.bankBy(bc) : null, M = this.state.bankM, V = this.state.bankV, cands = this.bankCands(acct);
    var st = { k: '', text: '' }, ten = /^\d{10}$/.test(acct), matched = ten && M && M.acct === acct && M.status === 'done';
    if (ten) {
      if (M && M.acct === acct && M.status === 'loading') st = { k: 'load', text: 'Matching bank' };
      else if (!bk) st = { k: 'none', text: cands.length ? 'These banks fit the number. Pick yours, or search the full list.' : 'No bank fits this number. Search the full list.' };
      else if (V && V.status === 'loading') st = { k: 'load', text: 'Verifying account details' };
      else if (V && V.status === 'fail') st = { k: 'bad', text: V.why };
      else if (V && V.status === 'ok') st = { k: 'ok', text: V.name };
    }
    var suggest = matched && cands.length > 1 ? cands.map(function (c) { return { t: c.n, ini: c.ini, tone: c.tone, img: c.img, hasImg: !!c.img, imgCls: c.img ? ' hasImg' : '', cls: c.c === bc ? 'on' : '', pressed: c.c === bc ? 'true' : 'false', pick: function () { setF('bankCode', c.c); } }; }) : [];
    return { isBank: true, isTrig: false, isPlain: false, key: fd.key, id: 'f-' + fd.key, label: fd.label, cls: 'wideF', name: bk ? bk.n : 'Select bank', nameCls: bk ? '' : 'ph', ini: bk ? bk.ini : '', tone: bk ? bk.tone : 'var(--ad-tone-neutral)', img: bk ? bk.img : '', hasImg: !!(bk && bk.img), imgCls: bk && bk.img ? ' hasImg' : '', hasLogo: !!bk, noLogo: !bk,
      onOpen: function () { self.bankPicker(acct, bc, function (code) { setF('bankCode', code); }); },
      hasSuggest: suggest.length > 0, suggest: suggest, hasStatus: !!st.k, statCls: 'bnkStat ' + st.k, statText: st.text, isLoad: st.k === 'load', isOk: st.k === 'ok', isBad: st.k === 'bad', isNone: st.k === 'none', hasHint: false, hint: '' };
  }
  bankPicker(acct, current, onPick) {
    var self = this, I = this.icons(), cands = this.bankCands(acct), ids = cands.map(function (c) { return c.c; }), all = this.ngBanks();
    var rank = function (b) { return ids.indexOf(b.c) >= 0 ? 0 : (b.freq ? 1 : 2); };
    var sorted = all.slice().sort(function (a, b) { return rank(a) - rank(b) || a.n.localeCompare(b.n); });
    var pick = sorted.map(function (b) { return b.c; }).indexOf(current);
    this.open(this.sh({ eyebrow: 'Bank', title: 'Choose the bank', icon: I.cash, body: ids.length ? 'The bank that fits your account number comes first, then the banks used most. Search by name for the rest.' : 'The banks used most come first. Search by name for the rest.', listTitle: 'Banks', select: true, searchPh: 'Search bank name', pick: pick >= 0 ? pick : undefined, selectWhy: 'Choose the bank.',
      list: sorted.map(function (b) { return { t: b.n, s: ids.indexOf(b.c) >= 0 ? 'Fits your number' : (b.freq ? 'Used most' : 'Bank code ' + b.c), ini: b.ini, av: b.tone, img: b.img, ref: b, k: b.c + ' ' + b.n }; }),
      primary: 'Use this bank', secondary: 'Cancel', onPrimary: function (ctx) { if (ctx.item) onPick(ctx.item.ref.c); } }), true);
  }
  ngSamples() { return { '2084719354': ['058', 'WDC STUDIO LTD'], '0123456784': ['044', 'WDC STUDIO LTD'], '1012345671': ['057', 'WDC STUDIO LTD'], '3056781291': ['033', 'ADEBAYO KEHINDE OLUWASEUN'] }; }
  resolveNg(acct, code) {
    var self = this, S = this.ngSamples(), hit = S[acct], names = ['CHIDI NWANKWO EZE', 'FUNKE ADEYEMI BALOGUN', 'TEMITOPE OKAFOR AYODELE', 'ZAINAB MUSA IBRAHIM'], bank = this.bankBy(code); if (bank) bank = [bank.n, bank.c];
    return new Promise(function (ok) {
      setTimeout(function () {
        if (/0000$/.test(acct)) ok({ ok: false, why: 'We could not find that account at ' + (bank ? bank[0] : 'that bank') + '. Check the number and the bank.' });
        else if (hit && hit[0] !== code) ok({ ok: false, why: 'That number is not an account at ' + (bank ? bank[0] : 'that bank') + '. Try another bank from the list.' });
        else ok({ ok: true, name: hit ? hit[1] : names[(acct.split('').reduce(function (a, d) { return a + +d; }, 0) + +code) % names.length] });
      }, self.reduce ? 150 : 900);
    });
  }
  abaOk(r) { if (!/^\d{9}$/.test(r)) return false; var d = r.split('').map(Number); return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0; }
  ibanOk(v) { v = v.replace(/\s+/g, '').toUpperCase(); if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v)) return false; var s = v.slice(4) + v.slice(0, 4), n = ''; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c >= 65 ? (c - 55) : s.charAt(i); } var r = 0; for (var j = 0; j < n.length; j += 7) r = parseInt('' + r + n.slice(j, j + 7), 10) % 97; return r === 1; }
  openBankSheet() {
    var self = this, I = this.icons();
    var CUR = ['Naira (NGN)', 'US dollars (USD)', 'British pounds (GBP)', 'Euros (EUR)'], code = function (c) { return (/\((\w+)\)/.exec(c || '') || [])[1] || 'NGN'; };
    this.setState({ bankV: null, bankM: null }); this._bankKey = ''; this._matchKey = '';
    var V = function (st) { return st.bankV; };
    var req = function (v) { return (v || '').trim().length > 0; };
    this.open(this.sh({ eyebrow: 'Money', title: 'Add a bank account', icon: I.cash, wide: true, chipsFirst: true, focus: 'f-acct',
      body: 'Several accounts per currency are fine. Clients only ever see Paystack and Flutterwave, unless you turn manual transfers on. Each currency asks for what that country’s banks need.',
      form: { cur: 'Naira (NGN)', acctType: 'Checking', def: 'Not the default' },
      chipSets: function (st) {
        var f = st.form, c = code(f.cur), out = [{ key: 'cur', label: 'Currency', opts: CUR }];
        if (c === 'USD') out.push({ key: 'acctType', label: 'Account type', opts: ['Checking', 'Savings'] });
        if (c === 'EUR') out.push({ key: 'country', label: 'Country of the bank', opts: ['Ireland', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'Other'] });
        out.push({ key: 'def', label: 'Use for payouts', opts: ['Not the default', 'Make it the default'] });
        return out;
      },
      fields: function (st) {
        var f = st.form, c = code(f.cur);
        if (c === 'NGN') return [{ key: 'acct', label: 'Account number', ph: 'Enter 10 digit account number', mode: 'numeric', wide: true, hint: (f.acct || '').trim().length ? (f.acct || '').trim().length + ' of 10 digits.' : '10 digits. We suggest the bank, then the name fills in by itself. To try it: 2084719354.', check: function (v) { return v.trim() && !/^\d{0,10}$/.test(v.trim()) ? 'Numbers only, 10 digits.' : ''; } }, { key: 'bankCode', type: 'bank', label: 'Bank' }];
        var A = function (k, label, ph, extra) { return Object.assign({ key: k, label: label, ph: ph }, extra || {}); };
        if (c === 'USD') return [A('holder', 'Account holder', 'WDC Studio Ltd', { wide: true }), A('bank', 'Bank name', 'Chase, Wells Fargo or Mercury'), A('acct', 'Account number', '000123456789', { mode: 'numeric', check: function (v) { return v.trim() && !/^\d{4,17}$/.test(v.trim()) ? 'US account numbers are 4 to 17 digits.' : ''; } }), A('routing', 'Routing number (ABA)', '021000021', { mode: 'numeric', hint: 'Nine digits, printed on a US cheque.', check: function (v) { return v.trim() && (v.trim().length === 9 && !self.abaOk(v.trim()) ? 'That routing number does not pass the bank check digit. Look again.' : (/\D/.test(v) || v.trim().length > 9 ? 'Nine digits only.' : '')); } }), A('swift', 'SWIFT or BIC (for wires from abroad)', 'CHASUS33', { check: function (v) { return v.trim() && !/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(v.trim()) ? 'A SWIFT code has 8 or 11 characters.' : ''; }, hint: 'Optional for US transfers, needed for wires from outside the US.' }),
          A('street', 'Bank street address', '270 Park Avenue', { wide: true }), A('city', 'City', 'New York'), A('state', 'State', 'NY', { check: function (v) { return v.trim() && !/^[A-Za-z]{2}$/.test(v.trim()) ? 'Use the two letter state code.' : ''; } }), A('zip', 'ZIP code', '10017', { mode: 'numeric', check: function (v) { return v.trim() && !/^\d{5}(-\d{4})?$/.test(v.trim()) ? 'A ZIP code has 5 digits.' : ''; } }), A('bstreet', 'Studio address on the account', 'Street and number', { wide: true }), A('bcity', 'City'), A('bzip', 'Postcode')];
        if (c === 'GBP') return [A('holder', 'Account holder', 'WDC Studio Ltd', { wide: true }), A('bank', 'Bank name', 'Monzo, Barclays or Starling'), A('sort', 'Sort code', '04-00-04', { mode: 'numeric', check: function (v) { return v.trim() && !/^\d{2}-?\d{2}-?\d{2}$/.test(v.trim()) ? 'A sort code has 6 digits, like 04-00-04.' : ''; } }), A('acct', 'Account number', '12345678', { mode: 'numeric', check: function (v) { return v.trim() && !/^\d{8}$/.test(v.trim()) ? 'UK account numbers have 8 digits.' : ''; } }), A('iban', 'IBAN (optional)', 'GB29 NWBK 6016 1331 9268 19', { check: function (v) { return v.trim() && !self.ibanOk(v) ? 'That IBAN does not pass its check. Look again.' : ''; } }), A('street', 'Address on the account', 'Street and number', { wide: true }), A('city', 'City'), A('zip', 'Postcode', 'SW1A 1AA', { check: function (v) { return v.trim() && !/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(v.trim()) ? 'Check the postcode, like SW1A 1AA.' : ''; } })];
        return [A('holder', 'Account holder', 'WDC Studio Ltd', { wide: true }), A('bank', 'Bank name', 'AIB, Deutsche Bank or ING'), A('iban', 'IBAN', 'IE29 AIBK 9311 5212 3456 78', { wide: true, hint: 'Spaces are fine. We check the IBAN as you type.', check: function (v) { return v.trim() && !self.ibanOk(v) ? 'That IBAN does not pass its check. Look again.' : ''; } }), A('bic', 'BIC', 'AIBKIE2D', { check: function (v) { return v.trim() && !/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(v.trim()) ? 'A BIC has 8 or 11 characters.' : ''; } }), A('street', 'Address on the account', 'Street and number', { wide: true }), A('city', 'City'), A('zip', 'Postcode')];
      },
      watch: function (ctx, st) {
        var f = ctx.form; if (code(f.cur) !== 'NGN') return;
        var acct = (f.acct || '').trim(), bc = f.bankCode || '';
        if (!/^\d{10}$/.test(acct)) { if (st.bankV || st.bankM || bc) { self._bankKey = ''; self._matchKey = ''; self.setState({ bankV: null, bankM: null, form: bc ? Object.assign({}, st.form, { bankCode: '' }) : st.form }); } return; }
        if (self._matchKey !== acct) {
          self._matchKey = acct; self._bankKey = '';
          self.setState({ bankM: { acct: acct, status: 'loading' }, bankV: null, form: Object.assign({}, st.form, { bankCode: '' }) });
          setTimeout(function () { if (self._matchKey !== acct) return; var cands = self.bankCands(acct), one = cands.length === 1 ? cands[0].c : ''; self.setState({ bankM: { acct: acct, status: 'done', n: cands.length }, form: Object.assign({}, self.state.form, { bankCode: one }) }); }, self.reduce ? 100 : 700);
          return;
        }
        if (!bc || !st.bankM || st.bankM.status !== 'done') return;
        var key = acct + ':' + bc; if (self._bankKey === key) return; self._bankKey = key;
        self.setState({ bankV: { key: key, status: 'loading' } });
        self.resolveNg(acct, bc).then(function (r) { if (self._bankKey !== key) return; self.setState({ bankV: Object.assign({ key: key, status: r.ok ? 'ok' : 'fail' }, r) }); });
      },
      notice: function (ctx, st) {
        var f = ctx.form, c = code(f.cur), v = st.bankV;
        if (c === 'NGN') {
          var bk = self.bankBy(f.bankCode);
          if (!v || v.status !== 'ok') return { tone: 'var(--ad-tone-neutral)', icon: I.search, title: 'The account name appears here', body: 'Type the 10 digit number. We suggest the bank from the number, and the name is looked up with Paystack so it is never typed by hand.' };
          var match = /WDC STUDIO/.test(v.name);
          return { tone: match ? 'var(--ad-tone-good)' : 'var(--ad-tone-warn)', icon: match ? I.check : I.alert, title: v.name, body: match ? 'Verified with ' + (bk ? bk.n : 'the bank') + '. The name matches the studio.' : 'The name does not match the studio. Only add an account in the studio’s name unless you are sure, because payouts and transfers use it.' };
        }
        return { tone: 'var(--ad-tone-neutral)', icon: I.eye, title: 'Checked, then verified with a test deposit', body: 'We check the numbers that can be checked here. A small test deposit then confirms the account is real. It shows as Needs verification until you enter the amount.' };
      },
      primary: function (ctx) { return code(ctx.form.cur) === 'NGN' ? 'Add the verified account' : 'Add the account'; }, secondary: 'Cancel',
      primaryDis: function (ctx, st) {
        var f = ctx.form, c = code(f.cur), v = st.bankV;
        if (c === 'NGN') { if (!/^\d{10}$/.test((f.acct || '').trim())) return 'Add the 10 digit account number.'; if (!f.bankCode) return st.bankM && st.bankM.status === 'loading' ? 'Matching the bank.' : 'Choose the bank.'; if (!v || v.status === 'loading') return 'Waiting for the account check.'; if (v.status === 'fail') return 'Fix the account number or the bank, so it can be verified.'; return ''; }
        if (!req(f.holder)) return 'Add the account holder.'; if (!req(f.bank)) return 'Add the bank name.'; if (!req(f.street) || !req(f.city) || !req(f.zip)) return 'Add the address on the account.';
        if (c === 'USD') { if (!/^\d{4,17}$/.test((f.acct || '').trim())) return 'Add the account number.'; if (!self.abaOk((f.routing || '').trim())) return 'Add a valid 9 digit routing number.'; if (!/^[A-Za-z]{2}$/.test((f.state || '').trim())) return 'Add the two letter state code.'; if (!/^\d{5}(-\d{4})?$/.test((f.zip || '').trim())) return 'Add a 5 digit ZIP code.'; }
        if (c === 'GBP') { if (!/^\d{2}-?\d{2}-?\d{2}$/.test((f.sort || '').trim())) return 'Add the 6 digit sort code.'; if (!/^\d{8}$/.test((f.acct || '').trim())) return 'Add the 8 digit account number.'; if ((f.iban || '').trim() && !self.ibanOk(f.iban)) return 'The IBAN does not pass its check.'; }
        if (c === 'EUR') { if (!self.ibanOk(f.iban || '')) return 'Add a valid IBAN.'; if (!/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test((f.bic || '').trim())) return 'Add the BIC.'; if (!f.country) return 'Choose the country.'; }
        return '';
      },
      onPrimary: function (ctx, st) {
        var f = ctx.form, c = code(f.cur), v = self.state.bankV, name, bank, last4;
        var finish = function () {
          if (c === 'NGN') { name = v.name; bank = self.bankBy(f.bankCode).n; last4 = f.acct.trim().slice(-4); } else { name = f.holder.trim(); bank = f.bank.trim(); last4 = ((f.acct || f.iban || '').replace(/\s/g, '')).slice(-4); }
          var id = 'b' + Date.now(), entry = { id: id, t: bank + ' ' + c, s: '****' + last4 + ' · ' + name, cur: c, verified: c === 'NGN', ref: 'WDC-' + (1000 + Math.floor((Date.now() / 7) % 9000)), cents: 12 + Math.floor((Date.now() / 11) % 80) };
          self.setL('banks', (self.state.lists.banks || []).concat([entry]));
          if (f.def === 'Make it the default') self.setL('defBank', { id: id });
          self.setState({ sheet: null, stack: [] });
          self.say(c === 'NGN' ? 'Saved. ' + bank + ' is verified and added.' + (f.def === 'Make it the default' ? ' It is the default for payouts.' : '') : 'Saved. ' + bank + ' is added. Enter the test deposit amount to verify it.');
        };
        if (c !== 'NGN') { finish(); return; }
        var bk = self.bankBy(f.bankCode), acc = f.acct.trim().replace(/(\d{3})(\d{4})(\d{3})/, '$1 $2 $3');
        self.open(self.sh({ eyebrow: 'Check before you add', title: 'Add this account?', icon: I.check, iconTone: 'var(--ad-tone-good)',
          rows: [{ k: 'Name', v: v.name }, { k: 'Bank', v: bk.n }, { k: 'Account number', v: acc }],
          body: 'Check the details. Payouts and transfers use this account, and a transfer that has gone out cannot be reversed.', primary: 'Add account', secondary: 'Recheck',
          onPrimary: function () { finish(); } }), true);
      } }));
  }

  /* the test deposit: the amount is in the reference of a small transfer, and typing it back proves the account is the studio's */
  verifyBankSheet(b) {
    var self = this, I = this.icons(), sym = b.cur === 'USD' ? '$' : (b.cur === 'GBP' ? '£' : '€');
    this.open(this.sh({ eyebrow: 'Money', title: 'Verify ' + b.t, icon: I.cash, keepOpen: true, body: 'We sent a small deposit to ' + b.s.split(' · ')[0] + ' with the reference ' + b.ref + '. It lands in 1 to 2 working days. Enter the exact amount below to finish verifying. In the sample, the amount is ' + sym + '0.' + ('0' + b.cents).slice(-2) + '.', focus: 'f-amt',
      fields: [{ key: 'amt', label: 'Amount received (' + sym + ')', ph: '0.00', mode: 'decimal', wide: true, check: function (v) { return v.trim() && !/^\d{1,3}(\.\d{1,2})?$/.test(v.trim()) ? 'Use the amount, like 0.37.' : ''; } }],
      primary: 'Verify the account', secondary: 'Send the deposit again', primaryDis: function (ctx) { return /^\d{1,3}(\.\d{1,2})?$/.test((ctx.form.amt || '').trim()) ? '' : 'Enter the amount you received.'; },
      onPrimary: function (ctx) {
        var got = Math.round(parseFloat(ctx.form.amt) * 100);
        if (got !== b.cents) { self.say('That is not the amount we sent. Check the statement and try again. After 3 tries we send a new deposit.'); return; }
        var m = Object.assign({}, self.getL('ver')); m[b.id] = true; self.setState({ sheet: null, stack: [] }); self.setL('ver', m); self.say('Verified. ' + b.t + ' can be used for payouts and invoices.');
      },
      onSecondary: function () { self.say('A new test deposit is on its way. Allow 1 to 2 working days.'); return 'stay'; } }));
  }
