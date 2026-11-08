'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  absoluteUrl,
  materialShareMessage,
  subjectShareMessage,
  whatsappShareUrl,
} from '@/lib/share';

interface ShareMenuProps {
  /** App path to open, e.g. /resources/<id> or /dashboard/materials?subjectId=<id> */
  path: string;
  /** Material title, or the subject label for subject shares. */
  title: string;
  subjectLabel?: string | null;
  kind?: 'material' | 'subject';
  /** sm = icon-only (cards), md = labelled button (detail pages). */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Share to a class WhatsApp group (the way Kerala students actually
 * pass notes around), copy the link, or use the OS share sheet.
 */
export function ShareMenu({
  path,
  title,
  subjectLabel = null,
  kind = 'material',
  size = 'sm',
  className,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  const message =
    kind === 'subject'
      ? subjectShareMessage(title, path)
      : materialShareMessage(title, subjectLabel, path);

  async function handleCopy() {
    const url = absoluteUrl(path);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 900);
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text: message });
      setOpen(false);
    } catch {
      // User dismissed the sheet — nothing to do.
    }
  }

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Share ${title}`}
        title="Share with your class group"
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all cursor-pointer active:scale-95',
          size === 'sm'
            ? 'h-9 w-9 border border-line-strong bg-canvas text-charcoal hover:bg-neutral-soft lg:h-10 lg:w-10'
            : 'h-10 border border-line-strong bg-canvas px-4 text-[13px] text-charcoal hover:bg-neutral-soft'
        )}
      >
        <Share2 className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {size === 'md' ? <span>Share</span> : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="anim-scale-in absolute bottom-full right-0 z-30 mb-2 w-52 overflow-hidden rounded-2xl border border-line bg-canvas p-1.5 shadow-[0_24px_45px_-20px_rgba(36,7,7,0.45)]"
        >
          <a
            href={whatsappShareUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-charcoal transition-colors hover:bg-neutral-soft"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C4B]">
              <MessageCircle className="h-4 w-4" />
            </span>
            WhatsApp
          </a>
          <button
            type="button"
            onClick={handleCopy}
            role="menuitem"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-charcoal transition-colors hover:bg-neutral-soft cursor-pointer"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy-tint text-burgundy">
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </span>
            {copied ? 'Link copied!' : 'Copy link'}
          </button>
          {canNativeShare ? (
            <button
              type="button"
              onClick={handleNativeShare}
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-charcoal transition-colors hover:bg-neutral-soft cursor-pointer"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy-tint text-burgundy">
                <Share2 className="h-4 w-4" />
              </span>
              More options…
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
