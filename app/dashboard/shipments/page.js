import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isStatus } from '@/lib/shipping';
import { listShipments } from '@/lib/shipments';
import PageHeader from '@/components/PageHeader';
import ShipmentsBoard from '@/components/ShipmentsBoard';

export const dynamic = 'force-dynamic';

export default async function ShipmentsPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isAdmin = user.role === 'admin';
  const forms = await db.all(`SELECT f.id, f.title, b.name AS brand_name FROM forms f JOIN brands b ON b.id=f.brand_id
       ${isAdmin ? '' : 'WHERE f.brand_id=?'} ORDER BY f.updated_at DESC`, ...(isAdmin ? [] : [user.brand_id]));
  const formId = forms.some((f) => String(f.id) === sp.form) ? sp.form : '';
  const status = isStatus(sp.status) ? sp.status : '';
  const rows = await listShipments(user, { formId });
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';

  return (
    <>
      <PageHeader title="Pengiriman barang" subtitle="Lacak barang contoh / sponsor yang dikirim ke tiap pengisi form." />
      <form method="get" className="row" style={{ marginBottom: 16 }}>
        {status && <input type="hidden" name="status" value={status} />}
        {q && <input type="hidden" name="q" value={q} />}
        <select name="form" defaultValue={formId} aria-label="Filter form" style={{ width: 'auto', minWidth: 240 }}>
          <option value="">Semua form</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>{f.title}{isAdmin ? ` · ${f.brand_name}` : ''}</option>
          ))}
        </select>
        <button>Terapkan</button>
      </form>
      <ShipmentsBoard rows={rows} status={status} q={q} query={formId ? { form: formId } : {}} showForm={!formId} />
    </>
  );
}
