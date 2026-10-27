import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { ACTIONS, KINDS } from '@/lib/audit';
import { fmtUtc } from '@/lib/format';
import { restoreForm, restoreResponse, revertForm } from '@/app/actions';
import PageHeader from '@/components/PageHeader';
import ConfirmButton from '@/components/ConfirmButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Log aktivitas' };

const PAGE = 50;

function Changes({ changes }) {
  if (!changes?.length) return null;
  return (
    <ul className="log-changes">
      {changes.map((c, i) => (
        <li key={i}>
          <strong>{c.field}</strong>
          {c.list ? <>: {c.list.join(', ')}</> : null}
          {c.from !== undefined ? <>: <del>{c.from || '(kosong)'}</del> → <ins>{c.to || '(kosong)'}</ins></> : c.to && !c.list ? <>: {c.to}</> : null}
        </li>
      ))}
    </ul>
  );
}

export default async function AuditLogPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const kind = KINDS.some((k) => k.value === sp.kind) ? sp.kind : '';
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
  const brands = await db.all('SELECT id, name FROM brands ORDER BY name');
  const brand = brands.find((b) => String(b.id) === sp.brand);
  const before = Number(sp.before) || null;

  const where = [];
  const args = [];
  if (kind) {
    const actions = Object.entries(ACTIONS).filter(([, a]) => a.kind === kind).map(([k]) => k);
    where.push(`action IN (${actions.map(() => '?').join(',')})`);
    args.push(...actions);
  }
  if (brand) { where.push('brand_id=?'); args.push(brand.id); }
  if (q) { where.push('(summary ILIKE ? OR actor_email ILIKE ? OR actor_name ILIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (before) { where.push('id<?'); args.push(before); }
  const rows = await db.all(
    `SELECT * FROM audit_logs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ${PAGE + 1}`,
    ...args
  );
  const more = rows.length > PAGE;
  const logs = rows.slice(0, PAGE).map((r) => ({ ...r, details: r.details ? JSON.parse(r.details) : null }));

  // Status terkini target agar tombol Pulihkan/Kembalikan hanya muncul bila masih berlaku.
  const ids = (type) => [...new Set(logs.filter((l) => l.target_type === type && l.target_id).map((l) => l.target_id))];
  const formIds = ids('form');
  const responseIds = ids('response');
  const formState = new Map(
    formIds.length ? (await db.all(`SELECT id, deleted_at FROM forms WHERE id IN (${formIds.map(() => '?').join(',')})`, ...formIds)).map((f) => [f.id, f]) : []
  );
  const responseState = new Map(
    responseIds.length
      ? (await db.all(`SELECT r.id, r.deleted_at, f.deleted_at AS form_deleted_at FROM responses r JOIN forms f ON f.id=r.form_id WHERE r.id IN (${responseIds.map(() => '?').join(',')})`, ...responseIds)).map((r) => [r.id, r])
      : []
  );
  const brandName = new Map(brands.map((b) => [b.id, b.name]));
  const href = (extra) => '?' + new URLSearchParams({ ...(kind ? { kind } : {}), ...(brand ? { brand: brand.id } : {}), ...(q ? { q } : {}), ...extra });

  function Action({ l }) {
    const f = l.target_type === 'form' ? formState.get(l.target_id) : null;
    const r = l.target_type === 'response' ? responseState.get(l.target_id) : null;
    if (l.action === 'form.delete') {
      if (!f) return <span className="muted">Data tidak ada</span>;
      if (!f.deleted_at) return <span className="muted">Sudah dipulihkan</span>;
      return (
        <form action={restoreForm}>
          <input type="hidden" name="id" value={l.target_id} />
          <ConfirmButton className="small" message="Pulihkan form ini beserta semua jawaban, file, dan riwayat pengirimannya?">Pulihkan</ConfirmButton>
        </form>
      );
    }
    if (l.action === 'response.delete') {
      if (!r) return <span className="muted">Data tidak ada</span>;
      if (!r.deleted_at) return <span className="muted">Sudah dipulihkan</span>;
      return (
        <form action={restoreResponse}>
          <input type="hidden" name="id" value={l.target_id} />
          <ConfirmButton className="small" message="Pulihkan jawaban ini beserta file dan riwayat pengirimannya?">Pulihkan</ConfirmButton>
          {r.form_deleted_at && <p className="muted" style={{ margin: '4px 0 0' }}>Form-nya juga terhapus; pulihkan form agar terlihat.</p>}
        </form>
      );
    }
    if (l.action === 'form.update' && l.details?.before && f && !f.deleted_at) {
      return (
        <form action={revertForm}>
          <input type="hidden" name="log_id" value={l.id} />
          <ConfirmButton className="small" message="Kembalikan judul, deskripsi, pesan, status, dan pertanyaan form ke keadaan sebelum perubahan ini? Jawaban yang sudah masuk tidak terpengaruh.">Kembalikan</ConfirmButton>
        </form>
      );
    }
    if (l.target_type === 'form' && f && !f.deleted_at) return <Link className="btn small" href={`/dashboard/forms/${l.target_id}`}>Buka</Link>;
    if (l.target_type === 'response' && r && !r.deleted_at && !r.form_deleted_at) return <Link className="btn small" href={`/dashboard/shipments/${l.target_id}`}>Buka</Link>;
    return null;
  }

  return (
    <>
      <PageHeader title="Log aktivitas" subtitle="Siapa melakukan apa dan kapan. Form dan jawaban yang terhapus bisa dipulihkan dari sini." />

      <form method="get" className="row" style={{ marginBottom: 16 }} role="search">
        <select name="kind" defaultValue={kind} aria-label="Jenis aktivitas" style={{ width: 'auto' }}>
          <option value="">Semua aktivitas</option>
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <select name="brand" defaultValue={brand?.id || ''} aria-label="Brand" style={{ width: 'auto', minWidth: 180 }}>
          <option value="">Semua brand</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="search" name="q" defaultValue={q} placeholder="Cari nama form, email, atau pengguna" aria-label="Cari log" style={{ maxWidth: 320 }} />
        <button>Terapkan</button>
        {(kind || brand || q) && <Link href="?">Hapus filter</Link>}
      </form>

      <div className="panel scroll" style={{ padding: 0 }}>
        {logs.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0 }}>{kind || brand || q ? 'Tidak ada aktivitas yang cocok dengan filter.' : 'Belum ada aktivitas tercatat.'}</p>
        ) : (
          <table className="log-table">
            <thead>
              <tr><th>Waktu (UTC)</th><th>Pengguna</th><th>Aktivitas</th><th></th></tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const a = ACTIONS[l.action] || { label: l.action, kind: 'ubah' };
                return (
                  <tr key={l.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtUtc(l.created_at).replace(' UTC', '')}</td>
                    <td>
                      {l.actor_email ? <>{l.actor_name || l.actor_email}<div className="muted">{l.actor_email}{l.actor_role === 'admin' ? ' · admin' : ''}</div></> : <span className="muted">Tanpa login</span>}
                    </td>
                    <td>
                      <span className={`tag k-${a.kind}`}>{a.label}</span> {l.summary}
                      {l.brand_id && brandName.get(l.brand_id) && <div className="muted">Brand: {brandName.get(l.brand_id)}{l.ip ? ` · IP ${l.ip}` : ''}</div>}
                      {!l.brand_id && l.ip && <div className="muted">IP {l.ip}</div>}
                      {l.details?.changes?.length > 0 && (
                        <details className="log-details">
                          <summary>Lihat perubahan</summary>
                          <Changes changes={l.details.changes} />
                        </details>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}><Action l={l} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {more && (
        <p><Link className="btn" href={href({ before: logs[logs.length - 1].id })}>Tampilkan aktivitas lebih lama</Link></p>
      )}
    </>
  );
}
