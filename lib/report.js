import { db } from '@/lib/db';
import { buildSummary, RANGES } from '@/lib/stats';
import { respondent, personKey, FLOW, STATUSES } from '@/lib/shipping';

// Data laporan satu form (dipakai Excel dan PDF agar angkanya selalu sama).
export async function reportData(form, range = 'all') {
  const brand = await db.get('SELECT name FROM brands WHERE id=?', form.brand_id);
  const questions = JSON.parse(form.questions);
  const all = (
    await db.all(
      `SELECT r.id, r.answers, r.created_at, r.track_token, COALESCE(s.status, 'pending') AS status, s.items, s.courier, s.tracking_no
       FROM responses r LEFT JOIN shipments s ON s.response_id=r.id
       WHERE r.form_id=? AND r.deleted_at IS NULL ORDER BY r.id`,
      form.id
    )
  ).map((r) => ({ ...r, answers: JSON.parse(r.answers) }));

  const summary = buildSummary(questions, all, range);
  const start = summary.buckets[0].date;
  const rows = range === 'all' ? all : all.filter((r) => r.created_at.slice(0, 10) >= start);
  for (const r of rows) r.who = respondent(questions, r.answers, r.id);
  const reached = (i) => rows.filter((r) => FLOW.indexOf(r.status) >= i).length;
  const today = new Date().toISOString().slice(0, 10);

  return {
    form,
    brandName: brand?.name || '',
    questions,
    rows,
    summary,
    rangeLabel: range === 'all' ? 'Semua jawaban' : `${RANGES.find((r) => r.value === range)?.label} terakhir (${start} s/d ${today})`,
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    affiliates: new Set(rows.map((r) => personKey(r.who))).size,
    shipped: reached(2),
    posted: reached(4),
    statusCounts: STATUSES.map((s) => ({ label: s.label, count: rows.filter((r) => r.status === s.value).length })),
  };
}

// Nama file aman: laporan-<judul>-<tanggal>.<ext>
export const reportFileName = (form, ext) =>
  `laporan-${form.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 50) || 'survey'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
