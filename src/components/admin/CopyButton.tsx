'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Copy-to-clipboard for the bits of text admins pass on by hand — a student's
 * username, a temporary password. Flashes a tick for a moment so the click is
 * visibly acknowledged.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard blocked (insecure origin, permissions) — the value is still
      // on screen and selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied' : `Copy ${label}`}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={cn(
        'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-neutral-soft hover:text-charcoal',
        className
      )}
    >
      {copied ? <Check className="h-3 w-3 text-[#166534]" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
