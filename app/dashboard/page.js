import Link from 'next/link';
import { requireAffiliate, brandScope } from '@/lib/auth';
import { db } from '@/lib/db';
import { createForm, duplicateForm } from '@/app/actions';
import PageHeader from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default async function FormsPage() {
  const user = await requireAffiliate();
  const isAdmin = user.role === 'admin';
  const scope = brandScope(user);
  const brands = isAdmin ? (await db.all('SELECT id, name FROM brands b WHERE b.workspace_id=? ORDER BY name', user.workspace_id)) : [];
  const forms = await db.all(`SELECT f.id, f.slug, f.title, f.is_active, f.updated_at, b.name AS brand_name,
              (SELECT COUNT(*)::int FROM responses r WHERE r.form_id=f.id AND r.deleted_at IS NULL) AS response_count
       FROM forms f JOIN brands b ON b.id=f.brand_id
       WHERE f.deleted_at IS NULL AND ${scope.sql}
       ORDER BY f.updated_at DESC`, ...scope.args);
  const recent = (await db.get(`SELECT COUNT(*)::int AS n FROM responses r JOIN forms f ON f.id=r.form_id JOIN brands b ON b.id=f.brand_id
       WHERE r.deleted_at IS NULL AND f.deleted_at IS NULL AND r.created_at >= to_char((now() AT TIME ZONE 'utc') - interval '7 days', 'YYYY-MM-DD HH24:MI:SS') AND ${scope.sql}`, ...scope.args)).n;
  const totalResponses = forms.reduce((a, f) => a + f.response_count, 0);
  const kpis = [
    { label: 'Total form', value: forms.length, note: `${forms.filter((f) => f.is_active).length} sedang aktif` },
    { label: 'Total jawaban', value: totalResponses, note: 'dari semua form' },
    { label: 'Jawaban 7 hari terakhir', value: recent, note: 'dari semua form' },
  ];

  return (
    <>
      <PageHeader title="Form" subtitle={`${forms.length} form survey affiliate`}>
        {isAdmin && brands.length === 0 ? (
          <Link className="btn primary" href="/dashboard/brands">Tambah brand dulu</Link>
        ) : (
          <form action={createForm} className="row">
            {isAdmin && (
              <select name="brand_id" aria-label="Brand" required style={{ width: 'auto', minWidth: 160 }}>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <button className="primary">Buat form baru</button>
          </form>
        )}
      </PageHeader>

      <div className="kpis">
        {kpis.map((k) => (
          <div className="panel stat" key={k.label}>
            <p className="stat-label">{k.label}</p>
            <p className="stat-value">{k.value.toLocaleString('id-ID')}</p>
            <p className="stat-delta">{k.note}</p>
          </div>
        ))}
      </div>

      <div className="panel scroll" style={{ padding: 0 }}>
        {forms.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0 }}>Belum ada form.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Judul</th>
                {isAdmin && <th>Brand</th>}
                <th>Status</th>
                <th>Jawaban</th>
                <th>Diubah (UTC)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id}>
                  <td><Link href={`/dashboard/forms/${f.id}`}>{f.title}</Link></td>
                  {isAdmin && <td>{f.brand_name}</td>}
                  <td><span className={`tag${f.is_active ? ' success' : ''}`}>{f.is_active ? 'Aktif' : 'Ditutup'}</span></td>
                  <td className="num">{f.response_count}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{f.updated_at}</td>
                  <td>
                    <div className="row">
                      <Link className="btn small" href={`/dashboard/forms/${f.id}/summary`}>Ringkasan</Link>
                      <a className="btn small" href={`/f/${f.slug}`} target="_blank" rel="noreferrer">Buka</a>
                      <a className="btn small" href={`/api/export/${f.id}?format=xlsx&range=all`} title="Unduh laporan Excel (tabel data)">Excel</a>
                      <a className="btn small" href={`/api/export/${f.id}?format=pdf&range=all`} title="Unduh laporan PDF (rinci)">PDF</a>
                      <form action={duplicateForm}>
                        <input type="hidden" name="id" value={f.id} />
                        <button className="small" title="Salin pertanyaan dan pengaturan ke form baru">Salin</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
