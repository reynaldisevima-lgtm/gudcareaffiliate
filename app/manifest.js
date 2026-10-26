import { getSettings } from '@/lib/settings';

// Dibuat per request agar nama, warna, dan ikon dari Pengaturan aplikasi langsung berlaku.
export const dynamic = 'force-dynamic';

export default async function manifest() {
  const s = await getSettings();
  return {
    name: `${s.app_name} Survey Affiliate`,
    short_name: s.app_name,
    description: `Kelola form survey affiliate, hasil, dan pengiriman barang brand ${s.app_name}.`,
    lang: 'id',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: s.primary,
    icons: [
      { src: s.icons.any192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: s.icons.any512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: s.icons.maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Form', url: '/dashboard', icons: [{ src: s.icons.any192, sizes: '192x192' }] },
      { name: 'Pengiriman', url: '/dashboard/shipments', icons: [{ src: s.icons.any192, sizes: '192x192' }] },
    ],
  };
}
