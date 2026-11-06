import Link from 'next/link';
import { ArrowRight, LifeBuoy, Mail, MessageCircle, Phone } from 'lucide-react';
import { getWebsiteSettings } from '@/lib/auth/session';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  SUPPORT_WHATSAPP_URL,
} from '@/lib/support';

export const metadata = {
  title: 'Help & Contact',
};

const QUICK_FIXES = [
  {
    q: 'A note or paper is missing',
    a: 'Raise a request and tell us the subject and topic. Most requests are answered with an upload.',
    href: '/dashboard/requests',
    label: 'Request it',
  },
  {
    q: 'My semester or course looks wrong',
    a: 'You can change your programme, branch and semester yourself — your home page updates right away.',
    href: '/dashboard/profile',
    label: 'Fix it in Profile',
  },
  {
    q: 'I can’t sign in',
    a: 'Check the username spelling first (it’s the one you registered with). Still stuck? Call or message us below.',
    href: '/dashboard/settings',
    label: 'Account settings',
  },
];

export default async function HelpPage() {
  const settings = await getWebsiteSettings();
  const email = settings.support_email || SUPPORT_EMAIL;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">Help</h1>
        <p className="mt-1 text-sm text-muted">
          Stuck with something? Try the quick fixes — or just talk to a human.
        </p>
      </div>

      {/* Talk to a human */}
      <section className="rounded-xl border border-burgundy-border bg-burgundy-tint/50 p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-burgundy text-canvas">
            <LifeBuoy className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-charcoal">Talk to us directly</h2>
            <p className="text-xs text-muted">Call, WhatsApp or mail — whatever is easiest.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <a
            href={`tel:${SUPPORT_PHONE_TEL}`}
            className="flex items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-3.5 transition-colors hover:border-burgundy-border"
          >
            <Phone className="h-5 w-5 shrink-0 text-burgundy" />
            <span>
              <span className="block text-[11px] font-medium text-muted">Call</span>
              <span className="block text-sm font-semibold text-charcoal">{SUPPORT_PHONE_DISPLAY}</span>
            </span>
          </a>
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-3.5 transition-colors hover:border-burgundy-border"
          >
            <MessageCircle className="h-5 w-5 shrink-0 text-burgundy" />
            <span>
              <span className="block text-[11px] font-medium text-muted">WhatsApp</span>
              <span className="block text-sm font-semibold text-charcoal">{SUPPORT_PHONE_DISPLAY}</span>
            </span>
          </a>
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-3.5 transition-colors hover:border-burgundy-border"
          >
            <Mail className="h-5 w-5 shrink-0 text-burgundy" />
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-muted">Email</span>
              <span className="block truncate text-sm font-semibold text-charcoal">{email}</span>
            </span>
          </a>
        </div>
      </section>

      {/* Quick fixes */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-charcoal">Before you call</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_FIXES.map((item) => (
            <div
              key={item.q}
              className="flex flex-col justify-between rounded-xl border border-line bg-canvas p-5"
            >
              <div>
                <h3 className="text-sm font-semibold text-charcoal">{item.q}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{item.a}</p>
              </div>
              <Link
                href={item.href}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-burgundy hover:underline"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
