import { AppSkeleton } from '@/components/AppSkeleton';
import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';
import '../components/receipt/receipt-print.css';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Pointly Merchant Dashboard | لوحة تحكم التاجر',
    template: '%s | Pointly',
  },
  description: 'Manage your loyalty program with Pointly - إدارة برنامج الولاء الخاص بك مع بوينتلي',
  keywords: [
    'loyalty program',
    'merchant dashboard',
    'points',
    'rewards',
    'برنامج الولاء',
    'نقاط',
    'مكافآت',
  ],
  authors: [{ name: 'Pointly' }],
  creator: 'Pointly',
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    alternateLocale: 'en_US',
    siteName: 'Pointly',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${inter.variable} ${ibmPlexArabic.variable}`}
    >
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;d.classList.add('notready');try{var l=localStorage.getItem('pointly-language');if(l!=='en'&&l!=='ar')l='ar';d.lang=l;d.dir=l==='ar'?'rtl':'ltr'}catch(_e){d.lang='ar';d.dir='rtl'}})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppSkeleton />
        <div id="app-content">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
