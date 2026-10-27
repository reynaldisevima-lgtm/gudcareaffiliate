import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fmtNum } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Brand & akun' };

// Daftar brand (admin). User brand hanya punya satu brand, jadi langsung ke detail brand-nya.
export default async function BrandsPage({ searchParams }) {
  const user = await requireUser();
  if (user.role !== 'admin') redirect(`/dashboard/brands/${user.brand_id}`);
  const q = String((await searchParams).q || '').trim().slice(0, 80);
  const brands = await db.all(
    `SELECT b.id, b.name, b.color, b.logo IS NOT NULL AS has_logo, b.created_at,
            (SELECT COUNT(*)::int FROM forms f WHERE f.brand_id=b.id AND f.deleted_at IS NULL) AS forms,
            (SELECT COUNT(*)::int FROM responses r JOIN forms f ON f.id=r.form_id
              WHERE f.brand_id=b.id AND f.deleted_at IS NULL AND r.deleted_at IS NULL) AS responses,
            (SELECT COUNT(*)::int FROM users u WHERE u.brand_id=b.id) AS accounts
     FROM brands b ${q ? 'WHERE b.name ILIKE ?' : ''} ORDER BY b.name`,
    ...(q ? [`%${q}%`] : [])
  );

  return (
    <>
      <PageHeader title="Brand & akun" subtitle="Klik Detail untuk mengatur tampilan form, link undangan, dan akun login tiap brand.">
        <Link className="btn primary" href="/dashboard/brands/baru">Tambah brand</Link>
      </PageHeader>

      <form method="get" className="row" style={{ marginBottom: 16 }} role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Cari nama brand" aria-label="Cari brand" style={{ maxWidth: 320 }} />
        <button>Cari</button>
        {q && <Link href="/dashboard/brands">Hapus pencarian</Link>}
      </form>

      <div className="panel scroll" style={{ padding: 0 }}>
        {brands.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0 }}>
            {q ? `Tidak ada brand yang cocok dengan "${q}".` : 'Belum ada brand. Klik Tambah brand untuk memulai.'}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th className="num">Form</th>
                <th className="num">Jawaban</th>
                <th className="num">Akun</th>
                <th>Dibuat (UTC)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/dashboard/brands/${b.id}`} className="brand-cell">
                      {b.has_logo ? (
                        <img src={`/api/brand-logo/${b.id}`} alt="" className="brand-thumb" />
                      ) : (
                        <span className="brand-thumb brand-initial" style={{ background: b.color }} aria-hidden="true">{b.name[0]}</span>
                      )}
                      {b.name}
                    </Link>
                  </td>
                  <td className="num">{fmtNum(b.forms)}</td>
                  <td className="num">{fmtNum(b.responses)}</td>
                  <td className="num">{fmtNum(b.accounts)}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{b.created_at.slice(0, 10)}</td>
                  <td><Link className="btn small" href={`/dashboard/brands/${b.id}`}>Detail</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
