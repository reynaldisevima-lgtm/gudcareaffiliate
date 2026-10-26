'use client';
import { useActionState, useEffect, useState } from 'react';
import { saveAppSettings } from '@/app/actions';
import { primaryVars } from '@/lib/color';
import Logo from '@/components/Logo';

const PRESETS = [
  { label: 'Biru (bawaan)', value: '#5d87ff' },
  { label: 'Pink Gudcare', value: '#fd9aae' },
  { label: 'Hijau', value: '#13a89e' },
  { label: 'Ungu', value: '#7c5cfc' },
  { label: 'Gelap', value: '#1e293b' },
];

// Form personalisasi aplikasi + pratinjau langsung (warna turunan dihitung sama seperti di server).
export default function AppSettingsForm({ initial }) {
  const [state, action, pending] = useActionState(saveAppSettings, null);
  const [v, setV] = useState({ app_name: initial.app_name, tagline: initial.tagline, primary: initial.primary, icon_bg: initial.icon_bg, show_name: initial.show_name !== '0' });
  const [logoUrl, setLogoUrl] = useState(initial.logo_url);
  const [removeLogo, setRemoveLogo] = useState(false);
  const set = (patch) => setV((s) => ({ ...s, ...patch }));
  useEffect(() => () => logoUrl?.startsWith('blob:') && URL.revokeObjectURL(logoUrl), [logoUrl]);
  useEffect(() => { if (state?.ok) setRemoveLogo(false); }, [state]);

  const shownLogo = removeLogo ? null : logoUrl;
  const preview = { app_name: v.app_name || 'Nama aplikasi', logo_url: shownLogo, show_name: v.show_name ? '1' : '0' };

  return (
    <form action={action} className="brand-edit">
      <div className="stack">
        <div>
          <label htmlFor="app_name">Nama aplikasi</label>
          <input id="app_name" name="app_name" type="text" value={v.app_name} onChange={(e) => set({ app_name: e.target.value })} maxLength={40} required />
          <p className="muted" style={{ margin: '4px 0 0' }}>Tampil di sidebar, halaman login, judul tab browser, dan header form affiliate.</p>
        </div>
        <div>
          <label htmlFor="tagline">Teks di halaman login</label>
          <input id="tagline" name="tagline" type="text" value={v.tagline} onChange={(e) => set({ tagline: e.target.value })} maxLength={160} />
        </div>
        <div>
          <label htmlFor="logo">Logo (PNG/JPG/SVG, maks. 300 KB)</label>
          <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/svg+xml"
            onChange={(e) => { const f = e.target.files?.[0]; setLogoUrl(f ? URL.createObjectURL(f) : initial.logo_url); setRemoveLogo(false); }} />
          <p className="muted" style={{ margin: '4px 0 0' }}>Logo juga menjadi ikon tab browser dan ikon aplikasi yang dipasang di HP/laptop. Pakai gambar persegi berlatar transparan agar hasilnya rapi. Tanpa logo, aplikasi menampilkan huruf pertama nama aplikasi dan ikon Gudcare bawaan.</p>
          {initial.logo_url && (
            <label className="opt"><input type="checkbox" name="remove_logo" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} /> Hapus logo</label>
          )}
          <label className="opt">
            <input type="checkbox" name="show_name" checked={v.show_name} onChange={(e) => set({ show_name: e.target.checked })} />
            Tampilkan nama aplikasi di samping logo
          </label>
        </div>
        <div>
          <label htmlFor="primary">Warna utama</label>
          <div className="row" style={{ gap: 8 }}>
            <input id="primary" name="primary" type="color" value={v.primary} onChange={(e) => set({ primary: e.target.value })} />
            {PRESETS.map((p) => (
              <button type="button" key={p.value} className="small swatch-btn" onClick={() => set({ primary: p.value })} aria-pressed={v.primary === p.value}>
                <span className="swatch" style={{ background: p.value }} aria-hidden="true" />{p.label}
              </button>
            ))}
          </div>
          <p className="muted" style={{ margin: '4px 0 0' }}>Dipakai untuk tombol, menu aktif, link, dan grafik di dashboard. Warna teks di atasnya disesuaikan otomatis agar tetap terbaca.</p>
        </div>
        <div>
          <label htmlFor="icon_bg">Warna latar ikon aplikasi (Android/iPhone)</label>
          <div className="row" style={{ gap: 8 }}>
            <input id="icon_bg" name="icon_bg" type="color" value={v.icon_bg} onChange={(e) => set({ icon_bg: e.target.value })} />
            <span className="muted">Ikon di HP selalu berbentuk persegi/bulat penuh; area di sekitar logo diisi warna ini.</span>
          </div>
        </div>
        <div className="row">
          <button className="primary" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan pengaturan'}</button>
          {state?.ok && <span className="ok" role="status">{state.ok}</span>}
          {state?.error && <span className="error" role="alert">{state.error}</span>}
        </div>
      </div>

      <div className="brand-preview">
        <p className="muted" style={{ margin: '0 0 8px' }}>Pratinjau</p>
        <div className="app-preview" style={primaryVars(v.primary)} aria-hidden="true" inert>
          <div className="app-preview-side">
            <Logo app={preview} />
            <span className="side-link active">Form</span>
            <span className="side-link">Pengiriman</span>
          </div>
          <div className="app-preview-main">
            <p style={{ margin: '0 0 12px' }}>{v.tagline || 'Teks halaman login'}</p>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="primary" tabIndex={-1}>Tombol utama</button>
              <button type="button" tabIndex={-1}>Tombol biasa</button>
            </div>
            <p style={{ margin: '12px 0 0' }}><a href="#" tabIndex={-1}>Contoh link</a></p>
          </div>
        </div>
        <p className="muted" style={{ margin: '16px 0 8px' }}>Ikon</p>
        <div className="icon-preview" aria-hidden="true">
          <figure>
            <div className="tab-mock">{shownLogo ? <img src={shownLogo} alt="" /> : <img src={initial.default_favicon} alt="" />}<span>{v.app_name || 'Nama aplikasi'}</span></div>
            <figcaption>Tab browser</figcaption>
          </figure>
          <figure>
            <div className="app-icon-mock" style={{ background: shownLogo ? v.icon_bg : 'transparent' }}>
              <img src={shownLogo || initial.default_maskable} alt="" style={shownLogo ? { width: '70%', height: '70%' } : { width: '100%', height: '100%' }} />
            </div>
            <figcaption>Android / iPhone</figcaption>
          </figure>
        </div>
      </div>
    </form>
  );
}
