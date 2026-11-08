'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Link2, MessageCircle, Send, Share2 } from 'lucide-react';
import { absoluteUrl, materialShareMessage, subjectShareMessage, whatsappShareUrl } from '@/lib/share';
import { cn } from '@/lib/utils';

interface ShareMenuProps {
  /** App path to share, e.g. /resources/<id> or /dashboard/important-questions?subjectId=<id> */
  path: string;
  title: string;
  subjectLabel?: string | null;
  /** 'subject' shares a subject landing (notes/QPs/IQs), default is a single material. */
  kind?: 'material' | 'subject';
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

/**
 * Share entry point: native share sheet where available, otherwise a small
 * menu with WhatsApp + copy link. WhatsApp is the primary channel — most
 * students here pass class notes around in WhatsApp groups.
 *
 * All URLs/messages are built inside click handlers (client-only) so the
 * server-rendered HTML and the first client render always agree (no
 * hydration mismatch), and native-share support is detected after mount.
 */
export function ShareMenu({
  path,
  title,
  subjectLabel = null,
  kind = 'material',
  size = 'sm',
  label = 'Share',
  className,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  function buildMessage() {
    return kind === 'subject'
      ? subjectShareMessage(title, path)
      : materialShareMessage(title, subjectLabel, path);
  }

  async function handleNativeShare() {
    const url = absoluteUrl(path);
    try {
      await navigator.share({ title, text: buildMessage(), url });
    } catch {
      /* user dismissed */
    }
    setOpen(false);
  }

  function handleWhatsApp() {
    window.open(whatsappShareUrl(buildMessage()), '_blank', 'noopener,noreferrer');
    setOpen(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl(path));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => (canNativeShare ? void handleNativeShare() : setOpen((v) => !v))}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border border-line bg-white font-bold text-charcoal transition hover:border-burgundy-border hover:text-burgundy',
          size === 'md' ? 'h-10 px-3.5 text-sm' : 'h-9 px-3 text-xs'
        )}
      >
        <Share2 className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {label}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_50px_-24px_rgba(36,7,7,0.4)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleWhatsApp}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-burgundy-tint"
          >
            <MessageCircle className="h-4 w-4 text-[#128C4A]" />
            Share on WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleCopy()}
            className="flex w-full items-center gap-2.5 border-t border-line px-4 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-burgundy-tint"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Link2 className="h-4 w-4 text-burgundy" />
            )}
            {copied ? 'Link copied!' : 'Copy link'}
          </button>
          {canNativeShare ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleNativeShare()}
              className="flex w-full items-center gap-2.5 border-t border-line px-4 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-burgundy-tint"
            >
              <Send className="h-4 w-4 text-burgundy" />
              More options…
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
