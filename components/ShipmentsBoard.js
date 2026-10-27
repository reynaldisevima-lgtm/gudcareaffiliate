import Link from 'next/link';
import { STATUSES, statusLabel } from '@/lib/shipping';
import { fmtUtc } from '@/lib/format';
import SelectAll from '@/components/SelectAll';

export function StatusTag({ status }) {
  return <span className={`tag s-${status}`}>{statusLabel(status)}</span>;
}

const KINDS = [
  { value: '', label: 'Semua penerima' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'kol', label: 'KOL' },
];

// Daftar pengiriman (affiliate & KOL) + filter jenis/status + pilih baris untuk cetak label.
// `query` = parameter URL lain yang dipertahankan saat filter diganti. showKind=false di tab Pengiriman per form.
export default function ShipmentsBoard({ rows: allRows, status, kind = '', q = '', query = {}, showForm, showKind = true }) {
  const needle = q.trim().toLowerCase();
  const rows = needle
    ? allRows.filter((r) => [r.name, r.detail, r.trackingNo, r.items].some((v) => v.toLowerCase().includes(needle)))
    : allRows;
  const counts = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
  for (const r of rows) counts[r.status] += 1;
  const shown = status ? rows.filter((r) => r.status === status) : rows;
  const params = (extra) => '?' + new URLSearchParams({ ...query, ...(kind ? { kind } : {}), ...(needle ? { q } : {}), ...(status ? { status } : {}), ...extra }).toString();
  const href = (s) => params({ status: s || '' }).replace(/[?&]status=(?=&|$)/, '');

  return (
    <>
      <form method="get" className="row" style={{ marginBottom: 16 }} role="search">
        {Object.entries(query).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        {kind && <input type="hidden" name="kind" value={kind} />}
        {status && <input type="hidden" name="status" value={status} />}
        <input type="search" name="q" defaultValue={q} placeholder="Cari nama, no. HP/WhatsApp, resi, atau barang" aria-label="Cari penerima" style={{ maxWidth: 380 }} />
        <button>Cari</button>
        {needle && <Link href={'?' + new URLSearchParams({ ...query, ...(kind ? { kind } : {}), ...(status ? { status } : {}) })}>Hapus pencarian</Link>}
      </form>
      {showKind && (
        <nav className="seg" aria-label="Jenis penerima" style={{ marginRight: 8 }}>
          {KINDS.map((k) => (
            <Link key={k.value} href={'?' + new URLSearchParams({ ...query, ...(k.value ? { kind: k.value } : {}) })} className={kind === k.value ? 'active' : undefined} aria-current={kind === k.value ? 'true' : undefined}>
              {k.label}
            </Link>
          ))}
        </nav>
      )}
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

      <form method="get" action="/dashboard/shipments/label" target="_blank">
        {shown.length > 0 && (
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="primary">Cetak label terpilih</button>
            <span className="muted">Centang penerima, lalu cetak label pengiriman (pengirim: brand & no. HP brand).</span>
          </div>
        )}
        <div className="panel scroll" style={{ padding: 0 }}>
          {shown.length === 0 ? (
            <p className="muted" style={{ padding: 20, margin: 0 }}>
              {needle ? `Tidak ada penerima yang cocok dengan "${q}".` : rows.length === 0 ? 'Belum ada penerima.' : 'Tidak ada penerima dengan status ini.'}
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}><SelectAll name="id" label="Pilih semua penerima" /></th>
                  <th>Penerima</th>
                  {showForm && <th>Asal</th>}
                  <th>Barang</th>
                  <th>Kurir & resi</th>
                  <th>Status</th>
                  <th>Terakhir diubah (UTC)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.key}>
                    <td><input type="checkbox" name="id" value={r.ref} aria-label={`Pilih ${r.name}`} /></td>
                    <td>
                      <Link href={r.href}>{r.name}</Link> <span className={`tag ${r.kind === 'kol' ? 'k-kol' : 'k-aff'}`}>{r.kind === 'kol' ? 'KOL' : 'Affiliate'}</span>
                      {r.detail && <div className="muted">{r.detail}</div>}
                    </td>
                    {showForm && <td>{r.formTitle}<div className="muted">{r.brandName}</div></td>}
                    <td>{r.items || <span className="muted">-</span>}</td>
                    <td>
                      {r.trackingNo ? (<>{r.courier || 'Kurir'}<div className="mono">{r.trackingNo}</div></>) : <span className="muted">-</span>}
                    </td>
                    <td><StatusTag status={r.status} /></td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{r.hasRecord ? fmtUtc(r.updatedAt) : '-'}</td>
                    <td><Link className="btn small" href={r.href}>Update</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </form>
    </>
  );
}
