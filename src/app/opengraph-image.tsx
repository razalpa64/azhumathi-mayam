import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The card that appears when the site is shared on WhatsApp, Telegram,
 * X or LinkedIn. Statically generated at build time from the real brand
 * mark, so a forwarded link never renders as a bare grey square.
 *
 * Note: the brand mark already carries the Malayalam wordmark, so the
 * text here stays in Latin script (no Malayalam font is embedded in the
 * image renderer).
 */
export const alt =
  'Azhimathi Mayam — study notes, question papers and syllabus for Kerala university students';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const UNIVERSITIES = ['KTU', 'Calicut', 'Kerala', 'MG University', 'Kannur', 'CUSAT'];

export default async function OpengraphImage() {
  let logoSrc: string | null = null;
  try {
    const logo = await readFile(join(process.cwd(), 'public/brand/logo.png'));
    logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  } catch {
    logoSrc = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #7A0000 0%, #5A0303 55%, #360202 100%)',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              width={112}
              height={112}
              style={{ borderRadius: 26, border: '2px solid rgba(255,255,255,0.35)' }}
            />
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#fff', fontSize: 40, fontWeight: 800, letterSpacing: -0.5 }}>
              AZHIMATHI MAYAM
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 3,
                marginTop: 6,
              }}
            >
              STUDENT PORTAL · KERALA
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#fff',
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.16,
              letterSpacing: -1.2,
            }}
          >
            Notes, question papers &amp; syllabus
          </div>
          <div
            style={{
              color: '#FFD9D9',
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.16,
              letterSpacing: -1.2,
            }}
          >
            ready before your exam.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {UNIVERSITIES.map((name) => (
            <div
              key={name}
              style={{
                display: 'flex',
                padding: '10px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#fff',
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
