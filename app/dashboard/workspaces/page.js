import { requireOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtNum } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Semua workspace' };

// Khusus pemilik platform: daftar workspace project leader beserta ukurannya (tanpa membuka isi datanya).
export default async function WorkspacesPage() {
  const owner = await requireOwner();
  const rows = await db.all(
    `SELECT w.id, w.name, w.created_at,
            (SELECT string_agg(u.email, ', ' ORDER BY u.id) FROM users u WHERE u.workspace_id=w.id AND u.role='admin') AS admins,
            (SELECT COUNT(*)::int FROM brands b WHERE b.workspace_id=w.id) AS brands,
            (SELECT COUNT(*)::int FROM forms f JOIN brands b ON b.id=f.brand_id WHERE b.workspace_id=w.id AND f.deleted_at IS NULL) AS forms,
            (SELECT COUNT(*)::int FROM responses r JOIN forms f ON f.id=r.form_id JOIN brands b ON b.id=f.brand_id
               WHERE b.workspace_id=w.id AND r.deleted_at IS NULL AND f.deleted_at IS NULL) AS responses,
            (SELECT MAX(a.created_at) FROM audit_logs a WHERE a.workspace_id=w.id) AS last_activity
     FROM workspaces w ORDER BY w.id`
  );
  return (
    <>
      <PageHeader title="Semua workspace" subtitle="Project leader yang mendaftar sendiri mendapat workspace terpisah. Halaman ini hanya terlihat oleh pemilik platform." />
      <div className="panel scroll" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Super admin</th>
              <th className="num">Brand</th>
              <th className="num">Form</th>
              <th className="num">Jawaban</th>
              <th>Dibuat (UTC)</th>
              <th>Aktivitas terakhir (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id}>
                <td><strong>{w.name}</strong>{w.id === owner.workspace_id && <div className="muted">workspace kamu</div>}</td>
                <td style={{ overflowWrap: 'anywhere' }}>{w.admins || <span className="muted">-</span>}</td>
                <td className="num">{fmtNum(w.brands)}</td>
                <td className="num">{fmtNum(w.forms)}</td>
                <td className="num">{fmtNum(w.responses)}</td>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{w.created_at.slice(0, 10)}</td>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{w.last_activity ? w.last_activity.slice(0, 16) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
