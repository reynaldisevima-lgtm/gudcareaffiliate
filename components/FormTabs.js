import Link from 'next/link';

const TABS = [
  { key: 'edit', label: 'Edit form', path: '' },
  { key: 'summary', label: 'Ringkasan', path: '/summary' },
  { key: 'responses', label: 'Semua jawaban', path: '/responses' },
  { key: 'shipments', label: 'Pengiriman', path: '/shipments' },
];

export default function FormTabs({ formId, active }) {
  return (
    <nav className="tabs" aria-label="Halaman form">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/dashboard/forms/${formId}${t.path}`}
          className={t.key === active ? 'active' : undefined}
          aria-current={t.key === active ? 'page' : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
