'use client';
import { useActionState } from 'react';
import { login } from '@/app/actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="stack">
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button className="primary block" disabled={pending}>{pending ? 'Memproses...' : 'Masuk'}</button>
    </form>
  );
}
