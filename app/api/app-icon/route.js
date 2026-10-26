import { ImageResponse } from 'next/og';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const SIZES = [64, 180, 192, 512];

// Favicon & ikon PWA dari logo di Pengaturan aplikasi.
//   ?size=64|180|192|512   ukuran persegi
//   &mask=1                versi persegi penuh (Android maskable / iPhone): latar warna ikon,
//                          logo di zona aman 70% agar tidak terpotong saat sistem membulatkan ikon
// Tanpa logo, diarahkan ke ikon Gudcare bawaan.
export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const size = SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : 192;
  const mask = params.get('mask') === '1';
  const s = await getSettings();
  if (!s.logo) return Response.redirect(new URL(mask ? s.icons.maskable512 : s.icons.any512, req.url), 307);

  const inner = Math.round(size * (mask ? 0.7 : 1));
  const res = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: mask ? s.icon_bg : 'transparent' }}>
        <img src={s.logo} width={inner} height={inner} style={{ objectFit: 'contain' }} />
      </div>
    ),
    { width: size, height: size }
  );
  res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return res;
}
