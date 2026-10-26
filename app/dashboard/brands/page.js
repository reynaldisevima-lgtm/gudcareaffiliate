import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createBrand, updateBrand, createBrandUser, resetUserPassword, deleteBrandUser } from '@/app/actions';
import ActionForm from '@/components/ActionForm';
import ConfirmButton from '@/components/ConfirmButton';
import PageHeader from '@/components/PageHeader';
import BrandFields from '@/components/BrandFields';
import { parseStyle } from '@/lib/brandStyle';
import InviteLink from '@/components/InviteLink';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const brands = await db.all(`SELECT * FROM brands ${isAdmin ? '' : 'WHERE id=?'} ORDER BY name`, ...(isAdmin ? [] : [user.brand_id]));
  const users = isAdmin
    ? (await db.all("SELECT id,email,name,brand_id,google_sub IS NOT NULL AS google,password_hash<>'' AS has_password FROM users WHERE role='brand' ORDER BY email"))
    : [];
  const members = isAdmin ? [] : await db.all("SELECT name, email FROM users WHERE role='brand' AND brand_id=? ORDER BY name", user.brand_id);

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Brand & akun' : 'Brand saya'}
        subtitle="Logo, warna, dan tampilan form brand berlaku untuk semua form milik brand tersebut."
      />

      {isAdmin && (
        <div className="panel">
          <h2>Tambah brand</h2>
          <ActionForm action={createBrand} submitLabel="Tambah brand">
            <BrandFields />
          </ActionForm>
        </div>
      )}

      {brands.map((b) => (
        <div className="panel" key={b.id}>
          <h2>{b.name}</h2>
          <ActionForm action={updateBrand}>
            <input type="hidden" name="id" value={b.id} />
            <BrandFields brand={b} style={parseStyle(b.style)} />
          </ActionForm>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <h2 style={{ fontSize: 15, marginBottom: 4 }}>Undang tim brand</h2>
            <p className="muted">
              Kirim link ini ke tim {b.name}. Siapa pun yang masuk dengan Google lewat link ini langsung menjadi anggota brand ini.
            </p>
            <InviteLink brandId={b.id} brandName={b.name} token={b.invite_token} />
          </div>

          {!isAdmin && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <h2 style={{ fontSize: 15 }}>Anggota tim</h2>
              {members.map((m) => (
                <div key={m.email} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>{m.name} · {m.email}</div>
              ))}
            </div>
          )}

          {isAdmin && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <h2 style={{ fontSize: 15 }}>Akun login brand</h2>
              {users.filter((u) => u.brand_id === b.id).length === 0 && (
                <p className="muted">Belum ada akun.</p>
              )}
              {users.filter((u) => u.brand_id === b.id).map((u) => (
                <div className="row between" key={u.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <span>
                    {u.name} · {u.email}{' '}
                    <span className="tag">{u.google ? 'Google terhubung' : 'Google belum dipakai'}</span>{' '}
                    {!u.has_password && <span className="tag">Tanpa password</span>}
                  </span>
                  <div className="row">
                    <ActionForm action={resetUserPassword} submitLabel="Ganti password" primary={false} className="row">
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="password" name="password" placeholder="Password baru" minLength={8} required style={{ width: 160 }} aria-label={`Password baru ${u.email}`} />
                    </ActionForm>
                    <form action={deleteBrandUser}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <ConfirmButton className="small danger" message={`Hapus akun ${u.email}?`}>Hapus</ConfirmButton>
                    </form>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <ActionForm action={createBrandUser} submitLabel="Buat akun">
                  <input type="hidden" name="brand_id" value={b.id} />
                  <div className="row">
                    <div className="grow"><label>Nama</label><input type="text" name="name" required /></div>
                    <div className="grow"><label>Email</label><input type="email" name="email" required /></div>
                    <div className="grow"><label>Password (opsional, min. 8)</label><input type="password" name="password" minLength={8} placeholder="Kosongkan bila hanya login Google" /></div>
                  </div>
                </ActionForm>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
