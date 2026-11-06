import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/noto-sans-malayalam';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'അഴിമതി മയം — notes, syllabus & question papers',
    template: '%s | അഴിമതി മയം',
  },
  description:
    'അഴിമതി മയം — study notes, syllabi and previous question papers, organised by your course and semester.',
  applicationName: 'അഴിമതി മയം',
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
      </body>
    </html>
  );
}
