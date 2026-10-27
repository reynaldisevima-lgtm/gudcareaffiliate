import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Logo brand untuk daftar brand. Logo brand memang tampil publik di halaman form, jadi tidak perlu login.
export async function GET(_req, { params }) {
  const { id } = await params;
  const b = await db.get('SELECT logo FROM brands WHERE id=?', Number(id));
  const m = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,(.+)$/.exec(b?.logo || '');
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: {
      'Content-Type': m[1],
      'Cache-Control': 'private, max-age=60',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
