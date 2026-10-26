import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth';
import { googleEnabled } from '@/lib/google';
import LoginForm from '@/components/LoginForm';
import Logo from '@/components/Logo';
import GoogleIcon from '@/components/GoogleIcon';

export const metadata = { title: 'Masuk - Gudcare Survey' };

const ERRORS = {
  not_registered: 'Email Google ini belum terdaftar. Minta link undangan dari tim brand kamu atau admin Gudcare, lalu masuk lewat link itu.',
  invite_invalid: 'Link undangan sudah tidak berlaku. Minta link terbaru dari tim brand kamu atau admin Gudcare.',
  google_mismatch: 'Email ini sudah terhubung ke akun Google lain. Hubungi admin Gudcare.',
  google_cancel: 'Login Google dibatalkan.',
  google_state: 'Sesi login Google kedaluwarsa. Silakan coba lagi.',
  google_failed: 'Login Google gagal. Silakan coba lagi.',
  google_off: 'Login Google belum dikonfigurasi di server.',
};

export default async function LoginPage({ searchParams }) {
  if (await getUser()) redirect('/dashboard');
  const { error } = await searchParams;
  const google = googleEnabled();
  const triedEmail = error === 'not_registered' ? (await cookies()).get('login_email')?.value : null;
  return (
    <div className="auth">
      <div className="auth-card">
        <Logo />
        <p className="muted">Masuk untuk mengelola form survey affiliate brand kamu.</p>
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
      </div>
    </div>
  );
}
