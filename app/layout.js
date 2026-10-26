import { Plus_Jakarta_Sans } from 'next/font/google';
import { PwaRegister } from '@/components/Pwa';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-jakarta' });

export const metadata = {
  title: 'Gudcare Survey Affiliate',
  description: 'Form survey affiliate untuk brand-brand Gudcare',
  applicationName: 'Gudcare',
  appleWebApp: { capable: true, title: 'Gudcare', statusBarStyle: 'default' },
};

export const viewport = {
  themeColor: '#5d87ff',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
