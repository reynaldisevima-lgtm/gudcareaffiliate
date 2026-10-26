// Batang horizontal untuk jumlah per opsi. Nilai selalu tertulis, jadi tidak bergantung pada hover.
export default function BarList({ rows, total }) {
  return (
    <ul className="bars">
      {rows.map((r) => {
        const pct = total ? Math.round((r.count / total) * 100) : 0;
        return (
          <li key={r.label}>
            <div className="bars-head">
              <span>{r.label}</span>
              <span className="bars-val"><strong>{r.count}</strong> · {pct}%</span>
            </div>
            <div className="bars-track" aria-hidden="true">
              <div className="bars-fill" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
