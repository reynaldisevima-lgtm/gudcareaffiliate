import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireUser, getAccessibleBrand, ACCESS, accessLabel } from '@/lib/auth';
import { updateBrand, createBrandUser, setUserAccess, resetUserPassword, deleteBrandUser } from '@/app/actions';
import { parseStyle } from '@/lib/brandStyle';
import { getSettings, publicApp } from '@/lib/settings';
import { fmtNum } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import ConfirmButton from '@/components/ConfirmButton';
import PageHeader from '@/components/PageHeader';
import BrandFields from '@/components/BrandFields';
import InviteLink from '@/components/InviteLink';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const user = await requireUser();
  const b = await getAccessibleBrand(user, (await params).id);
  return { title: b ? `Brand ${b.name}` : 'Brand tidak ditemukan' };
}

// Detail satu brand: identitas & tampilan form, link undangan, dan akun login.
export default async function BrandDetailPage({ params }) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const b = await getAccessibleBrand(user, id);
  if (!b) notFound();
  const app = publicApp(await getSettings());
  const stats = await db.get(
    `SELECT (SELECT COUNT(*)::int FROM forms WHERE brand_id=? AND deleted_at IS NULL) AS forms,
            (SELECT COUNT(*)::int FROM responses r JOIN forms f ON f.id=r.form_id WHERE f.brand_id=? AND f.deleted_at IS NULL AND r.deleted_at IS NULL) AS responses`,
    b.id, b.id
  );
  const users = await db.all(
    "SELECT id, email, name, access, google_sub IS NOT NULL AS google, password_hash<>'' AS has_password FROM users WHERE role='brand' AND brand_id=? ORDER BY name",
    b.id
  );

  return (
    <>
      <PageHeader title={b.name} subtitle={`${fmtNum(stats.forms)} form · ${fmtNum(stats.responses)} jawaban · ${fmtNum(users.length)} akun`}>
        {isAdmin && <Link className="btn" href="/dashboard/brands">Semua brand</Link>}
        <Link className="btn" href={`/dashboard/statistik${isAdmin ? `?brand=${b.id}` : ''}`}>Lihat dashboard brand</Link>
      </PageHeader>

      <section className="panel">
        <h2 style={{ marginBottom: 4 }}>Identitas & tampilan form</h2>
        <p className="muted">Logo, warna, dan tampilan berlaku untuk semua form milik {b.name}.</p>
        <ActionForm action={updateBrand}>
          <input type="hidden" name="id" value={b.id} />
          <BrandFields app={app} brand={b} style={parseStyle(b.style)} />
        </ActionForm>
      </section>

      <section className="panel">
        <h2 style={{ marginBottom: 4 }}>Undang tim brand</h2>
        <p className="muted">Kirim link ini ke tim {b.name}. Siapa pun yang masuk dengan Google lewat link ini langsung menjadi anggota brand ini.</p>
        <InviteLink brandId={b.id} brandName={b.name} token={b.invite_token} />
      </section>

      <section className="panel">
        <h2 style={{ marginBottom: 4 }}>{isAdmin ? 'Akun login brand' : 'Anggota tim'}</h2>
        {users.length === 0 ? (
          <p className="muted">Belum ada akun. Kirim link undangan di atas{isAdmin ? ' atau buat akun di bawah' : ''}.</p>
        ) : (
          <div className="member-list">
            {users.map((u) => (
              <div className="row between member" key={u.id}>
                <span>
                  <strong>{u.name}</strong> <span className="muted">{u.email}</span>{' '}
                  {isAdmin && <span className="tag">{u.google ? 'Google terhubung' : 'Google belum dipakai'}</span>}{' '}
                  {isAdmin && !u.has_password && <span className="tag">Tanpa password</span>}{' '}
                  {!isAdmin && <span className="tag">{accessLabel(u.access)}</span>}
                </span>
                {isAdmin && (
                  <div className="row">
                    <ActionForm action={setUserAccess} submitLabel="Simpan akses" primary={false} className="row">
                      <input type="hidden" name="user_id" value={u.id} />
                      <select name="access" defaultValue={u.access} aria-label={`Akses ${u.email}`} style={{ width: 'auto' }}>
                        {ACCESS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </ActionForm>
                    <ActionForm action={resetUserPassword} submitLabel="Ganti password" primary={false} className="row">
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="password" name="password" placeholder="Password baru" minLength={8} required style={{ width: 160 }} aria-label={`Password baru ${u.email}`} />
                    </ActionForm>
                    <form action={deleteBrandUser}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <ConfirmButton className="small danger" message={`Hapus akun ${u.email}?`}>Hapus</ConfirmButton>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <h3 className="sub" style={{ margin: '0 0 12px', padding: 0, border: 0 }}>Buat akun manual</h3>
            <ActionForm action={createBrandUser} submitLabel="Buat akun">
              <input type="hidden" name="brand_id" value={b.id} />
              <div className="row">
                <div className="grow"><label htmlFor="new-name">Nama</label><input id="new-name" type="text" name="name" required /></div>
                <div className="grow"><label htmlFor="new-email">Email</label><input id="new-email" type="email" name="email" required /></div>
                <div className="grow"><label htmlFor="new-pass">Password (opsional, min. 8)</label><input id="new-pass" type="password" name="password" minLength={8} placeholder="Kosongkan bila hanya login Google" /></div>
                <div>
                  <label htmlFor="new-access">Akses</label>
                  <select id="new-access" name="access" defaultValue="all" style={{ width: 'auto' }}>
                    {ACCESS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>
              <p className="muted" style={{ margin: 0 }}>Affiliate: form, jawaban, dan pengiriman affiliate. KOL: data talent KOL dan pengirimannya. Akun dari link undangan mendapat akses Affiliate & KOL; ubah di daftar di atas bila perlu.</p>
            </ActionForm>
          </div>
        )}
      </section>
    </>
  );
}
