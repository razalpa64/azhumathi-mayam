import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'You are offline',
  robots: { index: false, follow: false },
};

/**
 * Shown by the service worker when a navigation fails with no connection.
 * Inline styles only — it must look right even if no CSS file loads.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#FFFDFC',
        color: '#252323',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <Image
        src="/brand/logo.png"
        alt="അഴിമതി മയം"
        width={72}
        height={72}
        style={{ borderRadius: '18px' }}
        priority
      />
      <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 0' }}>
        You&apos;re offline
      </h1>
      <p
        style={{
          fontSize: '14px',
          lineHeight: 1.6,
          color: '#77716F',
          maxWidth: '320px',
          margin: 0,
        }}
      >
        The library needs a connection to fetch your notes. Check your signal or
        Wi-Fi, then try again — anything you already downloaded is in your
        Downloads, as usual.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          height: '42px',
          padding: '0 20px',
          borderRadius: '999px',
          backgroundColor: '#790000',
          color: '#FFFDFC',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Try again
      </Link>
    </main>
  );
}
