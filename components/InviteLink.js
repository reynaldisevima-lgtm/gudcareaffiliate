'use client';
import { useEffect, useState } from 'react';
import { rotateInvite } from '@/app/actions';
import ConfirmButton from '@/components/ConfirmButton';

export default function InviteLink({ brandId, brandName, token }) {
  const path = `/undangan/${token}`;
  const [url, setUrl] = useState(path);
  const [msg, setMsg] = useState(null);
  useEffect(() => setUrl(window.location.origin + path), [path]);
  const waText = `Halo, kamu diundang mengelola form affiliate ${brandName} di Gudcare. Masuk dengan Google lewat link ini: ${url}`;

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
        <input type="text" readOnly value={url} aria-label={`Link undangan ${brandName}`} className="grow" onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy}>Salin link</button>
        <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer">Kirim via WhatsApp</a>
        <form action={rotateInvite}>
          <input type="hidden" name="id" value={brandId} />
          <ConfirmButton className="danger" message="Buat link undangan baru? Link lama langsung tidak berlaku. Akun yang sudah bergabung tidak terpengaruh.">
            Buat link baru
          </ConfirmButton>
        </form>
      </div>
      {msg && <p className="ok" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}
