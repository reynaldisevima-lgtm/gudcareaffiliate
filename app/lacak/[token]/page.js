import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSettings, publicApp } from '@/lib/settings';
import { parseStyle } from '@/lib/brandStyle';
import { respondent, statusLabel } from '@/lib/shipping';
import { fmtUtc } from '@/lib/format';
import PublicShell from '@/components/PublicShell';
import ShipmentSteps, { trackingSearchUrl } from '@/components/ShipmentSteps';

export const dynamic = 'force-dynamic';

// Halaman lacak untuk pengisi form (tanpa login). Hanya menampilkan data pengiriman
// dan catatan yang ditandai publik; jawaban lain dan nama petugas tidak ditampilkan.
async function getTracking(token) {
  if (!/^[A-Za-z0-9_-]{16}$/.test(token)) return null;
  return db.get(`SELECT r.id, r.answers, r.created_at, f.title AS form_title, f.questions,
              b.name AS brand_name, b.color AS brand_color, b.logo AS brand_logo, b.cover AS brand_cover, b.style AS brand_style,
              s.id AS shipment_id, s.status, s.items, s.courier, s.tracking_no, s.updated_at
       FROM responses r JOIN forms f ON f.id=r.form_id JOIN brands b ON b.id=f.brand_id
       LEFT JOIN shipments s ON s.response_id=r.id
       WHERE r.track_token=? AND r.deleted_at IS NULL AND f.deleted_at IS NULL`, token);
}

export async function generateMetadata({ params }) {
  const { token } = await params;
  const t = await getTracking(token);
  return { title: t ? `Lacak kiriman - ${t.brand_name}` : 'Link lacak tidak ditemukan', robots: { index: false } };
}

export default async function TrackPage({ params }) {
  const { token } = await params;
  const t = await getTracking(token);
  if (!t) notFound();
  const who = respondent(JSON.parse(t.questions), JSON.parse(t.answers), t.id);
  const status = t.status || 'pending';
  const events = t.shipment_id
    ? (await db.all('SELECT status, note, is_public, courier, tracking_no, created_at FROM shipment_events WHERE shipment_id=? ORDER BY id DESC', t.shipment_id))
    : [];

  return (
    <PublicShell app={publicApp(await getSettings())} brand={{ name: t.brand_name, color: t.brand_color, logo: t.brand_logo }} style={parseStyle(t.brand_style)} cover={null}>
      <h1>Lacak kiriman</h1>
      <p>Halo {who.name.startsWith('Pengisi #') ? '' : who.name}, ini status barang dari {t.brand_name} untuk pendaftaran “{t.form_title}”.</p>

      <div className="panel">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{statusLabel(status)}</h2>
          {t.updated_at && <span className="muted">Diperbarui {fmtUtc(t.updated_at)}</span>}
        </div>
        <ShipmentSteps status={status} returnedText={`Pengiriman gagal atau barang dikembalikan. Silakan hubungi tim ${t.brand_name}.`} />
        {status === 'pending' && (
          <p className="muted" style={{ margin: '16px 0 0' }}>Data kamu sudah kami terima. Status akan diperbarui saat barang mulai disiapkan.</p>
        )}
        {(t.items || t.tracking_no) && (
          <dl className="answers-dl track-info">
            {t.items && <div><dt>Barang</dt><dd>{t.items}</dd></div>}
            {t.tracking_no && (
              <div>
                <dt>{t.courier || 'Kurir'} · no. resi</dt>
                <dd>
                  <span className="mono">{t.tracking_no}</span>{' '}
                  <a href={trackingSearchUrl(t.courier, t.tracking_no)} target="_blank" rel="noreferrer">Cek resi</a>
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="panel">
        <h2>Riwayat</h2>
        <ol className="timeline">
          {events.map((e, i) => (
            <li key={i}>
              <strong>{statusLabel(e.status)}</strong>
              <p className="muted" style={{ margin: '2px 0 0' }}>{fmtUtc(e.created_at)}</p>
              {e.is_public === 1 && e.note && <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{e.note}</p>}
            </li>
          ))}
          <li>
            <strong>Form terkirim</strong>
            <p className="muted" style={{ margin: '2px 0 0' }}>{fmtUtc(t.created_at)}</p>
          </li>
        </ol>
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>Simpan halaman ini untuk mengecek lagi nanti.</p>
    </PublicShell>
  );
}
