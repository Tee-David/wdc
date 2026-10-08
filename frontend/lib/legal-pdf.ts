import "server-only";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage } from "pdf-lib";
import { A4, C, FOOT, INNER, M, drawable, load, wrap } from "@/lib/forms/entry-pdf";
import { CONTACT_EMAIL, COMPANY_NAME, SITE_URL } from "@/lib/site";
import type { LegalDoc } from "@/lib/legal";

/**
 * A POLICY AS AN A4 PDF, drawn the way the brief PDF is: our mark faint behind
 * every page, a navy band with the full logo and the title, then the text in
 * Space Grotesk. One function for every policy, so they cannot drift apart. A
 * tabbed policy prints General first and then each service under its own
 * heading, in the order of the page.
 */
export async function renderLegalPdf(doc: LegalDoc): Promise<Uint8Array> {
  const a = load();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(doc.title);
  pdf.setSubject(`Last updated ${doc.updated}`);
  pdf.setAuthor(COMPANY_NAME);
  pdf.setCreator("We Dig Creativity");
  const reg = await pdf.embedFont(a.medium, { subset: true });
  const bold = await pdf.embedFont(a.bold, { subset: true });
  const mark = await pdf.embedPng(a.mark);
  const logo = await pdf.embedPng(a.logo);

  let page = null as unknown as PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([A4.w, A4.h]);
    const s = 300;
    page.drawImage(mark, { x: (A4.w - s) / 2, y: (A4.h - s) / 2, width: s, height: s, opacity: 0.06 });
    y = A4.h - M;
  };
  const room = (h: number) => { if (y - h < M + FOOT) newPage(); };
  const text = (s: string, x: number, yy: number, font: PDFFont, sz: number, color = C.ink) =>
    page.drawText(drawable(font, s), { x, y: yy, size: sz, font, color });

  newPage();
  const titleLines = wrap(bold, doc.title, 22, INNER).slice(0, 2);
  const logoH = 30;
  const logoW = (logo.width / logo.height) * logoH;
  const bandH = 40 + logoH + 22 + titleLines.length * 26 + 26;
  page.drawRectangle({ x: 0, y: A4.h - bandH, width: A4.w, height: bandH, color: C.navy });
  page.drawImage(logo, { x: M, y: A4.h - 36 - logoH, width: logoW, height: logoH });
  let ty = A4.h - 36 - logoH - 34;
  for (const l of titleLines) { text(l, M, ty, bold, 22, C.onNavy); ty -= 26; }
  text(`Last updated ${doc.updated}`, M, ty + 4, reg, 10, C.onNavyDim);
  y = A4.h - bandH - 28;

  const LH = 15;
  const paragraph = (s: string, font = reg, sz = 10.5, color = C.ink) => {
    for (const line of wrap(font, s, sz, INNER)) { room(LH); text(line, M, y - 11, font, sz, color); y -= LH; }
    y -= 7;
  };
  const heading = (s: string, big = false) => {
    room(big ? 70 : 56);
    y -= big ? 18 : 12;
    if (big) {
      page.drawRectangle({ x: M, y: y - 26, width: INNER, height: 26, color: C.navy });
      text(s, M + 10, y - 18, bold, 12, C.onNavy);
      y -= 40;
    } else {
      for (const l of wrap(bold, s, 12, INNER)) { room(LH + 4); text(l, M, y - 12, bold, 12, C.accentInk); y -= LH + 2; }
      page.drawLine({ start: { x: M, y: y + 2 }, end: { x: A4.w - M, y: y + 2 }, thickness: 0.8, color: C.accentInk });
      y -= 8;
    }
  };

  paragraph(doc.intro, reg, 11);
  if (doc.tabs) {
    for (const tab of doc.tabs) {
      const mine = doc.sections.filter((x) => (x.tab ?? doc.tabs![0].id) === tab.id);
      if (!mine.length) continue;
      heading(tab.label, true);
      for (const sec of mine) { heading(sec.heading); sec.body.forEach((p) => paragraph(p)); }
    }
  } else {
    for (const sec of doc.sections) { heading(sec.heading); sec.body.forEach((p) => paragraph(p)); }
  }
  heading("Questions");
  paragraph(`Write to ${CONTACT_EMAIL}. The current version of this policy is always at ${SITE_URL}/legal.`);

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M + 16 }, end: { x: A4.w - M, y: M + 16 }, thickness: 0.6, color: C.rule });
    const left = i === 0 ? `${COMPANY_NAME} · ${SITE_URL.replace(/^https?:\/\//, "")}` : `${doc.title} · ${doc.updated}`;
    p.drawText(drawable(reg, wrap(reg, left, 8.5, INNER - 90)[0] ?? ""), { x: M, y: M, size: 8.5, font: reg, color: C.dim });
    const right = `Page ${i + 1} of ${pages.length}`;
    p.drawText(right, { x: A4.w - M - reg.widthOfTextAtSize(right, 8.5), y: M, size: 8.5, font: reg, color: C.dim });
  });
  return pdf.save();
}
