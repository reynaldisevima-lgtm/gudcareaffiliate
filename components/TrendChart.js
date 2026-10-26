'use client';
import { useState } from 'react';

function niceStep(max) {
  const raw = Math.max(1, max / 4);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag);
}

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// Kolom jumlah jawaban per hari/minggu, dengan tooltip saat hover atau fokus (panah kiri/kanan).
export default function TrendChart({ buckets, weekly }) {
  const [active, setActive] = useState(null);
  const max = Math.max(0, ...buckets.map((b) => b.count));
  const step = niceStep(max);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  const n = buckets.length;
  const label = (b) => (weekly ? `Minggu ${fmtDate(b.date)}` : fmtDate(b.date));
  const xLabels = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];

  function onKey(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setActive((a) => Math.min(n - 1, Math.max(0, (a ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))));
  }

  return (
    <div className="trend">
      <div
        className="trend-plot"
        tabIndex={0}
        aria-label={`Grafik jawaban per ${weekly ? 'minggu' : 'hari'}. Gunakan panah kiri dan kanan untuk membaca nilai.`}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <div key={t} className="trend-grid" style={{ bottom: `${(t / top) * 100}%` }}>
            <span>{t}</span>
          </div>
        ))}
        <div className="trend-cols">
          {buckets.map((b, i) => (
            <div key={b.date} className={`trend-slot${i === active ? ' on' : ''}`} onMouseEnter={() => setActive(i)}>
              {b.count > 0 && <div className="trend-col" style={{ height: `${(b.count / top) * 100}%` }} />}
            </div>
          ))}
        </div>
        {active !== null && buckets[active] && (
          <div
            className="trend-tip"
            role="status"
            style={{ left: `${((active + 0.5) / n) * 100}%`, transform: `translateX(${active < n / 2 ? '-10%' : '-90%'})` }}
          >
            <strong>{buckets[active].count} jawaban</strong>
            <span>{label(buckets[active])}</span>
          </div>
        )}
      </div>
      <div className="trend-x" aria-hidden="true">
        {xLabels.map((i) => (
          <span key={i} style={{ left: `${((i + 0.5) / n) * 100}%` }}>{fmtDate(buckets[i].date)}</span>
        ))}
      </div>
    </div>
  );
}
