import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSettings, publicApp } from '@/lib/settings';
import FormRunner from '@/components/FormRunner';
import PublicShell from '@/components/PublicShell';
import { parseStyle } from '@/lib/brandStyle';

export const dynamic = 'force-dynamic';

function getForm(slug) {
  return db.get(`SELECT f.*, b.name AS brand_name, b.color AS brand_color, b.logo AS brand_logo,
              b.cover AS brand_cover, b.style AS brand_style, b.workspace_id AS brand_workspace
       FROM forms f JOIN brands b ON b.id=f.brand_id WHERE f.slug=? AND f.deleted_at IS NULL`, slug);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const f = await getForm(slug);
  return { title: f ? `${f.title} - ${f.brand_name}` : 'Form tidak ditemukan', robots: { index: false } };
}

export default async function PublicForm({ params }) {
  const { slug } = await params;
  const form = await getForm(slug);
  if (!form) notFound();
  const style = parseStyle(form.brand_style);

  return (
    <PublicShell app={publicApp(await getSettings(form.brand_workspace))} brand={{ name: form.brand_name, color: form.brand_color, logo: form.brand_logo }} style={style} cover={form.brand_cover}>
      <h1>{form.title}</h1>
      {form.description && <p style={{ whiteSpace: 'pre-wrap' }}>{form.description}</p>}
      {form.is_active ? (
        <FormRunner slug={form.slug} questions={JSON.parse(form.questions)} thankYou={form.thank_you} submitLabel={style.button_label} />
      ) : (
        <div className="panel"><p style={{ margin: 0 }}>Form ini sudah ditutup dan tidak menerima jawaban lagi.</p></div>
      )}
    </PublicShell>
  );
}
