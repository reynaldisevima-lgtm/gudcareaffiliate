import { HAS_OPTIONS } from '@/lib/questions';
import { answerText } from '@/lib/format';

const DAY = 86400000;

export const RANGES = [
  { value: '7', label: '7 hari' },
  { value: '30', label: '30 hari' },
  { value: '90', label: '90 hari' },
  { value: 'all', label: 'Semua' },
];

// created_at dari SQLite: 'YYYY-MM-DD HH:MM:SS' dalam UTC.
const parseUtc = (s) => new Date(s.replace(' ', 'T') + 'Z').getTime();
const dayStart = (t) => t - (t % DAY);

const has = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

function countOptions(q, values) {
  const counts = new Map(q.options.map((o) => [o, 0]));
  for (const v of values) {
    for (const o of Array.isArray(v) ? v : [v]) counts.set(o, (counts.get(o) || 0) + 1);
  }
  // Opsi yang sudah dihapus dari form tetap tampil di akhir karena jawabannya nyata.
  return [...counts].map(([label, count]) => ({ label, count }));
}

// Ringkasan hasil satu form untuk rentang waktu tertentu (semua hitungan dalam UTC).
export function buildSummary(questions, rows, range, now = Date.now()) {
  const all = rows.map((r) => ({ answers: r.answers, created_at: r.created_at, t: parseUtc(r.created_at) }));
  const today = dayStart(now);
  const days = RANGES.some((r) => r.value === range && range !== 'all') ? Number(range) : null;
  const first = all.length ? dayStart(Math.min(...all.map((r) => r.t))) : today;
  const start = days ? today - (days - 1) * DAY : Math.min(first, today);
  const inRange = all.filter((r) => r.t >= start);
  const prev = days ? all.filter((r) => r.t >= start - days * DAY && r.t < start).length : null;

  const spanDays = Math.round((today - start) / DAY) + 1;
  const step = spanDays > 92 ? 7 : 1;
  const buckets = [];
  for (let s = start; s <= today; s += step * DAY) buckets.push({ date: new Date(s).toISOString().slice(0, 10), count: 0 });
  for (const r of inRange) {
    const i = Math.floor((dayStart(r.t) - start) / (step * DAY));
    if (buckets[i]) buckets[i].count += 1;
  }

  const latestFirst = [...inRange].sort((a, b) => b.t - a.t);
  const perQuestion = questions.map((q) => {
    const answered = latestFirst.filter((r) => has(r.answers[q.id]));
    const values = answered.map((r) => r.answers[q.id]);
    const base = { id: q.id, label: q.label, type: q.type, answered: answered.length };
    if (HAS_OPTIONS.includes(q.type)) return { ...base, options: countOptions(q, values) };
    if (q.type === 'rating') {
      const nums = values.map(Number).filter((n) => n >= 1 && n <= 5);
      return {
        ...base,
        average: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
        options: [5, 4, 3, 2, 1].map((n) => ({ label: String(n), count: nums.filter((x) => x === n).length })),
      };
    }
    if (q.type === 'file') return base;
    if (q.type === 'address') {
      // Sebaran provinsi (terbanyak dulu) + alamat terbaru.
      const byProvince = countOptions({ options: [] }, values.map((v) => v.province)).sort((a, b) => b.count - a.count);
      return { ...base, provinces: byProvince, latest: answered.slice(0, 5).map((r) => ({ text: answerText(r.answers[q.id]), at: r.created_at })) };
    }
    return { ...base, latest: answered.slice(0, 5).map((r) => ({ text: answerText(r.answers[q.id]), at: r.created_at })) };
  });

  return {
    total: inRange.length,
    prev,
    days,
    spanDays,
    perDay: inRange.length / spanDays,
    last: all.length ? all.reduce((a, b) => (b.t > a.t ? b : a)).created_at : null,
    step,
    buckets,
    questions: perQuestion,
  };
}
