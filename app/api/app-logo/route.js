import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// Gambar logo aplikasi dari Pengaturan aplikasi. URL membawa ?v=<hash> sehingga aman di-cache lama.
export async function GET() {
  const { logo } = await getSettings();
  const m = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,(.+)$/.exec(logo || '');
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: {
      'Content-Type': m[1],
      'Cache-Control': 'public, max-age=31536000, immutable',
      // SVG unggahan admin: jangan jalankan skrip di dalamnya.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
