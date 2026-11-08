'use client';

/**
 * Last-resort boundary. `error.tsx` covers errors *inside* the app shell
 * (so the header and navigation survive); this one catches the rare
 * failure that takes the whole tree down — including a stale client
 * chunk after a deploy, which used to leave a blank white screen until
 * the student thought to hard-reload.
 *
 * It renders its own <html>/<body> because it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      `${error?.name} ${error?.message}`
    );

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFDFC',
          color: '#2B2523',
          fontFamily:
            '"Plus Jakarta Sans Variable", system-ui, -apple-system, "Segoe UI", sans-serif',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#790000',
            }}
          >
            {isChunkError ? 'New version available' : 'Something broke'}
          </p>
          <h1 style={{ margin: '10px 0 0', fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {isChunkError ? 'Reload to continue' : 'We hit a problem loading this page'}
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#6B615D' }}>
            {isChunkError
              ? 'The app was updated while this tab was open. One reload and everything is back.'
              : 'Reload the page. If it keeps happening, message us on WhatsApp and we will fix it.'}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
              marginTop: 22,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => {
                // A full reload is the only way out of a stale chunk.
                window.location.reload();
              }}
              style={{
                minHeight: 46,
                padding: '0 22px',
                borderRadius: 999,
                border: 'none',
                background: '#790000',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 46,
                padding: '0 22px',
                borderRadius: 999,
                border: '1px solid #E3D6D1',
                background: 'transparent',
                color: '#2B2523',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
