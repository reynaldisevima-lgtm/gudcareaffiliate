import { FLOW, statusLabel } from '@/lib/shipping';

export default function ShipmentSteps({ status, returnedText }) {
  if (status === 'returned') return <p className="error" style={{ margin: 0 }}>{returnedText}</p>;
  const step = FLOW.indexOf(status);
  return (
    <ol className="stepper">
      {FLOW.map((s, i) => (
        <li key={s} className={i < step ? 'done' : i === step ? 'current' : undefined} aria-current={i === step ? 'step' : undefined}>
          <span className="dot" aria-hidden="true">{i < step ? '✓' : i + 1}</span>
          <span>{statusLabel(s)}</span>
        </li>
      ))}
    </ol>
  );
}

export function trackingSearchUrl(courier, trackingNo) {
  return `https://www.google.com/search?q=${encodeURIComponent(`cek resi ${courier} ${trackingNo}`)}`;
}
