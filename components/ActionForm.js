'use client';
import { useActionState } from 'react';

// Form generik: menjalankan server action dan menampilkan pesan hasilnya.
// Action dipasang langsung ke <form>, jadi tetap berfungsi sebagai progressive enhancement.
// React 19 mengosongkan field setelah action sukses.
export default function ActionForm({ action, children, submitLabel = 'Simpan', primary = true, className = 'stack' }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="row">
        <button className={primary ? 'primary' : ''} disabled={pending}>{pending ? 'Menyimpan...' : submitLabel}</button>
        {state?.ok && <span className="ok" role="status">{state.ok}</span>}
        {state?.error && <span className="error" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
