import PDFDocument from 'pdfkit';
import { TYPES, HAS_OPTIONS } from '@/lib/questions';
import { answerText, fmtNum } from '@/lib/format';
import { statusLabel } from '@/lib/shipping';
import { JAKARTA_REGULAR, JAKARTA_BOLD } from '@/lib/pdf-fonts';

// Font tersemat hanya berisi huruf Latin; karakter lain (mis. aksara non-Latin, emoji) diganti '?' agar tidak tampil kotak.
const clean = (s) => String(s ?? '').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—‘’“”•…]/g, '?');
const INK = '#2a3547';
const MUTED = '#5a6a85';
const LINE = '#e5eaef';

// Laporan rinci: identitas & periode, angka utama, rekap tiap pertanyaan (dengan batang),
// status pengiriman, dan daftar penerima (alamat, status, resi). colors: { chart, track } dari warna utama aplikasi.
export function reportPdf(d, { appName, colors }) {
  // font: buffer TTF tersemat, sehingga pdfkit tidak memuat font standar (.afm) dari disk.
  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, font: JAKARTA_REGULAR, info: { Title: clean(`Laporan ${d.form.title}`), Author: clean(appName) } });
  doc.registerFont('Regular', JAKARTA_REGULAR);
  doc.registerFont('Bold', JAKARTA_BOLD);
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const space = (h) => { if (doc.y + h > bottom()) doc.addPage(); };
  const h2 = (text) => { space(60); doc.moveDown(0.8).font('Bold').fontSize(14).fillColor(INK).text(clean(text), L, doc.y, { width: W }).moveDown(0.4); };
  const muted = (text, size = 9) => doc.font('Regular').fontSize(size).fillColor(MUTED).text(clean(text), L, doc.y, { width: W });

  // Batang horizontal: label | batang | jumlah · persen
  function bars(items, total) {
    const labelW = W * 0.42, barW = W * 0.4, valX = L + labelW + barW + 10;
    for (const it of items) {
      const lh = doc.font('Regular').fontSize(9.5).heightOfString(clean(it.label), { width: labelW - 8 });
      const rowH = Math.max(lh, 12) + 6;
      space(rowH);
      const y = doc.y;
      doc.fillColor(INK).text(clean(it.label), L, y, { width: labelW - 8 });
      const pct = total ? it.count / total : 0;
      doc.save().roundedRect(L + labelW, y + 2, barW, 8, 3).fill(colors.track);
      if (pct > 0) doc.roundedRect(L + labelW, y + 2, Math.max(barW * pct, 3), 8, 3).fill(colors.chart);
      doc.restore();
      doc.font('Bold').fillColor(INK).text(`${fmtNum(it.count)}`, valX, y, { continued: true }).font('Regular').fillColor(MUTED).text(`  ${Math.round(pct * 100)}%`);
      doc.y = y + rowH;
    }
  }

  // Tabel dengan header berulang di setiap halaman.
  function table(columns, data) {
    const pad = 4;
    const drawHeader = () => {
      const y = doc.y;
      doc.save().rect(L, y, W, 18).fill('#eef1f6').restore();
      let x = L;
      doc.font('Bold').fontSize(8.5).fillColor(INK);
      for (const c of columns) { doc.text(c.label, x + pad, y + 5, { width: c.w * W - pad * 2 }); x += c.w * W; }
      doc.y = y + 20;
    };
    drawHeader();
    for (const row of data) {
      doc.font('Regular').fontSize(8.5);
      const h = Math.max(...columns.map((c) => doc.heightOfString(clean(row[c.key]), { width: c.w * W - pad * 2 }))) + pad * 2;
      if (doc.y + h > bottom()) { doc.addPage(); drawHeader(); doc.font('Regular').fontSize(8.5); }
      const y = doc.y;
      let x = L;
      for (const c of columns) { doc.fillColor(INK).text(clean(row[c.key]), x + pad, y + pad, { width: c.w * W - pad * 2 }); x += c.w * W; }
      doc.moveTo(L, y + h).lineTo(L + W, y + h).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.y = y + h;
    }
  }

  // Kepala laporan
  doc.save().rect(0, 0, doc.page.width, 6).fill(colors.chart).restore();
  doc.font('Regular').fontSize(9).fillColor(MUTED).text(clean(`${appName} · Laporan survey affiliate`), L, 30, { width: W });
  doc.moveDown(0.6).font('Bold').fontSize(20).fillColor(INK).text(clean(d.form.title), { width: W });
  doc.moveDown(0.3);
  muted(`Brand: ${d.brandName}   ·   Periode: ${d.rangeLabel}   ·   Dibuat: ${d.generatedAt}`, 9.5);

  // Angka utama
  doc.moveDown(1);
  const kpis = [
    ['Jawaban masuk', d.rows.length],
    ['Affiliate unik', d.affiliates],
    ['Barang dikirim', d.shipped],
    ['Konten tayang', d.posted],
  ];
  const gap = 10, boxW = (W - gap * 3) / 4, y0 = doc.y;
  kpis.forEach(([label, value], i) => {
    const x = L + i * (boxW + gap);
    doc.save().roundedRect(x, y0, boxW, 56, 6).fill('#f4f6fa').restore();
    doc.font('Regular').fontSize(8.5).fillColor(MUTED).text(label, x + 10, y0 + 10, { width: boxW - 20 });
    doc.font('Bold').fontSize(20).fillColor(INK).text(fmtNum(value), x + 10, y0 + 24, { width: boxW - 20 });
  });
  doc.y = y0 + 66;
  if (d.rows.length === 0) muted('Belum ada jawaban pada periode ini.', 10);

  // Status pengiriman
  h2('Status pengiriman');
  bars(d.statusCounts, d.rows.length);

  // Rekap per pertanyaan
  h2('Rekap per pertanyaan');
  d.summary.questions.forEach((q, i) => {
    space(50);
    doc.moveDown(0.5).font('Bold').fontSize(11).fillColor(INK).text(clean(`${i + 1}. ${q.label}`), L, doc.y, { width: W });
    muted(`${TYPES.find((t) => t.value === q.type)?.label || q.type} · ${fmtNum(q.answered)} dari ${fmtNum(d.rows.length)} menjawab`);
    doc.moveDown(0.3);
    if (HAS_OPTIONS.includes(q.type)) bars(q.options, q.answered);
    else if (q.type === 'rating') {
      doc.font('Bold').fontSize(11).fillColor(INK).text(`Rata-rata ${q.average === null ? '-' : fmtNum(q.average, 1)} dari 5`, L, doc.y);
      doc.moveDown(0.2);
      bars(q.options.map((o) => ({ ...o, label: `Nilai ${o.label}` })), q.answered);
    } else if (q.type === 'address') {
      bars(q.provinces.slice(0, 10), q.answered);
    } else if (q.type === 'file') {
      muted(`${fmtNum(q.answered)} file diunggah.`, 9.5);
    } else if (q.latest?.length) {
      muted('Jawaban terbaru:', 9);
      for (const a of q.latest) { space(16); doc.font('Regular').fontSize(9.5).fillColor(INK).text(clean(`•  ${a.text}`), L + 6, doc.y, { width: W - 6 }); }
    }
  });

  // Daftar penerima
  if (d.rows.length) {
    doc.addPage();
    doc.font('Bold').fontSize(14).fillColor(INK).text('Daftar pengisi & pengiriman', L, doc.y).moveDown(0.5);
    const addrQ = d.questions.find((q) => q.type === 'address');
    table(
      [
        { key: 'no', label: 'No', w: 0.05 },
        { key: 'name', label: 'Nama', w: 0.15 },
        { key: 'wa', label: 'WhatsApp', w: 0.17 },
        { key: 'addr', label: 'Alamat', w: 0.35 },
        { key: 'status', label: 'Status', w: 0.12 },
        { key: 'resi', label: 'Kurir / resi', w: 0.16 },
      ],
      d.rows.map((r, i) => ({
        no: String(i + 1),
        name: r.who.name,
        wa: r.who.detail,
        addr: addrQ ? answerText(r.answers[addrQ.id]) || '-' : '-',
        status: statusLabel(r.status),
        resi: r.tracking_no ? `${r.courier || 'Kurir'}\n${r.tracking_no}` : '-',
      }))
    );
  }

  // Nomor halaman
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const mb = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Regular').fontSize(8).fillColor(MUTED).text(clean(`${d.form.title} · halaman ${i + 1} dari ${range.count}`), L, doc.page.height - 30, { width: W, align: 'center' });
    doc.page.margins.bottom = mb;
  }
  doc.end();
  return done;
}
