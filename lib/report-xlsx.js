import ExcelJS from 'exceljs';
import { ADDRESS_PARTS } from '@/lib/address';
import { answerText } from '@/lib/format';
import { statusLabel } from '@/lib/shipping';
import { HAS_OPTIONS, TYPES } from '@/lib/questions';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF1F6' } };

function styleHeader(row) {
  row.font = { bold: true };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', wrapText: true };
  row.height = 30;
}

// Excel berisi tabel data: sheet "Jawaban" (satu baris per pengisi, alamat dipecah per kolom)
// dan sheet "Ringkasan" (rekap tiap pertanyaan). Semua nilai ditulis sebagai teks/angka, bukan rumus.
export async function reportXlsx(d, { appName, origin }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = appName;
  wb.created = new Date();

  const ws = wb.addWorksheet('Jawaban', { views: [{ state: 'frozen', ySplit: 1 }] });
  const cols = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Waktu (UTC)', key: 'at', width: 20 },
  ];
  for (const q of d.questions) {
    if (q.type === 'address') {
      for (const p of ADDRESS_PARTS) cols.push({ header: `${q.label} - ${p.label}`, key: `${q.id}_${p.key}`, width: p.key === 'street' ? 45 : p.key === 'postal' ? 11 : 22 });
    } else {
      cols.push({ header: q.label, key: q.id, width: q.type === 'long' ? 45 : 24 });
    }
  }
  cols.push(
    { header: 'Status pengiriman', key: 'status', width: 18 },
    { header: 'Barang', key: 'items', width: 28 },
    { header: 'Kurir', key: 'courier', width: 16 },
    { header: 'No. resi', key: 'resi', width: 22 },
    { header: 'Link lacak', key: 'track', width: 40 }
  );
  ws.columns = cols;
  styleHeader(ws.getRow(1));

  d.rows.forEach((r, i) => {
    const row = { no: i + 1, at: r.created_at };
    for (const q of d.questions) {
      const a = r.answers[q.id];
      if (q.type === 'address') for (const p of ADDRESS_PARTS) row[`${q.id}_${p.key}`] = a?.[p.key] ?? '';
      else if (q.type === 'rating') row[q.id] = typeof a === 'number' ? a : '';
      else row[q.id] = answerText(a);
    }
    row.status = statusLabel(r.status);
    row.items = r.items || '';
    row.courier = r.courier || '';
    row.resi = r.tracking_no || '';
    row.track = r.track_token ? `${origin}/lacak/${r.track_token}` : '';
    ws.addRow(row).alignment = { vertical: 'top', wrapText: true };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

  // Ringkasan
  const sm = wb.addWorksheet('Ringkasan');
  sm.columns = [{ width: 42 }, { width: 14 }, { width: 12 }];
  const info = [
    ['Form', d.form.title],
    ['Brand', d.brandName],
    ['Periode', d.rangeLabel],
    ['Dibuat', d.generatedAt],
    ['Jawaban masuk', d.rows.length],
    ['Affiliate unik (per nomor WhatsApp)', d.affiliates],
    ['Barang dikirim', d.shipped],
    ['Konten tayang', d.posted],
  ];
  for (const [k, v] of info) sm.addRow([k, v]).getCell(1).font = { bold: true };
  sm.addRow([]);
  const block = (title, items, total) => {
    const h = sm.addRow([title, 'Jumlah', 'Persen']);
    styleHeader(h);
    h.height = 20;
    for (const it of items) {
      const row = sm.addRow([it.label, it.count, total ? it.count / total : 0]);
      row.getCell(3).numFmt = '0%';
    }
    sm.addRow([]);
  };
  block('Status pengiriman', d.statusCounts, d.rows.length);
  for (const q of d.summary.questions) {
    const label = `${q.label} (${TYPES.find((t) => t.value === q.type)?.label || q.type}, ${q.answered} menjawab)`;
    if (HAS_OPTIONS.includes(q.type) || q.type === 'rating') block(label, q.options, q.answered);
    else if (q.provinces) block(`${label} - per provinsi`, q.provinces, q.answered);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
