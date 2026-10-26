'use client';
import { useActionState, useState } from 'react';
import { submitResponse } from '@/app/actions';

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
          </div>
        );
      })}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="primary" disabled={pending}>{pending ? 'Mengirim...' : submitLabel}</button>
    </form>
  );
}
