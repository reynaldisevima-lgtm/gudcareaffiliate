import { notFound } from 'next/navigation';
import { requireUser, getAccessibleForm } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteForm, duplicateForm } from '@/app/actions';
import Builder from '@/components/Builder';
import ConfirmButton from '@/components/ConfirmButton';
import PageHeader from '@/components/PageHeader';
import FormTabs from '@/components/FormTabs';

export const dynamic = 'force-dynamic';

export default async function FormEditPage({ params }) {
  const { id } = await params;
  const user = await requireUser();
  const form = await getAccessibleForm(user, id);
  if (!form) notFound();
  const brand = await db.get('SELECT name FROM brands WHERE id=?', form.brand_id);
  const brands = user.role === 'admin' ? (await db.all('SELECT id, name FROM brands ORDER BY name')) : [];

  return (
    <>
      <PageHeader title="Edit form" subtitle={brand.name}>
          <form action={duplicateForm} className="row" style={{ gap: 8 }}>
            <input type="hidden" name="id" value={form.id} />
            {brands.length > 1 && (
              <select name="brand_id" defaultValue={form.brand_id} aria-label="Salin ke brand" style={{ width: 'auto' }}>
                {brands.map((b) => <option key={b.id} value={b.id}>Salin ke {b.name}</option>)}
              </select>
            )}
            <button>Salin form</button>
          </form>
          <form action={deleteForm}>
            <input type="hidden" name="id" value={form.id} />
            <ConfirmButton className="danger" message="Hapus form ini beserta semua jawabannya? Form akan hilang dari daftar dan link-nya tidak bisa dibuka. Admin masih bisa memulihkannya dari Log aktivitas.">Hapus form</ConfirmButton>
          </form>
      </PageHeader>
      <FormTabs formId={form.id} active="edit" />
      <Builder
        formId={form.id}
        publicPath={`/f/${form.slug}`}
        initial={{
          title: form.title,
          description: form.description,
          thank_you: form.thank_you,
          is_active: form.is_active,
          questions: JSON.parse(form.questions),
        }}
      />
    </>
  );
}
