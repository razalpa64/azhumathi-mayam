'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { NotificationItem } from '@/types/database';
import { cn, formatDateTime } from '@/lib/utils';

interface NotificationsClientProps {
  initialItems: NotificationItem[];
}

export function NotificationsClient({ initialItems }: NotificationsClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);

  const unreadCount = items.filter((n) => !n.is_read).length;

  async function markOneRead(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );
    await fetch('/api/student/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function markAllRead() {
    setBusy(true);
    try {
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      await fetch('/api/student/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ markAll: true }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 lg:max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal lg:text-[28px]">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted">
            New materials, exam dates and notices.
          </p>
        </div>

        {unreadCount > 0 ? (
          <Button variant="secondary" size="sm" onClick={markAllRead} disabled={busy}>
            <CheckCheck className="h-3.5 w-3.5 text-burgundy" />
            <span>Mark all read</span>
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All caught up"
          description="When something new arrives for your semester, it will show up here."
        />
      ) : (
        <div className="divide-y divide-line rounded-lg border border-line bg-canvas overflow-hidden lg:rounded-[24px]">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors',
                !item.is_read ? 'bg-burgundy-tint/45' : 'bg-canvas'
              )}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!item.is_read ? (
                    <Badge variant="solid">New</Badge>
                  ) : (
                    <Badge variant="muted">Read</Badge>
                  )}
                  <span className="text-[11px] font-mono text-muted">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-charcoal">{item.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{item.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.link_url && item.link_url !== '/dashboard/notifications' ? (
                  <Link
                    href={item.link_url}
                    onClick={() => {
                      if (!item.is_read) markOneRead(item.id);
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded border border-line-strong bg-canvas px-3 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
                {!item.is_read ? (
                  <button
                    type="button"
                    onClick={() => markOneRead(item.id)}
                    className="inline-flex h-8 items-center gap-1 rounded border border-line bg-canvas px-2.5 text-xs font-medium text-muted hover:text-charcoal hover:bg-neutral-soft cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 text-burgundy" />
                    <span>Mark read</span>
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
