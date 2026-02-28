import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pointly — The Loyalty Network for Saudi SMBs',
  description:
    'One loyalty card. Every merchant. Pointly connects Saudi businesses into a unified rewards network — no hardware, no integration headaches.',
  keywords: [
    'loyalty program Saudi Arabia',
    'نقاط المكافآت',
    'برنامج الولاء',
    'SMB loyalty',
    'merchant rewards',
    'pointly',
  ],
  authors: [{ name: 'Pointly' }],
  creator: 'Pointly',
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    alternateLocale: 'en_US',
    siteName: 'Pointly',
    title: 'Pointly — The Loyalty Network for Saudi SMBs',
    description:
      'One loyalty card. Every merchant. Join the Saudi loyalty network built for small businesses.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pointly — The Loyalty Network for Saudi SMBs',
    description: 'One loyalty card. Every merchant. Built for Saudi SMBs.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={`${plusJakarta.variable} ${ibmPlexArabic.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
