'use client';
import { useEffect, useRef, useState } from 'react';
import { FONTS, BACKGROUNDS, CORNERS, PRESETS, DEFAULT_STYLE } from '@/lib/brandStyle';
import PublicShell from '@/components/PublicShell';

function useFilePreview() {
  const [url, setUrl] = useState(null);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  return [url, (file) => setUrl(file ? URL.createObjectURL(file) : null)];
}

function Choice({ name, options, value, onChange }) {
  return (
    <div className="choice" role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className={o.value === value ? 'on' : undefined}>
          <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// Field identitas + tampilan form brand, dengan pratinjau halaman pengisi yang ikut berubah.
export default function BrandFields({ app, brand, style: savedStyle }) {
  const initial = { name: brand?.name || '', color: brand?.color || '#5d87ff', ...(savedStyle || DEFAULT_STYLE) };
  const [v, setV] = useState(initial);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [logoUrl, setLogo] = useFilePreview();
  const [coverUrl, setCover] = useFilePreview();
  const [coverCheck, setCoverCheck] = useState(null);
  const ref = useRef(null);

  // Periksa ukuran sampul yang dipilih terhadap rasio tampil 16:5 (lihat .pub-cover di globals.css).
  function checkCover(file) {
    setCover(file);
    setCoverCheck(null);
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      URL.revokeObjectURL(url);
      const ratio = w / h;
      const target = 16 / 5;
      const notes = [];
      if (ratio < target * 0.9) notes.push(`terlalu tinggi, bagian atas dan bawah akan terpotong sekitar ${Math.round((1 - ratio / target) * 100)}%`);
      else if (ratio > target * 1.1) notes.push(`terlalu lebar, bagian kiri dan kanan akan terpotong sekitar ${Math.round((1 - target / ratio) * 100)}%`);
      if (w < 1200) notes.push('lebarnya di bawah 1200 px sehingga bisa terlihat buram di layar besar');
      setCoverCheck({ ok: notes.length === 0, text: `Gambar ${w} × ${h} px` + (notes.length ? `: ${notes.join('; ')}.` : ': ukurannya sudah pas, tidak ada yang terpotong.') });
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }
  const set = (patch) => setV((s) => ({ ...s, ...patch }));

  // React mengosongkan form setelah action sukses: samakan state pratinjau.
  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const onReset = () => {
      setLogo(null);
      setCover(null);
      setCoverCheck(null);
      setRemoveLogo(false);
      setRemoveCover(false);
      if (!brand) setV(initial);
    };
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  });

  const logo = logoUrl || (removeLogo ? null : brand?.logo);
  const cover = coverUrl || (removeCover ? null : brand?.cover);
  const id = brand?.id ?? 'new';

  return (
    <div className="brand-edit" ref={ref}>
      <div className="stack">
        <div className="row">
          <div className="grow">
            <label htmlFor={`name-${id}`}>Nama brand</label>
            <input id={`name-${id}`} type="text" name="name" value={v.name} onChange={(e) => set({ name: e.target.value })} required maxLength={80} />
          </div>
          <div>
            <label htmlFor={`color-${id}`}>Warna</label>
            <input id={`color-${id}`} type="color" name="color" value={v.color} onChange={(e) => set({ color: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor={`phone-${id}`}>No. HP brand</label>
          <input id={`phone-${id}`} type="text" name="phone" inputMode="tel" defaultValue={brand?.phone || ''} maxLength={25} placeholder="mis. 0812-3456-7890" />
          <p className="muted" style={{ margin: '4px 0 0' }}>Dipakai sebagai nomor pengirim di label pengiriman.</p>
        </div>
        <div>
          <label htmlFor={`logo-${id}`}>Logo (PNG/JPG/WEBP/SVG, maks. 300 KB)</label>
          <input id={`logo-${id}`} type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setLogo(e.target.files?.[0])} />
          {brand?.logo && (
            <label className="opt"><input type="checkbox" name="remove_logo" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} /> Hapus logo</label>
          )}
        </div>

        <h3 className="sub">Tampilan form</h3>
        <div>
          <label>Nuansa cepat</label>
          <div className="row" style={{ gap: 8 }}>
            {PRESETS.map((p) => (
              <button type="button" className="small" key={p.label} onClick={() => set(p.style)}>{p.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor={`font-${id}`}>Font</label>
          <select id={`font-${id}`} name="font" value={v.font} onChange={(e) => set({ font: e.target.value })}>
            {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label>Latar</label>
          <Choice name="background" options={BACKGROUNDS} value={v.background} onChange={(background) => set({ background })} />
        </div>
        <div>
          <label>Sudut kartu & tombol</label>
          <Choice name="corners" options={CORNERS} value={v.corners} onChange={(corners) => set({ corners })} />
        </div>
        <div>
          <label htmlFor={`btn-${id}`}>Teks tombol kirim</label>
          <input id={`btn-${id}`} type="text" name="button_label" value={v.button_label} onChange={(e) => set({ button_label: e.target.value })} maxLength={30} placeholder="Kirim" />
        </div>
        <div>
          <label htmlFor={`cover-${id}`}>Gambar sampul di atas form (opsional)</label>
          <input id={`cover-${id}`} type="file" name="cover" accept="image/png,image/jpeg,image/webp" onChange={(e) => checkCover(e.target.files?.[0])} />
          <ul className="cover-rules">
            <li>Ukuran ideal <strong>1600 × 500 px</strong> (rasio 16:5, landscape memanjang). Sampul selalu tampil dengan rasio ini di HP maupun laptop.</li>
            <li>Gambar dengan rasio lain tidak diregangkan, tapi dipotong rata tengah.</li>
            <li>Taruh teks, logo, atau wajah di bagian tengah dan beri jarak dari tepi.</li>
            <li>PNG, JPG, atau WEBP, maksimal 1 MB.</li>
          </ul>
          {coverCheck && <p className={coverCheck.ok ? 'ok' : 'warn'} role="status" style={{ margin: '6px 0 0' }}>{coverCheck.text}</p>}
          {brand?.cover && (
            <label className="opt"><input type="checkbox" name="remove_cover" checked={removeCover} onChange={(e) => setRemoveCover(e.target.checked)} /> Hapus gambar sampul</label>
          )}
        </div>
      </div>

      <div className="brand-preview">
        <p className="muted" style={{ margin: '0 0 8px' }}>Pratinjau halaman pengisi</p>
        <div className="preview-frame" aria-hidden="true" inert>
          <PublicShell preview app={app} brand={{ name: v.name, color: v.color, logo }} style={v} cover={cover}>
            <h1>Survey affiliate</h1>
            <p>Contoh deskripsi form.</p>
            <div className="panel">
              <div className="field">
                <label>Nama lengkap <span className="req">*</span></label>
                <input type="text" tabIndex={-1} readOnly />
              </div>
              <div className="field">
                <label>Platform utama</label>
                <label className="opt"><input type="radio" tabIndex={-1} defaultChecked /> TikTok</label>
                <label className="opt"><input type="radio" tabIndex={-1} /> Instagram</label>
              </div>
              <button type="button" className="primary" tabIndex={-1}>{v.button_label || 'Kirim'}</button>
            </div>
          </PublicShell>
        </div>
      </div>
    </div>
  );
}
