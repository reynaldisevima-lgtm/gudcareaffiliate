import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getAccessibleKol } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseKol } from '@/lib/kol';
import { formatAddress } from '@/lib/address';
import { fmtUtc } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import ShipmentForm from '@/components/ShipmentForm';
import { StatusTag } from '@/components/ShipmentsBoard';
import ShipmentSteps, { trackingSearchUrl } from '@/components/ShipmentSteps';
import TrackLink from '@/components/TrackLink';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pengiriman KOL' };

export default async function KolShipmentPage({ params }) {
  const { shipmentId } = await params;
  const user = await requireUser();
  const shipment = await db.get('SELECT * FROM shipments WHERE id=? AND kol_id IS NOT NULL', Number(shipmentId) || 0);
  const raw = shipment && (await getAccessibleKol(user, shipment.kol_id));
  if (!raw) notFound();
  const kol = parseKol(raw);
  const events = await db.all('SELECT * FROM shipment_events WHERE shipment_id=? ORDER BY id DESC', shipment.id);

  return (
    <>
      <PageHeader title={kol.name} subtitle={`Pengiriman ke KOL · ${kol.brand_name}`}>
        <Link className="btn" href={`/dashboard/kol/${kol.id}`}>Data KOL</Link>
        <a className="btn" href={`/dashboard/shipments/label?id=k${shipment.id}`} target="_blank" rel="noreferrer">Cetak label</a>
      </PageHeader>

      <div className="panel">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Status pengiriman</h2>
          <StatusTag status={shipment.status} />
        </div>
        <ShipmentSteps status={shipment.status} returnedText="Pengiriman gagal atau barang dikembalikan. Cek catatan di riwayat." />
        {shipment.tracking_no && (
          <p style={{ margin: '16px 0 0' }}>
            {shipment.courier || 'Kurir'} · <span className="mono">{shipment.tracking_no}</span>{' '}
            <a href={trackingSearchUrl(shipment.courier, shipment.tracking_no)} target="_blank" rel="noreferrer">Cek resi</a>
          </p>
        )}
        <p className="muted" style={{ margin: '12px 0 0' }}>Dikirim ke: {kol.phone} · {formatAddress(kol.address)}</p>
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 4 }}>Link lacak untuk KOL</h2>
        <p className="muted">KOL bisa membuka link ini tanpa login untuk melihat status, barang, dan no. resi. NPWP, rekening, dan nama petugas tidak ditampilkan.</p>
        <TrackLink token={shipment.track_token} name={kol.name} phone={kol.phone} brandName={kol.brand_name} />
      </div>

      <div className="split">
        <div className="panel">
          <h2>Update pengiriman</h2>
          <ShipmentForm
            target={{ name: 'kol_shipment_id', value: shipment.id }}
            initial={{ status: shipment.status, items: shipment.items || '', courier: shipment.courier || '', tracking_no: shipment.tracking_no || '' }}
          />
        </div>

        <div className="panel">
          <h2>Riwayat</h2>
          <ol className="timeline">
            {events.map((e) => (
              <li key={e.id}>
                <div className="row between" style={{ gap: 8 }}>
                  <StatusTag status={e.status} />
                  <span className="muted">{fmtUtc(e.created_at)}</span>
                </div>
                {e.note && <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{e.note}</p>}
                {e.note && <p className="muted" style={{ margin: '2px 0 0' }}>{e.is_public ? 'Terlihat oleh KOL' : 'Hanya internal'}</p>}
                {e.tracking_no && <p className="muted" style={{ margin: '4px 0 0' }}>{e.courier || 'Kurir'} · {e.tracking_no}</p>}
                <p className="muted" style={{ margin: '4px 0 0' }}>oleh {e.actor}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
