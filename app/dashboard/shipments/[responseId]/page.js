import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getAccessibleForm } from '@/lib/auth';
import { db } from '@/lib/db';
import { respondent, samePerson } from '@/lib/shipping';
import { answerText, fmtUtc } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import ShipmentForm from '@/components/ShipmentForm';
import { StatusTag } from '@/components/ShipmentsBoard';
import ShipmentSteps, { trackingSearchUrl } from '@/components/ShipmentSteps';
import TrackLink from '@/components/TrackLink';
import { listShipments } from '@/lib/shipments';

export const dynamic = 'force-dynamic';

export default async function ShipmentDetailPage({ params }) {
  const { responseId } = await params;
  const user = await requireUser();
  const response = await db.get('SELECT * FROM responses WHERE id=? AND deleted_at IS NULL', Number(responseId));
  const form = response && await getAccessibleForm(user, response.form_id);
  if (!form) notFound();
  const questions = JSON.parse(form.questions);
  const answers = JSON.parse(response.answers);
  const who = respondent(questions, answers, response.id);
  const shipment = await db.get('SELECT * FROM shipments WHERE response_id=?', response.id);
  const events = shipment
    ? (await db.all('SELECT * FROM shipment_events WHERE shipment_id=? ORDER BY id DESC', shipment.id))
    : [];
  const status = shipment?.status || 'pending';
  const brand = await db.get('SELECT name FROM brands WHERE id=?', form.brand_id);
  const others = (await listShipments(user)).filter((r) => r.id !== response.id && samePerson(r, who));

  return (
    <>
      <PageHeader title={who.name} subtitle={`${form.title}${who.detail ? ` · ${who.detail}` : ''}`}>
        <Link className="btn" href={`/dashboard/forms/${form.id}/shipments`}>Kembali ke daftar</Link>
      </PageHeader>

      <div className="panel">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Status pengiriman</h2>
          <StatusTag status={status} />
        </div>
        <ShipmentSteps status={status} returnedText="Pengiriman gagal atau barang dikembalikan. Cek catatan di riwayat." />
        {shipment?.tracking_no && (
          <p style={{ margin: '16px 0 0' }}>
            {shipment.courier || 'Kurir'} · <span className="mono">{shipment.tracking_no}</span>{' '}
            <a href={trackingSearchUrl(shipment.courier, shipment.tracking_no)} target="_blank" rel="noreferrer">Cek resi</a>
          </p>
        )}
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 4 }}>Link lacak untuk pengisi</h2>
        <p className="muted">Pengisi bisa membuka link ini tanpa login untuk melihat status, barang, dan no. resi. Jawaban lain dan nama petugas tidak ditampilkan.</p>
        <TrackLink token={response.track_token} name={who.name} phone={who.detail} brandName={brand.name} />
      </div>

      <div className="split">
        <div className="panel">
          <h2>Update pengiriman</h2>
          <ShipmentForm
            responseId={response.id}
            initial={{ status, items: shipment?.items || '', courier: shipment?.courier || '', tracking_no: shipment?.tracking_no || '' }}
          />
        </div>

        <div className="panel">
          <h2>Riwayat</h2>
          {events.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Belum ada update. Form mengisi pada {fmtUtc(response.created_at)}.</p>
          ) : (
            <ol className="timeline">
              {events.map((e) => (
                <li key={e.id}>
                  <div className="row between" style={{ gap: 8 }}>
                    <StatusTag status={e.status} />
                    <span className="muted">{fmtUtc(e.created_at)}</span>
                  </div>
                  {e.note && <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{e.note}</p>}
                  {e.note && <p className="muted" style={{ margin: '2px 0 0' }}>{e.is_public ? 'Terlihat oleh pengisi' : 'Hanya internal'}</p>}
                  {e.tracking_no && <p className="muted" style={{ margin: '4px 0 0' }}>{e.courier || 'Kurir'} · {e.tracking_no}</p>}
                  <p className="muted" style={{ margin: '4px 0 0' }}>oleh {e.actor}</p>
                </li>
              ))}
              <li>
                <span className="tag">Mengisi form</span>
                <p className="muted" style={{ margin: '4px 0 0' }}>{fmtUtc(response.created_at)}</p>
              </li>
            </ol>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <div className="panel scroll">
          <h2 style={{ marginBottom: 4 }}>Kiriman lain untuk orang ini</h2>
          <p className="muted">Dicocokkan dari nomor WhatsApp atau nama yang sama di form lain.</p>
          <table>
            <thead><tr><th>Form</th><th>Barang</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {others.map((o) => (
                <tr key={o.id}>
                  <td>{o.formTitle}<div className="muted">{o.brandName}</div></td>
                  <td>{o.items || <span className="muted">-</span>}</td>
                  <td><StatusTag status={o.status} /></td>
                  <td><Link className="btn small" href={`/dashboard/shipments/${o.id}`}>Buka</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <h2>Jawaban pengisi</h2>
        <dl className="answers-dl">
          {questions.map((q) => {
            const a = answers[q.id];
            return (
              <div key={q.id}>
                <dt>{q.label}</dt>
                <dd>
                  {a && typeof a === 'object' && !Array.isArray(a) && a.id ? (
                    <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer">{a.name}</a>
                  ) : (
                    answerText(a) || <span className="muted">-</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </>
  );
}
