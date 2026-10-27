import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getAccessibleKol } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseKol, mask } from '@/lib/kol';
import { formatAddress } from '@/lib/address';
import { fmtNum, fmtUtc } from '@/lib/format';
import { deleteKol, createKolShipment } from '@/app/actions';
import PageHeader from '@/components/PageHeader';
import KolForm from '@/components/KolForm';
import RevealSensitive from '@/components/RevealSensitive';
import ConfirmButton from '@/components/ConfirmButton';
import { StatusTag } from '@/components/ShipmentsBoard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const user = await requireUser();
  const k = await getAccessibleKol(user, (await params).id);
  return { title: k ? `KOL ${k.name}` : 'KOL tidak ditemukan' };
}

export default async function KolDetailPage({ params }) {
  const user = await requireUser();
  const raw = await getAccessibleKol(user, (await params).id);
  if (!raw) notFound();
  const k = parseKol(raw);
  const shipments = await db.all('SELECT id, status, items, courier, tracking_no, updated_at FROM shipments WHERE kol_id=? ORDER BY id DESC', k.id);
  // Data sensitif tidak dikirim ke browser; hanya versi tersamar.
  const formKol = { ...k, npwp: '', bank_account: '' };

  return (
    <>
      <PageHeader title={k.name} subtitle={`KOL · ${k.brand_name}`}>
        <Link className="btn" href="/dashboard/kol">Semua KOL</Link>
        <form action={deleteKol}>
          <input type="hidden" name="id" value={k.id} />
          <ConfirmButton className="danger" message={`Hapus data KOL ${k.name}? Admin masih bisa memulihkannya dari Log aktivitas.`}>Hapus KOL</ConfirmButton>
        </form>
      </PageHeader>

      <div className="split">
        <section className="panel">
          <h2>Kontak & alamat</h2>
          <dl className="answers-dl">
            <div><dt>No. HP / WhatsApp</dt><dd>{k.phone}</dd></div>
            <div><dt>Email</dt><dd>{k.email || '-'}</dd></div>
            <div><dt>Alamat pengiriman</dt><dd>{formatAddress(k.address) || '-'}</dd></div>
          </dl>
          <h3 className="sub">Sosial media</h3>
          <ul className="answers">
            {k.socials.map((s, i) => (
              <li key={i}><span><strong>{s.platform}</strong> · @{s.username}</span><span className="muted">{s.followers ? `${fmtNum(s.followers)} followers` : ''}</span></li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Pajak & rekening</h2>
          <p style={{ margin: '0 0 8px' }}>{k.bank_name ? `${k.bank_name} · a.n. ${k.bank_holder}` : <span className="muted">Rekening belum diisi.</span>}</p>
          <RevealSensitive kolId={k.id} masked={{ npwp: mask(raw.npwp), bank_account: mask(raw.bank_account) }} />
          {k.notes && <><h3 className="sub">Catatan</h3><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{k.notes}</p></>}
        </section>
      </div>

      <section className="panel">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Pengiriman ke KOL ini</h2>
        </div>
        <form action={createKolShipment} className="row" style={{ marginBottom: 16 }}>
          <input type="hidden" name="kol_id" value={k.id} />
          <input type="text" name="items" maxLength={500} placeholder="Barang yang akan dikirim, mis. Serum 30 ml x2" aria-label="Barang yang akan dikirim" className="grow" />
          <button className="primary">Buat pengiriman</button>
        </form>
        {shipments.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Belum ada pengiriman.</p>
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Barang</th><th>Kurir & resi</th><th>Status</th><th>Diubah (UTC)</th><th></th></tr></thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td>{s.items || <span className="muted">-</span>}</td>
                    <td>{s.tracking_no ? <>{s.courier || 'Kurir'}<div className="mono">{s.tracking_no}</div></> : <span className="muted">-</span>}</td>
                    <td><StatusTag status={s.status} /></td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtUtc(s.updated_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn small" href={`/dashboard/shipments/kol/${s.id}`}>Update</Link>{' '}
                      <a className="btn small" href={`/dashboard/shipments/label?id=k${s.id}`} target="_blank" rel="noreferrer">Label</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Ubah data KOL</h2>
        <KolForm kol={formKol} hasNpwp={!!raw.npwp} hasAccount={!!raw.bank_account} />
      </section>
    </>
  );
}
