import { requireUser } from '@/lib/auth';
import DashboardShell from '@/components/DashboardShell';
import { getSettings, publicApp } from '@/lib/settings';

export default async function DashboardLayout({ children }) {
  const user = await requireUser();
  return (
    <DashboardShell app={publicApp(await getSettings())} user={{ name: user.name, email: user.email, role: user.role, brand_name: user.brand_name }}>
      {children}
    </DashboardShell>
  );
}
