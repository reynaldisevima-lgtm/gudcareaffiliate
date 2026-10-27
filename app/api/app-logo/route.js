import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// Gambar logo aplikasi dari Pengaturan aplikasi. URL membawa ?v=<hash> sehingga aman di-cache lama.
// ?w=<workspace>: halaman publik (tanpa login) membawa workspace pemilik form.
export async function GET(req) {
  const { logo } = await getSettings(new URL(req.url).searchParams.get('w'));
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
