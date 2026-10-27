'use client';
import { useActionState, useState } from 'react';
import { submitResponse } from '@/app/actions';
import { PROVINCES } from '@/lib/address';

function TrackLinkNotice({ token }) {
  const path = `/lacak/${token}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="track-notice">
      <p style={{ margin: '0 0 8px' }}><strong>Simpan link ini</strong> untuk melacak kiriman barang dari brand.</p>
      <div className="row" style={{ gap: 8 }}>
        <a className="btn primary" href={path}>Buka halaman lacak</a>
        <button
          type="button"
          onClick={async () => {
            try { await navigator.clipboard.writeText(window.location.origin + path); setCopied(true); } catch {}
          }}
        >
          {copied ? 'Link disalin' : 'Salin link'}
        </button>
      </div>
    </div>
  );
}

export default function FormRunner({ slug, questions, thankYou, submitLabel = 'Kirim' }) {
  const [state, action, pending] = useActionState(submitResponse, null);

  if (state?.done) {
    return (
      <div className="panel" role="status">
        <h2>Terkirim</h2>
        <p style={{ margin: 0 }}>{thankYou}</p>
        {state.track && <TrackLinkNotice token={state.track} />}
      </div>
    );
  }

  return (
    <form action={action} className="panel">
      <input type="hidden" name="slug" value={slug} />
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {questions.map((q) => {
        const name = `q_${q.id}`;
        const id = `f_${q.id}`;
        return (
          <div className="field" key={q.id}>
            <label htmlFor={id}>
              {q.label}
              {q.required && <span className="req" aria-hidden="true"> *</span>}
            </label>
            {q.type === 'short' && <input id={id} name={name} type="text" maxLength={500} required={q.required} />}
            {q.type === 'long' && <textarea id={id} name={name} maxLength={5000} required={q.required} />}
            {q.type === 'dropdown' && (
              <select id={id} name={name} required={q.required} defaultValue="">
                <option value="" disabled>Pilih salah satu</option>
                {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {q.type === 'choice' && (
              <div role="radiogroup" aria-labelledby={id}>
                {q.options.map((o, i) => (
                  <label className="opt" key={o}>
                    <input type="radio" name={name} value={o} required={q.required && i === 0} /> {o}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'checkbox' && (
              <div>
                {q.options.map((o) => (
                  <label className="opt" key={o}>
                    <input type="checkbox" name={name} value={o} /> {o}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'rating' && (
              <div className="rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label className="opt" key={n}>
                    <input type="radio" name={name} value={n} required={q.required && n === 1} /> {n}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'file' && (
              <>
                <input id={id} name={name} type="file" required={q.required} />
                <p className="muted" style={{ marginTop: 4 }}>Maksimal 3 MB.</p>
              </>
            )}
            {q.type === 'address' && (
              <div className="address-fields" role="group" aria-labelledby={id}>
                <div>
                  <label className="sub-label" htmlFor={`${id}_province`}>Provinsi</label>
                  <select id={`${id}_province`} name={`${name}_province`} required={q.required} defaultValue="" autoComplete="address-level1">
                    <option value="" disabled>Pilih provinsi</option>
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="sub-label" htmlFor={`${id}_city`}>Kota/Kabupaten</label>
                  <input id={`${id}_city`} name={`${name}_city`} type="text" maxLength={100} required={q.required} placeholder="mis. Kota Bandung / Kabupaten Sleman" autoComplete="address-level2" />
                </div>
                <div className="span-2">
                  <label className="sub-label" htmlFor={`${id}_street`}>Alamat lengkap</label>
                  <textarea id={`${id}_street`} name={`${name}_street`} maxLength={500} required={q.required} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, patokan" autoComplete="street-address" style={{ minHeight: 72 }} />
                </div>
                <div>
                  <label className="sub-label" htmlFor={`${id}_postal`}>Kode pos</label>
                  <input id={`${id}_postal`} name={`${name}_postal`} type="text" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required={q.required} placeholder="5 angka" title="Kode pos 5 angka" autoComplete="postal-code" />
                </div>
              </div>
            )}
          </div>
        );
      })}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="primary" disabled={pending}>{pending ? 'Mengirim...' : submitLabel}</button>
    </form>
  );
}
