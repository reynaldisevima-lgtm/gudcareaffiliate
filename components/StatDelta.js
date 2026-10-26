import { fmtNum } from '@/lib/format';

// Selisih terhadap periode sebelumnya; tanda ▲/▼ dan teks membuat arahnya tidak bergantung pada warna.
export default function StatDelta({ total, prev, days }) {
  if (prev === null) return null;
  const diff = total - prev;
  if (diff === 0) return <p className="stat-delta">Sama dengan {days} hari sebelumnya</p>;
  return (
    <p className={`stat-delta ${diff > 0 ? 'up' : 'down'}`}>
      <span aria-hidden="true">{diff > 0 ? '▲' : '▼'}</span> {diff > 0 ? '+' : '−'}{fmtNum(Math.abs(diff))} dibanding {days} hari sebelumnya
    </p>
  );
}
