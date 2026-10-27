import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { googleEnabled } from '@/lib/google';
import { getSettings } from '@/lib/settings';
import Logo from '@/components/Logo';
import GoogleIcon from '@/components/GoogleIcon';

export const dynamic = 'force-dynamic';

const getBrand = (token) =>
  /^[0-9a-f]{32}$/.test(token) ? db.get('SELECT id, name, logo, workspace_id FROM brands WHERE invite_token=?', token) : null;

export async function generateMetadata({ params }) {
  const brand = await getBrand((await params).token);
  return { title: brand ? `Gabung ke ${brand.name}` : 'Undangan tidak berlaku', robots: { index: false } };
}

// Halaman undangan untuk tim brand: login Google di sini langsung menjadikan pengguna anggota brand.
export default async function InvitePage({ params }) {
  const { token } = await params;
  const brand = await getBrand(token);
  if (!brand) notFound();
  const user = await getUser();
  const app = await getSettings(brand.workspace_id);

  return (
    <div className="auth">
      <div className="auth-card">
        <Logo app={app} />
        {brand.logo && <img src={brand.logo} alt={brand.name} className="invite-logo" />}
        <h1 style={{ textAlign: 'center', marginTop: 8 }}>Gabung ke tim {brand.name}</h1>
        <p className="muted">
          Kamu diundang mengelola form survey affiliate {brand.name} di {app.app_name}. Masuk dengan akun Google untuk bergabung.
        </p>
        {user ? (
          <>
            <p style={{ textAlign: 'center' }}>Kamu sudah masuk sebagai <strong>{user.email}</strong>.</p>
            <Link className="btn primary google-btn" style={{ color: '#fff' }} href="/dashboard/statistik">Buka dashboard</Link>
          </>
        ) : googleEnabled() ? (
          <a className="btn google-btn" href={`/api/auth/google?invite=${token}`}>
            <GoogleIcon />
            Masuk dengan Google untuk bergabung
          </a>
        ) : (
          <p className="error" style={{ textAlign: 'center' }}>Login Google belum dikonfigurasi di server.</p>
        )}
      </div>
    </div>
  );
}
