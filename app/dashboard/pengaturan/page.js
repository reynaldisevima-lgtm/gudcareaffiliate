import { requireAdmin } from '@/lib/auth';
import { getSettings, publicApp } from '@/lib/settings';
import { resetAppSettings } from '@/app/actions';
import PageHeader from '@/components/PageHeader';
import AppSettingsForm from '@/components/AppSettingsForm';
import ConfirmButton from '@/components/ConfirmButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pengaturan aplikasi' };

export default async function AppSettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Pengaturan aplikasi" subtitle="Nama, logo, dan warna aplikasi untuk semua pengguna. Hanya admin yang bisa mengubahnya.">
        <form action={resetAppSettings}>
          <ConfirmButton className="danger" message="Kembalikan nama, logo, dan warna aplikasi ke bawaan?">Kembalikan ke bawaan</ConfirmButton>
        </form>
      </PageHeader>
      <div className="panel">
        <AppSettingsForm initial={{ ...publicApp(s), tagline: s.tagline, primary: s.primary, icon_bg: s.icon_bg, default_favicon: '/icons/favicon-64.png', default_maskable: '/icons/maskable-512.png' }} />
      </div>
    </>
  );
}
