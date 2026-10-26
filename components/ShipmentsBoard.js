import Link from 'next/link';
import { STATUSES, statusLabel } from '@/lib/shipping';
import { fmtUtc } from '@/lib/format';

export function StatusTag({ status }) {
  return <span className={`tag s-${status}`}>{statusLabel(status)}</span>;
}

// Daftar pengiriman + filter status. `query` = parameter URL lain yang dipertahankan saat filter diganti.
export default function ShipmentsBoard({ rows: allRows, status, q = '', query = {}, showForm }) {
  const needle = q.trim().toLowerCase();
  const rows = needle
    ? allRows.filter((r) => [r.name, r.detail, r.trackingNo, r.items].some((v) => v.toLowerCase().includes(needle)))
    : allRows;
  const counts = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
  for (const r of rows) counts[r.status] += 1;
  const shown = status ? rows.filter((r) => r.status === status) : rows;
  const href = (s) => '?' + new URLSearchParams({ ...query, ...(needle ? { q } : {}), ...(s ? { status: s } : {}) }).toString();

  return (
    <>
      <form method="get" className="row" style={{ marginBottom: 16 }} role="search">
        {Object.entries(query).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        {status && <input type="hidden" name="status" value={status} />}
        <input type="search" name="q" defaultValue={q} placeholder="Cari nama, no. WhatsApp, resi, atau barang" aria-label="Cari pengisi" style={{ maxWidth: 380 }} />
        <button>Cari</button>
        {needle && <Link href={'?' + new URLSearchParams({ ...query, ...(status ? { status } : {}) })}>Hapus pencarian</Link>}
      </form>
      <nav className="seg" aria-label="Filter status">
        <Link href={href(null)} className={!status ? 'active' : undefined} aria-current={!status ? 'true' : undefined}>
          Semua <span className="count">{rows.length}</span>
        </Link>
        {STATUSES.map((s) => (
          <Link key={s.value} href={href(s.value)} className={status === s.value ? 'active' : undefined} aria-current={status === s.value ? 'true' : undefined}>
            {s.label} <span className="count">{counts[s.value]}</span>
          </Link>
        ))}
      </nav>

      <div className="panel scroll" style={{ padding: 0 }}>
        {shown.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0 }}>
            {needle ? `Tidak ada pengisi yang cocok dengan "${q}".` : rows.length === 0 ? 'Belum ada pengisi form.' : 'Tidak ada pengisi dengan status ini.'}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pengisi</th>
                {showForm && <th>Form</th>}
                <th>Barang</th>
                <th>Kurir & resi</th>
                <th>Status</th>
                <th>Terakhir diubah (UTC)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/dashboard/shipments/${r.id}`}>{r.name}</Link>
                    {r.detail && <div className="muted">{r.detail}</div>}
                  </td>
                  {showForm && <td>{r.formTitle}<div className="muted">{r.brandName}</div></td>}
                  <td>{r.items || <span className="muted">-</span>}</td>
                  <td>
                    {r.trackingNo ? (<>{r.courier || 'Kurir'}<div className="mono">{r.trackingNo}</div></>) : <span className="muted">-</span>}
                  </td>
                  <td><StatusTag status={r.status} /></td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{r.hasRecord ? fmtUtc(r.updatedAt) : '-'}</td>
                  <td><Link className="btn small" href={`/dashboard/shipments/${r.id}`}>Update</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
