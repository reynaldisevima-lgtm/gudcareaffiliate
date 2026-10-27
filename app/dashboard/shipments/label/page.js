import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { loadLabels } from '@/lib/labels';
import { audit } from '@/lib/audit';
import { formatAddress } from '@/lib/address';
import PrintButton from '@/components/PrintButton';
import { Barcode } from '@/lib/barcode';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cetak label pengiriman' };

const SIZES = {
  thermal: { label: 'Thermal 100 × 150 mm', page: '@page { size: 100mm 150mm; margin: 0; }' },
  a4: { label: 'A4 (4 label per halaman)', page: '@page { size: A4; margin: 8mm; }' },
};

export default async function LabelPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const refs = [].concat(sp.id || []).map(String).slice(0, 200);
  const size = SIZES[sp.ukuran] ? sp.ukuran : 'thermal';
  const labels = refs.length ? await loadLabels(user, refs) : [];

  if (labels.length) {
    const names = labels.map((l) => l.recipient.name);
    const brandIds = [...new Set(labels.map((l) => l.brandId))];
    await audit(user, {
      action: 'label.print',
      summary: `Membuka ${labels.length} label pengiriman: ${names.slice(0, 5).join(', ')}${names.length > 5 ? `, +${names.length - 5} lainnya` : ''}`,
      brandId: brandIds.length === 1 ? brandIds[0] : null,
    });
  }
  const sizeHref = (s) => '?' + new URLSearchParams([...refs.map((r) => ['id', r]), ['ukuran', s]]);

  return (
    <>
      <style>{`${SIZES[size].page}
        @media print {
          .sidebar, .header, .backdrop, .label-toolbar { display: none !important; }
          .main-wrap { margin: 0 !important; }
          .main-wrap > main.container { padding: 0 !important; max-width: none !important; margin: 0 !important; }
          body { background: #fff !important; }
        }`}</style>
      <div className="label-toolbar panel">
        <div className="row between">
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>Label pengiriman</h1>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {labels.length ? `${labels.length} label siap dicetak.` : 'Tidak ada label.'}
              {labels.length < refs.length && ` ${refs.length - labels.length} penerima tidak ditemukan atau bukan milik brand kamu.`}
            </p>
          </div>
          <div className="row">
            <nav className="seg" aria-label="Ukuran label" style={{ margin: 0 }}>
              {Object.entries(SIZES).map(([k, v]) => (
                <Link key={k} href={sizeHref(k)} className={k === size ? 'active' : ''} aria-current={k === size ? 'true' : undefined}>{v.label}</Link>
              ))}
            </nav>
            {labels.length > 0 && <PrintButton className="primary">Cetak</PrintButton>}
          </div>
        </div>
        {labels.some((l) => !l.sender.phone) && (
          <p className="error" style={{ margin: '10px 0 0' }}>Ada brand tanpa no. HP. Isi no. HP brand di menu Brand agar tampil sebagai pengirim.</p>
        )}
        {labels.some((l) => !l.recipient.address) && (
          <p className="error" style={{ margin: '6px 0 0' }}>Ada penerima tanpa alamat terstruktur (form tidak memakai pertanyaan Alamat). Lengkapi alamat secara manual di label.</p>
        )}
      </div>

      {labels.length === 0 ? (
        <div className="panel label-toolbar"><p className="muted" style={{ margin: 0 }}>Pilih penerima di halaman <Link href="/dashboard/shipments">Pengiriman</Link>, lalu klik Cetak label terpilih.</p></div>
      ) : (
        <div className={`label-sheet size-${size}`}>
          {labels.map((l) => (
            <article className="ship-label" key={l.ref}>
              <header className="sl-head">
                {l.sender.logo ? <img src={l.sender.logo} alt={l.sender.name} className="sl-logo" /> : <strong className="sl-brand">{l.sender.name}</strong>}
                {l.courier && <strong className="sl-courier">{l.courier}</strong>}
              </header>
              {l.trackingNo ? (
                <section className="sl-block sl-code">
                  <Barcode value={l.trackingNo} className="sl-barcode" />
                  <div className="sl-resi">{l.trackingNo}</div>
                </section>
              ) : (
                <section className="sl-block sl-code sl-empty">Tempel resi kurir di sini</section>
              )}
              <section className="sl-block sl-to">
                <div className="sl-cap">Penerima</div>
                <div className="sl-name big">{l.recipient.name}</div>
                <div className="sl-phone">{l.recipient.phone || '-'}</div>
                <div className="sl-addr">{l.recipient.address ? formatAddress(l.recipient.address) : ' '}</div>
              </section>
              <section className="sl-block">
                <div className="sl-cap">Pengirim</div>
                <div><span className="sl-name">{l.sender.name}</span>{l.sender.phone && <> · {l.sender.phone}</>}</div>
              </section>
              <section className="sl-block sl-last">
                <div className="sl-cap">Isi paket</div>
                <div className="sl-items">{l.items || '-'}</div>
              </section>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
