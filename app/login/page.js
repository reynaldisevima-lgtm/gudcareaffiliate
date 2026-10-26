import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';
import Logo from '@/components/Logo';

export const metadata = { title: 'Masuk - Gudcare Survey' };

export default async function LoginPage() {
  if (await getUser()) redirect('/dashboard');
  return (
    <div className="auth">
      <div className="auth-card">
        <Logo />
        <p className="muted">Masuk untuk mengelola form survey affiliate brand kamu.</p>
        <LoginForm />
      </div>
    </div>
  );
}
