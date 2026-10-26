import { Plus_Jakarta_Sans } from 'next/font/google';
import { PwaRegister } from '@/components/Pwa';
import { getSettings } from '@/lib/settings';
import { primaryVars } from '@/lib/color';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-jakarta' });

export async function generateMetadata() {
  const s = await getSettings();
  return {
    title: { default: `${s.app_name} Survey Affiliate`, template: `%s - ${s.app_name}` },
    description: `Form survey affiliate untuk brand-brand ${s.app_name}`,
    applicationName: s.app_name,
    appleWebApp: { capable: true, title: s.app_name, statusBarStyle: 'default' },
    icons: { icon: [{ url: s.icons.favicon, type: 'image/png', sizes: '64x64' }], apple: [{ url: s.icons.apple, sizes: '180x180' }] },
  };
}

export async function generateViewport() {
  return { themeColor: (await getSettings()).primary };
}

export default async function RootLayout({ children }) {
  const s = await getSettings();
  // Warna utama pilihan admin beserta turunannya (lib/color.js); nilainya selalu hex tervalidasi.
  const css = `:root{${Object.entries(primaryVars(s.primary)).map(([k, v]) => `${k}:${v}`).join(';')}}`;
  return (
    <html lang="id" className={jakarta.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
