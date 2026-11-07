import type { MetadataRoute } from 'next';

/**
 * The installable web app. Once a student installs it, അഴിമതി മയം sits in
 * the phone's app drawer with this icon, opens full-screen (standalone),
 * and offers long-press shortcuts straight to the good stuff.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'അഴിമതി മയം — notes, syllabus & question papers',
    short_name: 'അഴിമതി മയം',
    description:
      'Study notes, syllabi and previous question papers, organised by your course and semester.',
    id: '/dashboard',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#660000',
    theme_color: '#660000',
    lang: 'en',
    categories: ['education'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Short Notes & Exam Special',
        short_name: 'Short Notes',
        url: '/dashboard/short-notes',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Question Papers',
        short_name: 'Papers',
        url: '/dashboard/question-papers',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Group Chat',
        short_name: 'Chat',
        url: '/dashboard/chat',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
