import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { googleEnabled } from '@/lib/google';
import { getSettings, PLATFORM_WORKSPACE } from '@/lib/settings';
import Logo from '@/components/Logo';
import GoogleIcon from '@/components/GoogleIcon';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Daftar project leader' };

// Pendaftaran project leader: membuat workspace sendiri (brand, form, KOL, dan pengaturan terpisah).
export default async function SignupPage() {
  if (await getUser()) redirect('/dashboard/statistik');
  const app = await getSettings(PLATFORM_WORKSPACE);
  return (
    <div className="auth">
      <div className="auth-card">
        <Logo app={app} />
        <h1 style={{ textAlign: 'center', marginTop: 8 }}>Daftar sebagai project leader</h1>
        <p className="muted">
          Kamu akan mendapat workspace sendiri untuk mengelola brand, form affiliate, data KOL, dan pengiriman barang.
          Data workspace-mu terpisah dari workspace lain.
        </p>
        {googleEnabled() ? (
          <form method="get" action="/api/auth/google" className="stack">
            <div>
              <label htmlFor="signup">Nama workspace</label>
              <input id="signup" name="signup" type="text" required minLength={2} maxLength={60} placeholder="mis. Tim Skincare Rina" />
              <p className="muted" style={{ margin: '4px 0 0', textAlign: 'left' }}>Bisa diganti nanti di Pengaturan aplikasi.</p>
            </div>
            <button className="btn google-btn" type="submit"><GoogleIcon /> Daftar dengan Google</button>
          </form>
        ) : (
          <p className="error" style={{ textAlign: 'center' }}>Login Google belum dikonfigurasi di server.</p>
        )}
        <p className="muted" style={{ marginTop: 20 }}>
          Anggota tim brand tidak perlu mendaftar di sini; minta link undangan dari project leader-mu. Sudah punya akun? <Link href="/login">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
