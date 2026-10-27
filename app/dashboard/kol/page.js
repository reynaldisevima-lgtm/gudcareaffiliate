import Link from 'next/link';
import { requireKol, brandScope } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseKol } from '@/lib/kol';
import { fmtNum } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import { StatusTag } from '@/components/ShipmentsBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'KOL' };

export default async function KolListPage({ searchParams }) {
  const user = await requireKol();
  const isAdmin = user.role === 'admin';
  const sp = await searchParams;
  const q = String(sp.q || '').trim().slice(0, 80);
  const scope = brandScope(user);
  const brands = isAdmin ? await db.all('SELECT id, name FROM brands WHERE workspace_id=? ORDER BY name', user.workspace_id) : [];
  const brand = brands.find((b) => String(b.id) === sp.brand);
  const rows = (
    await db.all(
      `SELECT k.id, k.name, k.phone, k.address, k.socials, b.name AS brand_name,
              (SELECT COUNT(*)::int FROM shipments s WHERE s.kol_id=k.id) AS shipments,
              (SELECT s.status FROM shipments s WHERE s.kol_id=k.id ORDER BY s.id DESC LIMIT 1) AS last_status
       FROM kols k JOIN brands b ON b.id=k.brand_id
       WHERE k.deleted_at IS NULL AND ${scope.sql} ${brand ? 'AND b.id=?' : ''}
       ORDER BY k.name`,
      ...scope.args, ...(brand ? [brand.id] : [])
    )
  ).map(parseKol);
  const needle = q.toLowerCase();
  const shown = needle
    ? rows.filter((k) => [k.name, k.phone, k.address.city, ...k.socials.map((s) => s.username)].some((v) => String(v || '').toLowerCase().includes(needle)))
    : rows;

  return (
    <>
      <PageHeader title="KOL" subtitle="Data talent KOL: kontak, alamat, sosial media, NPWP, dan rekening. KOL juga bisa dikirimi barang.">
        <Link className="btn primary" href="/dashboard/kol/baru">Tambah KOL</Link>
      </PageHeader>
      <form method="get" className="row" style={{ marginBottom: 16 }} role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Cari nama, no. HP, kota, atau username" aria-label="Cari KOL" style={{ maxWidth: 340 }} />
        {isAdmin && (
          <select name="brand" defaultValue={brand?.id || ''} aria-label="Filter brand" style={{ width: 'auto', minWidth: 180 }}>
            <option value="">Semua brand</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <button>Cari</button>
        {(q || brand) && <Link href="/dashboard/kol">Hapus filter</Link>}
      </form>
      <div className="panel scroll" style={{ padding: 0 }}>
        {shown.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0 }}>{rows.length === 0 ? 'Belum ada data KOL. Klik Tambah KOL untuk memulai.' : 'Tidak ada KOL yang cocok.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                {isAdmin && <th>Brand</th>}
                <th>Sosial media</th>
                <th>No. HP</th>
                <th>Kota</th>
                <th>Pengiriman</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((k) => (
                <tr key={k.id}>
                  <td><Link href={`/dashboard/kol/${k.id}`}>{k.name}</Link></td>
                  {isAdmin && <td>{k.brand_name}</td>}
                  <td>
                    <div className="chips">
                      {k.socials.map((s, i) => (
                        <span className="chip" key={i}>{s.platform} · @{s.username}{s.followers ? ` · ${fmtNum(s.followers)}` : ''}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{k.phone}</td>
                  <td>{k.address.city || '-'}</td>
                  <td>{k.shipments ? <>{fmtNum(k.shipments)}× <StatusTag status={k.last_status} /></> : <span className="muted">Belum</span>}</td>
                  <td><Link className="btn small" href={`/dashboard/kol/${k.id}`}>Detail</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
