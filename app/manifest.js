export default function manifest() {
  return {
    name: 'Gudcare Survey Affiliate',
    short_name: 'Gudcare',
    description: 'Kelola form survey affiliate, hasil, dan pengiriman barang brand Gudcare.',
    lang: 'id',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5d87ff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Form', url: '/dashboard', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Pengiriman', url: '/dashboard/shipments', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
