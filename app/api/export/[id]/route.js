import { getUser, getAccessibleForm } from '@/lib/auth';
import { db } from '@/lib/db';
import { answerText } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Cegah formula injection saat CSV dibuka di Excel/Sheets.
function cell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_req, { params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const form = await getAccessibleForm(user, id);
  if (!form) return new Response('Not found', { status: 404 });

  const questions = JSON.parse(form.questions);
  const rows = await db.all('SELECT answers, created_at FROM responses WHERE form_id=? AND deleted_at IS NULL ORDER BY id', form.id);
  const lines = [['Waktu (UTC)', ...questions.map((q) => q.label)].map(cell).join(',')];
  for (const r of rows) {
    const a = JSON.parse(r.answers);
    lines.push([r.created_at, ...questions.map((q) => answerText(a[q.id]))].map(cell).join(','));
  }
  const safeName = form.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'survey';
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}.csv"`,
    },
  });
}
