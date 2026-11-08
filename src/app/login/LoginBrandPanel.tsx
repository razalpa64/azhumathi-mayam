import { MessageCircle } from 'lucide-react';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_URL } from '@/lib/support';

/**
 * Desktop-only left half of the sign-in screen.
 *
 * On a phone the brand lives in the wave header above the card, which works
 * because the page is tall and scrolls. On a laptop it does not: the header
 * ate half the viewport and pushed the sign-in button below the fold. So from
 * `lg` up the brand becomes its own full-height panel beside the card, and the
 * card gets the whole right-hand column to sit in the middle of.
 *
 * The concentric rings are the wave motif from the phone header, seen from
 * above — ripples on still water, which is what "azhi" suggests anyway.
 */
export function LoginBrandPanel() {
  const whatsappHref = `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(
    'Hi Azhimathi Mayam, I need help signing in.'
  )}`;

  return (
    <aside className="relative hidden shrink-0 overflow-hidden bg-[#3D0303] lg:flex lg:w-[42%] lg:max-w-[620px] lg:flex-col lg:justify-between lg:px-12 lg:py-11 xl:px-16">
      {/* deep burgundy field, lit from the top-left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,#6A0606_0%,#4A0404_42%,#2B0202_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_12%_-8%,rgba(255,255,255,0.14),transparent_62%)]"
      />

      {/* ripples, sinking off the bottom-right corner */}
      <svg
        aria-hidden="true"
        viewBox="0 0 480 480"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="pointer-events-none absolute -bottom-44 -right-36 h-[520px] w-[520px] text-white/[0.06]"
      >
        <circle cx="240" cy="240" r="66" />
        <circle cx="240" cy="240" r="112" />
        <circle cx="240" cy="240" r="158" />
        <circle cx="240" cy="240" r="204" />
        <circle cx="240" cy="240" r="250" />
      </svg>

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/60">
          Student portal
        </p>
        <h1 className="mt-6 font-logo text-[56px] font-extrabold leading-[1.45] tracking-tight text-white xl:text-[64px]">
          അഴിമതി
          <br />
          മയം
        </h1>
        <p className="mt-4 max-w-[32ch] text-[15px] leading-relaxed text-white/[0.68]">
          Notes, syllabus and previous year papers — already narrowed to your
          university, scheme, semester and branch.
        </p>
      </div>

      <div className="relative">
        <div className="h-px w-14 bg-white/20" />
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
          Learn · Prepare · Excel
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg text-[13px] font-medium text-white/60 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
          Need a hand? WhatsApp {SUPPORT_PHONE_DISPLAY}
        </a>
      </div>
    </aside>
  );
}
