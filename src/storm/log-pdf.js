/* Storm drainage log -> PDF, generated in the browser with pdf-lib (self-hosted, pinned 1.17.1,
 * loaded only when the user exports). Same content as the planner's LaTeX log:
 * title, 2024 UPC Tables 1103.2 / 1103.1, Q = A x R x 0.0104, the area table and the footnote. */
let libP = null;
function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!libP) libP = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = new URL('../vendor/pdf-lib.min.js', document.baseURI).href;
    sc.onload = () => res(window.PDFLib);
    sc.onerror = () => { libP = null; rej(new Error('could not load the PDF library (offline?)')); };
    document.head.appendChild(sc);
  });
  return libP;
}
const MAP = { '″': '"', '′': "'", '“': '"', '”': '"', '‘': "'", '’': "'", '–': '-', '—': '-', '…': '...', '≤': '<=', '≥': '>=', '½': '1/2', '¼': '1/4', '¾': '3/4', '·': '-', '\u00a0': ' ' };
function clean(t) { return String(t == null ? '' : t).replace(/[^\x20-\x7e×°]/g, (c) => MAP[c] !== undefined ? MAP[c] : '?'); }

export async function buildStormLogPdf(log) {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, M = 54;
  let page = doc.addPage([W, H]);
  let y = H - M;
  const center = (t, f, size) => { t = clean(t); page.drawText(t, { x: (W - f.widthOfTextAtSize(t, size)) / 2, y, size, font: f }); };
  const wrap = (t, f, size, width) => {
    const words = clean(t).split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (f.widthOfTextAtSize(n, size) > width && cur) { lines.push(cur); cur = w; } else cur = n; }
    if (cur) lines.push(cur); return lines;
  };
  const para = (t, size, f) => { for (const l of wrap(t, f || font, size, W - 2 * M)) { page.drawText(l, { x: M, y, size, font: f || font }); y -= size * 1.35; } };
  const title = (log.title || 'Storm drainage log').trim().slice(0, 120);
  center(title, bold, 16); y -= 20;
  center('Storm drainage sizing log', font, 11); y -= 15;
  center('2024 Uniform Plumbing Code, Tables 1103.2 and 1103.1', font, 9); y -= 24;
  para('Q = A × R × 0.0104 gallons per minute, with A in square feet and R in inches per hour. Horizontal pipe is sized first, then the vertical leader. Utilization is design area divided by the allowable area at the listed rainfall.', 9.5);
  y -= 10;
  const cols = [['', 18, 'r'], ['Area', 150, 'l'], ['Roof sf', 48, 'r'], ['in/h', 34, 'r'], ['Slope', 40, 'l'], ['Horiz', 34, 'r'], ['H %', 40, 'r'], ['Vert', 30, 'r'], ['V %', 40, 'r'], ['gpm', 50, 'r']];
  const tableW = cols.reduce((a, c) => a + c[1], 0);
  const x0 = (W - tableW) / 2, size = 8.5, rowH = 14;
  const rule = () => page.drawLine({ start: { x: x0, y: y + rowH - 4 }, end: { x: x0 + tableW, y: y + rowH - 4 }, thickness: 0.7, color: rgb(0, 0, 0) });
  const row = (cells, f) => {
    let x = x0;
    cells.forEach((c, i) => {
      let t = clean(c); const [, w, al] = cols[i];
      while (t && f.widthOfTextAtSize(t, size) > w - 3) t = t.slice(0, -1);
      const tw = f.widthOfTextAtSize(t, size);
      page.drawText(t, { x: al === 'r' ? x + w - tw - 2 : x + 2, y, size, font: f });
      x += w;
    });
    y -= rowH;
  };
  const header = () => { rule(); row(cols.map((c) => c[0]), bold); rule(); };
  header();
  (log.rows || []).forEach((r, i) => {
    if (y < M + 40) { page = doc.addPage([W, H]); y = H - M; header(); }
    const star = r.hOk && r.vOk ? '' : ' *';
    row([String(i + 1), r.label, Math.round(r.roof).toString(), (+r.rainfall).toFixed(2), r.slope, Math.round(r.hSize).toString(),
      (+r.hUtil).toFixed(1) + '%', Math.round(r.vSize).toString(), (+r.vUtil).toFixed(1) + '%', (+r.qEach).toFixed(1) + star], font);
  });
  rule(); y -= 12;
  para('A star marks a size that exceeds the published table. Verify rainfall with the authority having jurisdiction and the roof drain manufacturer\'s rating before issuing drawings.', 7.5);
  doc.setTitle(clean(title)); doc.setCreator('Plumbing tools');
  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}
