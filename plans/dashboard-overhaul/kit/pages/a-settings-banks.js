  /* ======================= Settings · bank accounts =======================
     Naira accounts are checked the way a payment provider checks them: the account number, then the bank, then the name comes back by itself.
     Dollar, pound and euro accounts each ask for what that country's banks need, check the numbers that can be checked, and finish with a test deposit.
     In the live product the naira lookup runs on the server with the provider's key, so no key ever reaches the browser. */
  ngBanks() {
    return [['Access Bank', '044'], ['Fidelity Bank', '070'], ['First Bank of Nigeria', '011'], ['FCMB', '214'], ['Globus Bank', '103'], ['Guaranty Trust Bank', '058'], ['Heritage Bank', '030'], ['Jaiz Bank', '301'], ['Keystone Bank', '082'], ['Kuda', '50211'], ['Moniepoint', '50515'], ['OPay', '999992'], ['PalmPay', '999991'], ['Polaris Bank', '076'], ['Providus Bank', '101'], ['Stanbic IBTC', '221'], ['Standard Chartered', '068'], ['Sterling Bank', '232'], ['Titan Trust Bank', '102'], ['UBA', '033'], ['Union Bank', '032'], ['Unity Bank', '215'], ['Wema Bank', '035'], ['Zenith Bank', '057'], ['Ecobank', '050']];
  }
  /* sample accounts that resolve, so the lookup can be tried without a real account */
  ngSamples() { return { '2084719356': ['058', 'WDC STUDIO LTD'], '0123456789': ['044', 'WDC STUDIO LTD'], '1012345678': ['057', 'WDC STUDIO LTD'], '3056781290': ['033', 'ADEBAYO KEHINDE OLUWASEUN'] }; }
  resolveNg(acct, code) {
    var self = this, S = this.ngSamples(), hit = S[acct], names = ['CHIDI NWANKWO EZE', 'FUNKE ADEYEMI BALOGUN', 'TEMITOPE OKAFOR AYODELE', 'ZAINAB MUSA IBRAHIM'], bank = this.ngBanks().filter(function (b) { return b[1] === code; })[0];
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
    var self = this, I = this.icons(), banks = this.ngBanks();
    var CUR = ['Naira (NGN)', 'US dollars (USD)', 'British pounds (GBP)', 'Euros (EUR)'], code = function (c) { return (/\((\w+)\)/.exec(c || '') || [])[1] || 'NGN'; };
    this.setState({ bankV: null });
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
        if (c === 'NGN') return [{ key: 'acct', label: 'Account number', ph: '0123456789', mode: 'numeric', wide: true, hint: V(st) && V(st).status === 'loading' ? 'Checking the account…' : '10 digits. Then choose the bank and the name fills in by itself. To try it: 2084719356 at Guaranty Trust Bank.', check: function (v) { return v.trim() && !/^\d{0,10}$/.test(v.trim()) ? 'Numbers only.' : (v.trim().length === 10 || !v.trim() ? '' : (v.trim().length > 0 ? '' : '')); } }];
        var A = function (k, label, ph, extra) { return Object.assign({ key: k, label: label, ph: ph }, extra || {}); };
        if (c === 'USD') return [A('holder', 'Account holder', 'WDC Studio Ltd', { wide: true }), A('bank', 'Bank name', 'Chase, Wells Fargo or Mercury'), A('acct', 'Account number', '000123456789', { mode: 'numeric', check: function (v) { return v.trim() && !/^\d{4,17}$/.test(v.trim()) ? 'US account numbers are 4 to 17 digits.' : ''; } }), A('routing', 'Routing number (ABA)', '021000021', { mode: 'numeric', hint: 'Nine digits, printed on a US cheque.', check: function (v) { return v.trim() && (v.trim().length === 9 && !self.abaOk(v.trim()) ? 'That routing number does not pass the bank check digit. Look again.' : (/\D/.test(v) || v.trim().length > 9 ? 'Nine digits only.' : '')); } }), A('swift', 'SWIFT or BIC (for wires from abroad)', 'CHASUS33', { check: function (v) { return v.trim() && !/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(v.trim()) ? 'A SWIFT code has 8 or 11 characters.' : ''; }, hint: 'Optional for US transfers, needed for wires from outside the US.' }),
          A('street', 'Bank street address', '270 Park Avenue', { wide: true }), A('city', 'City', 'New York'), A('state', 'State', 'NY', { check: function (v) { return v.trim() && !/^[A-Za-z]{2}$/.test(v.trim()) ? 'Use the two letter state code.' : ''; } }), A('zip', 'ZIP code', '10017', { mode: 'numeric', check: function (v) { return v.trim() && !/^\d{5}(-\d{4})?$/.test(v.trim()) ? 'A ZIP code has 5 digits.' : ''; } }), A('bstreet', 'Studio address on the account', 'Street and number', { wide: true }), A('bcity', 'City'), A('bzip', 'Postcode')];
        if (c === 'GBP') return [A('holder', 'Account holder', 'WDC Studio Ltd', { wide: true }), A('bank', 'Bank name', 'Monzo, Barclays or Starling'), A('sort', 'Sort code', '04-00-04', { mode: 'numeric', check: function (v) { return v.trim() && !/^\d{2}-?\d{2}-?\d{2}$/.test(v.trim()) ? 'A sort code has 6 digits, like 04-00-04.' : ''; } }), A('acct', 'Account number', '12345678', { mode: 'numeric', check: function (v) { return v.trim() && !/^\d{8}$/.test(v.trim()) ? 'UK account numbers have 8 digits.' : ''; } }), A('iban', 'IBAN (optional)', 'GB29 NWBK 6016 1331 9268 19', { check: function (v) { return v.trim() && !self.ibanOk(v) ? 'That IBAN does not pass its check. Look again.' : ''; } }), A('street', 'Address on the account', 'Street and number', { wide: true }), A('city', 'City'), A('zip', 'Postcode', 'SW1A 1AA', { check: function (v) { return v.trim() && !/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(v.trim()) ? 'Check the postcode, like SW1A 1AA.' : ''; } })];
        return [A('holder', 'Account holder', 'WDC Studio Ltd', { wide: true }), A('bank', 'Bank name', 'AIB, Deutsche Bank or ING'), A('iban', 'IBAN', 'IE29 AIBK 9311 5212 3456 78', { wide: true, hint: 'Spaces are fine. We check the IBAN as you type.', check: function (v) { return v.trim() && !self.ibanOk(v) ? 'That IBAN does not pass its check. Look again.' : ''; } }), A('bic', 'BIC', 'AIBKIE2D', { check: function (v) { return v.trim() && !/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(v.trim()) ? 'A BIC has 8 or 11 characters.' : ''; } }), A('street', 'Address on the account', 'Street and number', { wide: true }), A('city', 'City'), A('zip', 'Postcode')];
      },
      listTitle: 'Bank', select: true, selectRequired: false, searchPh: 'Search banks',
      list: function (st) { return code(st.form.cur) !== 'NGN' ? [] : banks.map(function (b) { return { t: b[0], s: 'Bank code ' + b[1], ini: b[0].split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(), av: 'var(--ad-tone-brand)', ref: b }; }); },
      watch: function (ctx, st) {
        var f = ctx.form; if (code(f.cur) !== 'NGN') return;
        var acct = (f.acct || '').trim(), b = ctx.item && ctx.item.ref, key = acct + ':' + (b ? b[1] : '');
        if (!/^\d{10}$/.test(acct) || !b) { if (st.bankV && st.bankV.key !== key) self.setState({ bankV: null }); self._bankKey = ''; return; }
        if (self._bankKey === key) return; self._bankKey = key;
        self.setState({ bankV: { key: key, status: 'loading' } });
        self.resolveNg(acct, b[1]).then(function (r) { if (self._bankKey !== key) return; self.setState({ bankV: Object.assign({ key: key, status: r.ok ? 'ok' : 'fail' }, r) }); });
      },
      notice: function (ctx, st) {
        var f = ctx.form, c = code(f.cur), v = st.bankV;
        if (c === 'NGN') {
          if (!v) return { tone: 'var(--ad-tone-neutral)', icon: I.search, title: 'The account name appears here', body: 'Type the 10 digit number, then choose the bank. We look the account up with Paystack, so the name is never typed by hand.' };
          if (v.status === 'loading') return { tone: 'var(--ad-tone-brand)', icon: I.clock, title: 'Checking the account…', body: 'Asking the bank who owns it. This takes a second.' };
          if (v.status === 'fail') return { tone: 'var(--ad-tone-bad)', icon: I.alert, title: 'We could not verify this account', body: v.why };
          var match = /WDC STUDIO/.test(v.name);
          return { tone: match ? 'var(--ad-tone-good)' : 'var(--ad-tone-warn)', icon: match ? I.check : I.alert, title: v.name, body: match ? 'Verified with ' + (ctx.item ? ctx.item.ref[0] : 'the bank') + '. The name matches the studio.' : 'The name does not match the studio. Only add an account in the studio’s name unless you are sure, because payouts and transfers use it.' };
        }
        return { tone: 'var(--ad-tone-neutral)', icon: I.eye, title: 'Checked, then verified with a test deposit', body: 'We check the numbers that can be checked here. A small test deposit then confirms the account is real. It shows as Needs verification until you enter the amount.' };
      },
      primary: function (ctx) { return code(ctx.form.cur) === 'NGN' ? 'Add the verified account' : 'Add the account'; }, secondary: 'Cancel',
      primaryDis: function (ctx, st) {
        var f = ctx.form, c = code(f.cur), v = st.bankV;
        if (c === 'NGN') { if (!/^\d{10}$/.test((f.acct || '').trim())) return 'Add the 10 digit account number.'; if (!ctx.item) return 'Choose the bank.'; if (!v || v.status === 'loading') return 'Waiting for the account check.'; if (v.status === 'fail') return 'Fix the account number or the bank, so it can be verified.'; return ''; }
        if (!req(f.holder)) return 'Add the account holder.'; if (!req(f.bank)) return 'Add the bank name.'; if (!req(f.street) || !req(f.city) || !req(f.zip)) return 'Add the address on the account.';
        if (c === 'USD') { if (!/^\d{4,17}$/.test((f.acct || '').trim())) return 'Add the account number.'; if (!self.abaOk((f.routing || '').trim())) return 'Add a valid 9 digit routing number.'; if (!/^[A-Za-z]{2}$/.test((f.state || '').trim())) return 'Add the two letter state code.'; if (!/^\d{5}(-\d{4})?$/.test((f.zip || '').trim())) return 'Add a 5 digit ZIP code.'; }
        if (c === 'GBP') { if (!/^\d{2}-?\d{2}-?\d{2}$/.test((f.sort || '').trim())) return 'Add the 6 digit sort code.'; if (!/^\d{8}$/.test((f.acct || '').trim())) return 'Add the 8 digit account number.'; if ((f.iban || '').trim() && !self.ibanOk(f.iban)) return 'The IBAN does not pass its check.'; }
        if (c === 'EUR') { if (!self.ibanOk(f.iban || '')) return 'Add a valid IBAN.'; if (!/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test((f.bic || '').trim())) return 'Add the BIC.'; if (!f.country) return 'Choose the country.'; }
        return '';
      },
      onPrimary: function (ctx, st) {
        var f = ctx.form, c = code(f.cur), v = self.state.bankV, name, bank, last4;
        if (c === 'NGN') { name = v.name; bank = ctx.item.ref[0]; last4 = f.acct.trim().slice(-4); } else { name = f.holder.trim(); bank = f.bank.trim(); last4 = ((f.acct || f.iban || '').replace(/\s/g, '')).slice(-4); }
        var id = 'b' + Date.now(), entry = { id: id, t: bank + ' ' + c, s: '****' + last4 + ' · ' + name, cur: c, verified: c === 'NGN', ref: 'WDC-' + (1000 + Math.floor((Date.now() / 7) % 9000)), cents: 12 + Math.floor((Date.now() / 11) % 80) };
        self.setL('banks', (self.state.lists.banks || []).concat([entry]));
        if (f.def === 'Make it the default') self.setL('defBank', { id: id });
        self.say(c === 'NGN' ? 'Saved. ' + bank + ' is verified and added.' + (f.def === 'Make it the default' ? ' It is the default for payouts.' : '') : 'Saved. ' + bank + ' is added. Enter the test deposit amount to verify it.');
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
