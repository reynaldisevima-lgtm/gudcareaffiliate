import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createBrand } from '@/app/actions';
import { getSettings, publicApp } from '@/lib/settings';
import ActionForm from '@/components/ActionForm';
import PageHeader from '@/components/PageHeader';
import BrandFields from '@/components/BrandFields';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tambah brand' };

export default async function NewBrandPage() {
  await requireAdmin();
  const app = publicApp(await getSettings());
  return (
    <>
      <PageHeader title="Tambah brand" subtitle="Setelah disimpan, kamu langsung dibawa ke detail brand untuk mengundang timnya.">
        <Link className="btn" href="/dashboard/brands">Batal</Link>
      </PageHeader>
      <section className="panel">
        <ActionForm action={createBrand} submitLabel="Tambah brand">
          <BrandFields app={app} />
        </ActionForm>
      </section>
    </>
  );
}
