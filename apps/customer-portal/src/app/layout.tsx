import '@/lib/env';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { SwRegistration } from '@/components/SwRegistration';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Pointly - بوينتلي',
  applicationName: 'Pointly',
  description: 'Your loyalty points, everywhere. كسب نقاطك وأنت تتسوق في كل مكان.',
  themeColor: '#0d9488',
  openGraph: {
    type: 'website',
    siteName: 'Pointly',
    title: 'Pointly — Loyalty Rewards',
    description: 'View your points, tier, and redeem rewards at any Pointly merchant.',
  },
  twitter: {
    card: 'summary',
    title: 'Pointly — Loyalty Rewards',
    description: 'View your points, tier, and redeem rewards at any Pointly merchant.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('pointly-language');if(l!=='en'&&l!=='ar')l='ar';var d=document.documentElement;d.lang=l;d.dir=l==='ar'?'rtl':'ltr'}catch(_e){}})()`,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <SwRegistration />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
