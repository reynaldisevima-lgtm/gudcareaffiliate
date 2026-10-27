import Link from 'next/link';
import { requireKol } from '@/lib/auth';
import { db } from '@/lib/db';
import PageHeader from '@/components/PageHeader';
import KolForm from '@/components/KolForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tambah KOL' };

export default async function NewKolPage() {
  const user = await requireKol();
  const brands = user.role === 'admin' ? await db.all('SELECT id, name FROM brands WHERE workspace_id=? ORDER BY name', user.workspace_id) : null;
  return (
    <>
      <PageHeader title="Tambah KOL" subtitle={user.role === 'admin' ? 'Pilih brand yang bekerja sama dengan KOL ini.' : `KOL untuk brand ${user.brand_name}.`}>
        <Link className="btn" href="/dashboard/kol">Batal</Link>
      </PageHeader>
      <section className="panel">
        {brands && brands.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Belum ada brand. <Link href="/dashboard/brands/baru">Tambah brand</Link> dulu.</p>
        ) : (
          <KolForm brands={brands} />
        )}
      </section>
    </>
  );
}
