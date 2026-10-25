  docKind() { return 'receipt'; }
  /* The printer view is what /r/<token> opens on, and "View full receipt" is the document. Replay restarts the CSS, as the live one does. */
  docExtra(M) {
    var self = this, s = this.state, part = s.st === 'partial', amt = part ? 150000 : 450000, ng = function (n) { return '₦' + Math.round(n).toLocaleString('en-NG'); };
    return {
      showPrinter: s.view === 'printer', showDoc: s.view !== 'printer',
      prStatus: s.st === 'refunded' ? 'Payment refunded' : 'Payment received', prNo: M.no, prWhen: '9 Oct 2026 · 14:22', prMethod: 'Paystack', prInvoice: 'INV-26-9QX4LM',
      prLine: 'Social media management, 3 months', prAmt: ng(amt), prSub: ng(450000), prTotal: ng(450000), prPaid: ng(amt), prBal: part ? ng(300000) + ' due' : 'Settled in full',
      prThanks: s.st === 'refunded' ? 'Payment refunded' : 'Thank you for your payment.',
      fullReceipt: function () { self.set({ view: 'full' }); }, backToPrinter: function () { self.set({ view: 'printer' }); },
      replay: function () { var el = document.querySelector('.rp'); if (!el) return; el.classList.remove('rp--run'); void el.offsetWidth; el.classList.add('rp--run'); },
      copyNo: function () { self.say(M.no + ' copied.'); }
    };
  }
