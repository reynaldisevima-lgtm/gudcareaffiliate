import { getUser, getAccessibleForm } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const INLINE = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

export async function GET(_req, { params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const f = await db.get('SELECT f.name, f.mime, f.data, r.form_id FROM files f JOIN responses r ON r.id=f.response_id WHERE f.id=? AND r.deleted_at IS NULL', Number(id));
  if (!f || !await getAccessibleForm(user, f.form_id)) return new Response('Not found', { status: 404 });
  const inline = INLINE.includes(f.mime);
  return new Response(f.data, {
    headers: {
      'Content-Type': inline ? f.mime : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
