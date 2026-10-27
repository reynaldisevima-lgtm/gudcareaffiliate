import { getUser, getAccessibleForm } from '@/lib/auth';
import { RANGES } from '@/lib/stats';
import { reportData, reportFileName } from '@/lib/report';
import { reportXlsx } from '@/lib/report-xlsx';
import { reportPdf } from '@/lib/report-pdf';
import { getSettings } from '@/lib/settings';
import { primaryVars } from '@/lib/color';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Unduh laporan form: ?format=xlsx (tabel data, bawaan) | pdf (laporan rinci), &range=7|30|90|all.
export async function GET(req, { params }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const form = await getAccessibleForm(user, id);
  if (!form) return new Response('Not found', { status: 404 });

  const sp = new URL(req.url).searchParams;
  const format = sp.get('format') === 'pdf' ? 'pdf' : 'xlsx';
  const range = RANGES.some((r) => r.value === sp.get('range')) ? sp.get('range') : 'all';
  const settings = await getSettings();
  const d = await reportData(form, range);

  let body;
  let type;
  try {
    if (format === 'pdf') {
      const v = primaryVars(settings.primary);
      body = await reportPdf(d, { appName: settings.app_name, colors: { chart: v['--primary-chart'], track: v['--primary-light'] } });
      type = 'application/pdf';
    } else {
      body = await reportXlsx(d, { appName: settings.app_name, origin: new URL(req.url).origin });
      type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
  } catch (e) {
    console.error(`Gagal membuat laporan ${format} form ${form.id}:`, e);
    return new Response(`Laporan ${format === 'pdf' ? 'PDF' : 'Excel'} gagal dibuat. Coba lagi, atau hubungi pengelola aplikasi.`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  await audit(user, {
    action: 'report.export',
    summary: `Mengunduh laporan ${format === 'pdf' ? 'PDF' : 'Excel'} form "${form.title}" (${d.rangeLabel}, ${d.rows.length} jawaban)`,
    brandId: form.brand_id,
    target: { type: 'form', id: form.id },
  });
  return new Response(body, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="${reportFileName(form, format)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
