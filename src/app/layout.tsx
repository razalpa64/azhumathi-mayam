import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/noto-sans-malayalam';
import '@fontsource-variable/baloo-chettan-2';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { getWebsiteSettings } from '@/lib/auth/session';
import { resolveAdsenseClientId } from '@/lib/adsense';
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_NAME_MALAYALAM,
} from '@/lib/site';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      'Azhimathi Mayam — Study Notes, Question Papers & Syllabus | KTU, Calicut University',
    template: '%s | Azhimathi Mayam',
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'education',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: `${SITE_NAME_MALAYALAM} (${SITE_NAME})`,
    title:
      'Azhimathi Mayam — Study Notes, Question Papers & Syllabus for Kerala Students',
    description: SITE_DESCRIPTION,
    locale: 'en_IN',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Azhimathi Mayam — study notes for Kerala university students',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Azhimathi Mayam — Study Notes, Question Papers & Syllabus',
    description: SITE_DESCRIPTION,
    images: ['/icons/icon-512.png'],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: SITE_NAME_MALAYALAM,
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
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

/** Structured data so search engines understand what the site is. */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: SITE_NAME,
      alternateName: SITE_NAME_MALAYALAM,
      description: SITE_DESCRIPTION,
      inLanguage: ['en-IN', 'ml-IN'],
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: SITE_NAME,
      alternateName: SITE_NAME_MALAYALAM,
      url: `${siteUrl}/`,
      logo: `${siteUrl}/icons/icon-512.png`,
      description: SITE_DESCRIPTION,
    },
  ],
};

export const viewport: Viewport = {
  themeColor: '#660000',
  width: 'device-width',
  initialScale: 1,
  // Android Chrome: when the keyboard opens, shrink the layout viewport
  // (and with it the shells' 100dvh column) instead of letting the
  // keyboard float over the bottom bar / chat composer.
  interactiveWidget: 'resizes-content',
  // No viewportFit: 'cover' — edge-to-edge drawing slid the app header
  // under the status bar on Android Chrome (safe-area-inset-top does not
  // reliably include the status bar there). The default keeps the layout
  // below the status bar; the bottom bars still pad with
  // env(safe-area-inset-bottom) where a browser reports it.
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <Analytics />
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
