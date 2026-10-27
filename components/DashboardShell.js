'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions';
import Logo from '@/components/Logo';
import { InstallButton } from '@/components/Pwa';

// Ikon garis gaya Tabler (dipakai Modernize), digambar inline supaya tanpa dependensi.
const ICONS = {
  forms: <><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M9 9h1M9 13h6M9 17h6" /></>,
  brand: <><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" /></>,
  truck: <><path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0" /><path d="M5 17H3V6a1 1 0 0 1 1-1h9v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5" /></>,
  book: <><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6v13M12 6v13M21 6v13" /></>,
  settings: <><path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.5 1.8 3 0 3.5a1.7 1.7 0 0 0-1 2.5c.9 1.6-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1.1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1.1c-1.5.9-3.3-.8-2.4-2.4a1.7 1.7 0 0 0-1-2.5c-1.8-.5-1.8-3 0-3.5a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4a1.7 1.7 0 0 0 2.6-1.1z" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0" /></>,
  users: <><path d="M9 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15v2M11 11v6M15 7v10M19 13v4" /></>,
  history: <><path d="M12 8v4l2 2" /><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  logout: <><path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" /><path d="M9 12h12l-3-3M18 15l3-3" /></>,
};

function Icon({ name, size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export default function DashboardShell({ app, user, children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const profileRef = useRef(null);
  const isAdmin = user.role === 'admin';
  const displayName = user.name || user.email;

  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => { if (!profileRef.current?.contains(e.target)) setMenu(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menu]);

  const nav = [
    ...(user.access !== 'kol' ? [
    { href: '/dashboard/statistik', label: 'Dashboard', icon: 'chart', active: pathname.startsWith('/dashboard/statistik') },
    { href: '/dashboard', label: 'Form', icon: 'forms', active: pathname === '/dashboard' || (pathname.startsWith('/dashboard/forms') && !pathname.endsWith('/shipments')) },
    ] : []),
    { href: '/dashboard/shipments', label: 'Pengiriman', icon: 'truck', active: (pathname.startsWith('/dashboard/shipments') && !pathname.startsWith('/dashboard/shipments/kol')) || /^\/dashboard\/forms\/\d+\/shipments/.test(pathname) },
    ...(user.access !== 'affiliate' ? [{ href: '/dashboard/kol', label: 'KOL', icon: 'users', active: pathname.startsWith('/dashboard/kol') || pathname.startsWith('/dashboard/shipments/kol') }] : []),
    { href: '/dashboard/brands', label: isAdmin ? 'Brand & akun' : 'Brand saya', icon: 'brand', active: pathname.startsWith('/dashboard/brands') },
    ...(isAdmin
      ? [
          { href: '/dashboard/log', label: 'Log aktivitas', icon: 'history', active: pathname.startsWith('/dashboard/log') },
          { href: '/dashboard/pengaturan', label: 'Pengaturan aplikasi', icon: 'settings', active: pathname.startsWith('/dashboard/pengaturan') },
          { href: '/dashboard/panduan', label: 'Panduan admin', icon: 'book', active: pathname.startsWith('/dashboard/panduan') },
        ]
      : []),
    ...(user.is_owner ? [{ href: '/dashboard/workspaces', label: 'Semua workspace', icon: 'brand', active: pathname.startsWith('/dashboard/workspaces') }] : []),
  ];

  return (
    <>
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navigasi">
        <div className="sidebar-brand">
          <Link href="/dashboard" className="logo-link"><Logo app={app} /></Link>
          <button type="button" className="icon-btn close-btn" onClick={() => setOpen(false)} aria-label="Tutup menu"><Icon name="close" /></button>
        </div>
        <div className="side-label">Menu</div>
        <nav>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`side-link${n.active ? ' active' : ''}`} aria-current={n.active ? 'page' : undefined}>
              <Icon name={n.icon} />
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="backdrop" onClick={() => setOpen(false)} />

      <div className="main-wrap">
        <header className="header">
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Buka menu"><Icon name="menu" /></button>
          <div className="spacer" />
          <InstallButton />
          <div className="profile" ref={profileRef}>
            <button type="button" className="profile-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="true">
              <span className="avatar" aria-hidden="true">{displayName[0]}</span>
              <span className="profile-name">{displayName}</span>
            </button>
            {menu && (
              <div className="profile-menu">
                <div className="who">
                  <span className="avatar lg" aria-hidden="true">{displayName[0]}</span>
                  <div>
                    <p className="profile-name">{displayName}</p>
                    <p className="muted">{isAdmin ? `Super admin · ${user.workspace_name}` : `${user.brand_name} · ${user.workspace_name}`}</p>
                    <p className="muted">{user.email}</p>
                  </div>
                </div>
                <form action={logout}>
                  <button className="block"><Icon name="logout" size={18} />Keluar</button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="container">{children}</main>
      </div>
    </>
  );
}
