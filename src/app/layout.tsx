import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/noto-sans-malayalam';
import '@fontsource-variable/baloo-chettan-2';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { getWebsiteSettings } from '@/lib/auth/session';
import { resolveAdsenseClientId } from '@/lib/adsense';

export const metadata: Metadata = {
  title: {
    default: 'അഴിമതി മയം — notes, syllabus & question papers',
    template: '%s | അഴിമതി മയം',
  },
  description:
    'അഴിമതി മയം — study notes, syllabi and previous question papers, organised by your course and semester.',
  applicationName: 'അഴിമതി മയം',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'അഴിമതി മയം',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: {
    index: true,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#660000',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The AdSense library is loaded on every page (this is also what
  // verifies the site with Google). Individual ad UNITS only render
  // where an enabled placement exists and ads are switched on in
  // Admin → Settings, so students never see a unit this doesn't gate.
  let adsenseClientId = resolveAdsenseClientId(null);
  try {
    const settings = await getWebsiteSettings();
    adsenseClientId = resolveAdsenseClientId(settings.adsense_publisher_id);
  } catch {
    // Settings unreachable (e.g. during a build) — the built-in
    // publisher account still applies.
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-charcoal antialiased">
        {children}
        <ServiceWorkerRegister />
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
