import { db } from '@/lib/db';
import { buildSummary } from '@/lib/stats';
import { respondent, personKey, FLOW, STATUSES } from '@/lib/shipping';

// Kelompok terbesar dulu; sisanya digabung menjadi "Lainnya" agar daftar tetap ringkas.
function topCounts(rows, keyOf, limit = 8) {
  const m = new Map();
  for (const r of rows) { const k = keyOf(r); m.set(k, (m.get(k) || 0) + 1); }
  const sorted = [...m].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  if (sorted.length <= limit) return sorted;
  const rest = sorted.slice(limit - 1).reduce((a, r) => a + r.count, 0);
  return [...sorted.slice(0, limit - 1), { label: `Lainnya (${sorted.length - limit + 1})`, count: rest }];
}

// Ringkasan lintas form untuk halaman Dashboard. Admin: semua brand atau satu brand; user brand: brand miliknya.
export async function buildOverview(user, { range, brandId }) {
  const where = ['r.deleted_at IS NULL', 'f.deleted_at IS NULL'];
  const args = [];
  if (user.role !== 'admin') { where.push('f.brand_id=?'); args.push(user.brand_id); }
  else if (brandId) { where.push('f.brand_id=?'); args.push(brandId); }
  const scope = 'WHERE ' + where.join(' AND ');

  const rows = (
    await db.all(
      `SELECT r.id, r.answers, r.created_at, f.id AS form_id, f.title AS form_title, f.questions,
              b.name AS brand_name, COALESCE(s.status, 'pending') AS status
       FROM responses r JOIN forms f ON f.id=r.form_id JOIN brands b ON b.id=f.brand_id
       LEFT JOIN shipments s ON s.response_id=r.id ${scope}`,
      ...args
    )
  ).map((r) => ({ ...r, answers: JSON.parse(r.answers) }));

  // Tren & perbandingan periode memakai logika yang sama dengan tab Ringkasan per form.
  const summary = buildSummary([], rows, range);
  const start = summary.buckets[0].date;
  const inRange = rows.filter((r) => r.created_at.slice(0, 10) >= start);

  const questionsByForm = new Map();
  const people = new Set();
  for (const r of inRange) {
    if (!questionsByForm.has(r.form_id)) questionsByForm.set(r.form_id, JSON.parse(r.questions));
    people.add(personKey(respondent(questionsByForm.get(r.form_id), r.answers, r.id)));
  }

  const stage = (r) => FLOW.indexOf(r.status); // -1 untuk 'returned'
  const reached = (i) => inRange.filter((r) => stage(r) >= i).length;
  const funnel = [
    { label: 'Mengisi form', count: inRange.length },
    { label: 'Dikemas', count: reached(1) },
    { label: 'Dikirim', count: reached(2) },
    { label: 'Diterima', count: reached(3) },
    { label: 'Konten tayang', count: reached(4) },
  ];

  const activity = await recentActivity(scope, args);

  return {
    ...summary,
    affiliates: people.size,
    shipped: reached(2),
    posted: reached(4),
    returned: inRange.filter((r) => r.status === 'returned').length,
    funnel,
    statusNow: STATUSES.map((s) => ({ label: s.label, count: inRange.filter((r) => r.status === s.value).length })),
    byBrand: topCounts(inRange, (r) => r.brand_name),
    byForm: topCounts(inRange, (r) => r.form_title),
    activity,
  };
}

// Jawaban baru dan update pengiriman terakhir, digabung urut waktu.
async function recentActivity(scope, args) {
  const [responses, events] = await Promise.all([
    db.all(
      `SELECT r.id, r.answers, r.created_at, f.title AS form_title, f.questions
       FROM responses r JOIN forms f ON f.id=r.form_id ${scope} ORDER BY r.id DESC LIMIT 8`,
      ...args
    ),
    db.all(
      `SELECT e.id, e.status, e.actor, e.created_at, r.id AS response_id, r.answers, f.title AS form_title, f.questions
       FROM shipment_events e JOIN shipments s ON s.id=e.shipment_id JOIN responses r ON r.id=s.response_id
       JOIN forms f ON f.id=r.form_id ${scope} ORDER BY e.id DESC LIMIT 8`,
      ...args
    ),
  ]);
  const name = (r, id) => respondent(JSON.parse(r.questions), JSON.parse(r.answers), id).name;
  return [
    ...responses.map((r) => ({ key: `r${r.id}`, at: r.created_at, responseId: r.id, who: name(r, r.id), what: `mengisi ${r.form_title}` })),
    ...events.map((e) => ({ key: `e${e.id}`, at: e.created_at, responseId: e.response_id, who: name(e, e.response_id), what: `· diperbarui oleh ${e.actor}`, status: e.status })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, 8);
}
