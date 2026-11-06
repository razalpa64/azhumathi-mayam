import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Noto_Sans_Malayalam } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const malayalam = Noto_Sans_Malayalam({
  subsets: ['malayalam'],
  variable: '--font-malayalam',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'അഴിമതി മയം — Academic Resource & Student Learning Platform',
    template: '%s | അഴിമതി മയം',
  },
  description:
    'അഴിമതി മയം — Authenticated academic resource library, curated syllabus notes, university question papers, and student learning portal.',
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
    <html
      lang="en"
      className={`${jakarta.variable} ${jetbrains.variable} ${malayalam.variable}`}
    >
      <body className="min-h-screen bg-canvas text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
