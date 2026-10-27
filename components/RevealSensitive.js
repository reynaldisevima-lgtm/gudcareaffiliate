'use client';
import { useState, useTransition } from 'react';
import { revealKol } from '@/app/actions';

// NPWP & no. rekening tampil tersamar; tombol Tampilkan mengambil nilai lengkap dari server (dicatat di log).
export default function RevealSensitive({ kolId, masked }) {
  const [shown, setShown] = useState(null);
  const [error, setError] = useState(null);
  const [pending, start] = useTransition();
  const values = shown || masked;
  return (
    <div>
      <dl className="answers-dl">
        <div><dt>NPWP</dt><dd className="mono">{values.npwp}</dd></div>
        <div><dt>No. rekening</dt><dd className="mono">{values.bank_account}</dd></div>
      </dl>
      <div className="row" style={{ marginTop: 10 }}>
        {shown ? (
          <button type="button" className="small" onClick={() => setShown(null)}>Sembunyikan</button>
        ) : (
          <button
            type="button"
            className="small"
            disabled={pending}
            onClick={() => start(async () => {
              const r = await revealKol(kolId);
              if (r.error) setError(r.error);
              else setShown(r);
            })}
          >
            {pending ? 'Memuat...' : 'Tampilkan'}
          </button>
        )}
        <span className="muted">Setiap kali ditampilkan, tercatat di Log aktivitas.</span>
        {error && <span className="error">{error}</span>}
      </div>
    </div>
  );
}
