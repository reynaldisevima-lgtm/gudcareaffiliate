import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { RANGES } from '@/lib/stats';
import { buildOverview } from '@/lib/overview';
import { fmtNum, fmtUtc } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import BarList from '@/components/BarList';
import TrendChart from '@/components/TrendChart';
import StatDelta from '@/components/StatDelta';
import { StatusTag } from '@/components/ShipmentsBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default async function OverviewPage({ searchParams }) {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const sp = await searchParams;
  const range = RANGES.some((r) => r.value === sp.range) ? sp.range : '30';
  const brands = isAdmin ? await db.all('SELECT id, name FROM brands ORDER BY name') : [];
  const brand = isAdmin ? brands.find((b) => String(b.id) === sp.brand) : null;
  const o = await buildOverview(user, { range, brandId: brand?.id });
  const scopeName = isAdmin ? (brand ? brand.name : 'Semua brand') : user.brand_name;
  const rangeHref = (r) => '?' + new URLSearchParams({ range: r, ...(brand ? { brand: brand.id } : {}) });

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${scopeName} · performa form affiliate dan pengiriman barang`} />

      <div className="row" style={{ marginBottom: 4 }}>
        <nav className="seg" aria-label="Rentang waktu">
          {RANGES.map((r) => (
            <Link key={r.value} href={rangeHref(r.value)} className={r.value === range ? 'active' : undefined} aria-current={r.value === range ? 'true' : undefined}>{r.label}</Link>
          ))}
        </nav>
        {isAdmin && (
          <form method="get" className="row" style={{ marginBottom: 20 }}>
            <input type="hidden" name="range" value={range} />
            <select name="brand" defaultValue={brand?.id || ''} aria-label="Filter brand" style={{ width: 'auto', minWidth: 200 }}>
              <option value="">Semua brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button>Terapkan</button>
          </form>
        )}
      </div>

      <div className="kpis">
        <div className="panel stat">
          <p className="stat-label">Jawaban masuk</p>
          <p className="stat-value">{fmtNum(o.total)}</p>
          <StatDelta total={o.total} prev={o.prev} days={o.days} />
        </div>
        <div className="panel stat">
          <p className="stat-label">Affiliate unik</p>
          <p className="stat-value">{fmtNum(o.affiliates)}</p>
          <p className="stat-delta">dihitung dari nomor WhatsApp</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Barang dikirim</p>
          <p className="stat-value">{fmtNum(o.shipped)}</p>
          <p className="stat-delta">{pct(o.shipped, o.total)}% dari jawaban masuk</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Konten tayang</p>
          <p className="stat-value">{fmtNum(o.posted)}</p>
          <p className="stat-delta">{pct(o.posted, o.shipped)}% dari barang dikirim</p>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 4 }}>Jawaban per {o.step === 7 ? 'minggu' : 'hari'}</h2>
        <p className="muted">Semua form {scopeName === 'Semua brand' ? 'dari semua brand' : scopeName}. Tanggal dalam UTC.</p>
        <TrendChart buckets={o.buckets} weekly={o.step === 7} />
        <details className="table-view">
          <summary>Lihat sebagai tabel</summary>
          {o.total === 0 ? (
            <p className="muted">Belum ada jawaban pada rentang ini.</p>
          ) : (
            <table>
              <thead><tr><th>{o.step === 7 ? 'Minggu mulai' : 'Tanggal'}</th><th className="num">Jawaban</th></tr></thead>
              <tbody>
                {o.buckets.filter((b) => b.count > 0).reverse().map((b) => (
                  <tr key={b.date}><td>{b.date}</td><td className="num">{b.count}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      </div>

      {o.total === 0 ? (
        <div className="panel"><p className="muted" style={{ margin: 0 }}>Belum ada jawaban pada rentang ini. Bagikan link form ke affiliate, lalu progres pengiriman dan rekap per brand/form akan muncul di sini.</p></div>
      ) : (
        <div className="q-grid" style={{ marginBottom: 24 }}>
          <section className="panel">
            <h2 style={{ marginBottom: 2 }}>Progres pengiriman barang</h2>
            <p className="muted">Berapa pengisi yang sudah mencapai tiap tahap (persentase dari jawaban masuk).</p>
            <BarList rows={o.funnel} total={o.total} />
            {o.returned > 0 && <p className="error" style={{ margin: '14px 0 0' }}>{fmtNum(o.returned)} pengiriman gagal / dikembalikan.</p>}
            <Link href="/dashboard/shipments" className="more-link">Buka menu Pengiriman</Link>
          </section>

          {isAdmin && !brand ? (
            <section className="panel">
              <h2 style={{ marginBottom: 2 }}>Jawaban per brand</h2>
              <p className="muted">{o.byBrand.length} brand menerima jawaban pada rentang ini.</p>
              <BarList rows={o.byBrand} total={o.total} />
            </section>
          ) : (
            <section className="panel">
              <h2 style={{ marginBottom: 2 }}>Jawaban per form</h2>
              <p className="muted">{o.byForm.length} form menerima jawaban pada rentang ini.</p>
              <BarList rows={o.byForm} total={o.total} />
            </section>
          )}

          {isAdmin && !brand && (
            <section className="panel">
              <h2 style={{ marginBottom: 2 }}>Jawaban per form</h2>
              <p className="muted">Form dengan jawaban terbanyak.</p>
              <BarList rows={o.byForm} total={o.total} />
            </section>
          )}

          <section className="panel">
            <h2 style={{ marginBottom: 2 }}>Aktivitas terbaru</h2>
            <p className="muted">Jawaban baru dan update pengiriman.</p>
            <ul className="answers">
              {o.activity.map((a) => (
                <li key={a.key}>
                  <span>
                    <Link href={`/dashboard/shipments/${a.responseId}`}>{a.who}</Link> {a.status ? <StatusTag status={a.status} /> : null} {a.what}
                  </span>
                  <span className="muted">{fmtUtc(a.at)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
