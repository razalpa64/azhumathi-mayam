import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/noto-sans-malayalam';
import '@fontsource-variable/baloo-chettan-2';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-charcoal antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
