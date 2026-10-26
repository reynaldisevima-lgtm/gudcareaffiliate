'use client';
import { useEffect, useState } from 'react';

// 08xx / +62xx / 62xx -> 62xx untuk wa.me; null jika bukan nomor HP.
function waNumber(text) {
  const d = String(text || '').replace(/\D/g, '');
  if (d.length < 9 || d.length > 15) return null;
  if (d.startsWith('0')) return '62' + d.slice(1);
  if (d.startsWith('8')) return '62' + d;
  return d.startsWith('62') ? d : null;
}

export default function TrackLink({ token, name, phone, brandName }) {
  const path = `/lacak/${token}`;
  const [url, setUrl] = useState(path);
  const [msg, setMsg] = useState(null);
  useEffect(() => setUrl(window.location.origin + path), [path]);
  const wa = waNumber(phone);
  const text = `Halo ${name}, kiriman barang dari ${brandName} bisa kamu lacak di sini: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMsg('Link disalin.');
    } catch {
      setMsg('Gagal menyalin, salin manual dari kolom link.');
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <input type="text" readOnly value={url} aria-label="Link lacak pengisi" className="grow" onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy}>Salin link</button>
        <a className="btn" href={path} target="_blank" rel="noreferrer">Buka</a>
        {wa && (
          <a className="btn primary" href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Kirim via WhatsApp</a>
        )}
      </div>
      {msg && <p className="ok" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}
