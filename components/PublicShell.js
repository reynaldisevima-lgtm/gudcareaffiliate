import { FONT_FAMILY } from '@/lib/fonts';
import { textOn } from '@/lib/brandStyle';

// Kerangka halaman pengisi: header Gudcare × brand, sampul, dan tema brand.
// Dipakai halaman publik dan pratinjau di pengaturan brand, jadi keduanya selalu sama.
export default function PublicShell({ app, brand, style, cover, preview = false, children }) {
  const color = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#5d87ff';
  return (
    <div
      className={`pub bg-${style.background} c-${style.corners}${preview ? ' preview' : ''}`}
      style={{ '--brand': color, '--brand-ink': textOn(color), '--pub-font': FONT_FAMILY[style.font] }}
    >
      <header className="pub-head">
        <div className="pub-head-inner">
          {app.logo_url ? <img src={app.logo_url} alt={app.app_name} /> : <strong className="wordmark">{app.app_name}</strong>}
          <span className="pub-sep" aria-hidden="true">×</span>
          {brand.logo ? <img src={brand.logo} alt={brand.name} /> : <strong>{brand.name || 'Nama brand'}</strong>}
        </div>
      </header>
      <div className="pub-wrap">
        {cover && <img className="pub-cover" src={cover} alt="" />}
        {children}
      </div>
      <footer className="pub-foot">{brand.name || 'Nama brand'} · {app.app_name}</footer>
    </div>
  );
}
