'use client';
import { useState, useTransition } from 'react';
import { saveForm } from '@/app/actions';
import { TYPES, HAS_OPTIONS, newId } from '@/lib/questions';

export default function Builder({ formId, initial, publicPath }) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [thankYou, setThankYou] = useState(initial.thank_you);
  const [active, setActive] = useState(!!initial.is_active);
  const [questions, setQuestions] = useState(initial.questions);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();

  const update = (i, patch) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const move = (i, d) =>
    setQuestions((qs) => {
      const j = i + d;
      if (j < 0 || j >= qs.length) return qs;
      const c = [...qs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const remove = (i) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const add = () =>
    setQuestions((qs) => [...qs, { id: newId(), type: 'short', label: '', required: false, options: [] }]);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveForm(formId, {
        title, description, thank_you: thankYou, is_active: active, questions,
      });
      setMsg(res?.error ? { error: res.error } : { ok: 'Tersimpan.' });
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + publicPath);
      setMsg({ ok: 'Link disalin.' });
    } catch {
      setMsg({ error: 'Gagal menyalin, salin manual dari kolom link.' });
    }
  }

  return (
    <div>
      <div className="panel stack">
        <div>
          <label htmlFor="title">Judul form</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label htmlFor="desc">Deskripsi (tampil di atas form)</label>
          <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ty">Pesan setelah form dikirim</label>
          <input id="ty" type="text" value={thankYou} onChange={(e) => setThankYou(e.target.value)} />
        </div>
        <label className="opt">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Form menerima jawaban
        </label>
        <div className="row">
          <input type="text" readOnly value={publicPath} aria-label="Link form" className="grow" />
          <button type="button" onClick={copyLink}>Salin link</button>
          <a className="btn" href={publicPath} target="_blank" rel="noreferrer">Buka</a>
        </div>
      </div>

      <h2>Pertanyaan</h2>
      {questions.map((q, i) => (
        <div className="q-card" key={q.id}>
          <div className="row">
            <div className="grow" style={{ flexBasis: 280 }}>
              <label htmlFor={`l${q.id}`}>Pertanyaan {i + 1}</label>
              <input id={`l${q.id}`} type="text" value={q.label} onChange={(e) => update(i, { label: e.target.value })} />
            </div>
            <div style={{ minWidth: 200 }}>
              <label htmlFor={`t${q.id}`}>Tipe</label>
              <select
                id={`t${q.id}`}
                value={q.type}
                onChange={(e) => {
                  const type = e.target.value;
                  update(i, { type, options: HAS_OPTIONS.includes(type) ? (q.options.length ? q.options : ['Opsi 1']) : [] });
                }}
              >
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {HAS_OPTIONS.includes(q.type) && (
            <div style={{ marginTop: 10 }}>
              <label htmlFor={`o${q.id}`}>Opsi (satu per baris)</label>
              <textarea
                id={`o${q.id}`}
                value={q.options.join('\n')}
                onChange={(e) => update(i, { options: e.target.value.split('\n') })}
              />
            </div>
          )}

          <div className="row between" style={{ marginTop: 10 }}>
            <label className="opt" style={{ margin: 0 }}>
              <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} />
              Wajib diisi
            </label>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="small" onClick={() => move(i, -1)} disabled={i === 0}>Naik</button>
              <button type="button" className="small" onClick={() => move(i, 1)} disabled={i === questions.length - 1}>Turun</button>
              <button type="button" className="small danger" onClick={() => remove(i)}>Hapus</button>
            </div>
          </div>
        </div>
      ))}

      <div className="row" style={{ marginTop: 16 }}>
        <button type="button" onClick={add}>Tambah pertanyaan</button>
        <button type="button" className="primary" onClick={save} disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan form'}
        </button>
        {msg?.ok && <span className="ok" role="status">{msg.ok}</span>}
        {msg?.error && <span className="error" role="alert">{msg.error}</span>}
      </div>
    </div>
  );
}
