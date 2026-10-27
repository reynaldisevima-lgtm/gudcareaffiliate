import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth';
import { googleEnabled } from '@/lib/google';
import LoginForm from '@/components/LoginForm';
import Logo from '@/components/Logo';
import { getSettings, PLATFORM_WORKSPACE } from '@/lib/settings';
import GoogleIcon from '@/components/GoogleIcon';

export const metadata = { title: 'Masuk' };

const errors = (APP) => ({
  not_registered: `Email Google ini belum terdaftar. Anggota tim brand: minta link undangan dari admin ${APP}. Project leader: daftar dulu lewat tautan di bawah.`,
  invite_invalid: `Link undangan sudah tidak berlaku. Minta link terbaru dari tim brand kamu atau admin ${APP}.`,
  google_mismatch: `Email ini sudah terhubung ke akun Google lain. Hubungi admin ${APP}.`,
  google_cancel: 'Login Google dibatalkan.',
  google_state: 'Sesi login Google kedaluwarsa. Silakan coba lagi.',
  google_failed: 'Login Google gagal. Silakan coba lagi.',
  google_off: 'Login Google belum dikonfigurasi di server.',
});

export default async function LoginPage({ searchParams }) {
  if (await getUser()) redirect('/dashboard/statistik');
  const { error } = await searchParams;
  const google = googleEnabled();
  const app = await getSettings(PLATFORM_WORKSPACE);
  const ERRORS = errors(app.app_name);
  const triedEmail = error === 'not_registered' ? (await cookies()).get('login_email')?.value : null;
  return (
    <div className="auth">
      <div className="auth-card">
        <Logo app={app} />
        <p className="muted">{app.tagline}</p>
        {ERRORS[error] && (
          <p className="error" role="alert" style={{ textAlign: 'center' }}>
            {triedEmail && <>Akun Google yang dipakai: <strong>{triedEmail}</strong>.<br /></>}
            {ERRORS[error]}
          </p>
        )}
        {google && (
          <>
            <a className="btn google-btn" href="/api/auth/google">
              <GoogleIcon />
              Masuk dengan Google
            </a>
            <div className="divider"><span>atau dengan email & password</span></div>
          </>
        )}
        <LoginForm />
        <p className="muted" style={{ marginTop: 20 }}>Project leader baru? <a href="/daftar">Daftar dan buat workspace sendiri</a></p>
      </div>
    </div>
  );
}
