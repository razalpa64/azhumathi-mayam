'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CornerDownLeft,
  FolderKanban,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

type PaletteIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

export interface PaletteSection {
  label: string | null;
  items: {
    href: string;
    label: string;
    icon: PaletteIcon;
    exact?: boolean;
  }[];
}

interface AdminSearchItem {
  id: string;
  kind: 'student' | 'subject' | 'resource';
  title: string;
  subtitle: string | null;
  href: string;
}

interface PaletteEntry {
  key: string;
  title: string;
  subtitle: string | null;
  href: string;
  icon: PaletteIcon;
  group: string;
}

const KIND_ICON: Record<AdminSearchItem['kind'], PaletteIcon> = {
  student: Users,
  subject: BookOpen,
  resource: FolderKanban,
};

const KIND_LABEL: Record<AdminSearchItem['kind'], string> = {
  student: 'Students',
  subject: 'Subjects',
  resource: 'Study materials',
};

/**
 * ⌘K for the console. Two jobs in one list: jump to a screen, or find a
 * student / subject / resource by name and land on it already filtered.
 *
 * There is no other way an admin can search across those three tables — the
 * individual pages each search only themselves, and nothing searches from
 * outside the page you happen to be on.
 */
export function AdminCommandPalette({
  open,
  onClose,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  sections: PaletteSection[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<AdminSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const trimmed = query.trim();

  // Screens, filtered locally — instant, no network.
  const sectionEntries = useMemo<PaletteEntry[]>(() => {
    const needle = trimmed.toLowerCase();
    const entries: PaletteEntry[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        if (needle && !`${item.label} ${item.href}`.toLowerCase().includes(needle)) continue;
        entries.push({
          key: `section-${item.href}`,
          title: item.label,
          subtitle: section.label,
          href: item.href,
          icon: item.icon,
          group: 'Go to',
        });
      }
    }
    return entries;
  }, [sections, trimmed]);

  const entries = useMemo<PaletteEntry[]>(
    () => [
      ...sectionEntries,
      ...remote.map((item) => ({
        key: item.id,
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
        icon: KIND_ICON[item.kind],
        group: KIND_LABEL[item.kind],
      })),
    ],
    [sectionEntries, remote]
  );

  // Data search, debounced; a stale response can never overwrite a newer one.
  useEffect(() => {
    if (!open || trimmed.length < 2) {
      setRemote([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`, {
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('search failed');
        const data = (await res.json()) as { items?: AdminSearchItem[] };
        setRemote(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setRemote([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, trimmed]);

  // Open → focus the field, reset the query.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setRemote([]);
    setActive(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  // The highlighted row follows the list as it changes.
  useEffect(() => {
    setActive(0);
  }, [trimmed]);

  useEffect(() => {
    if (!open || entries.length === 0) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, entries.length, open]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  if (!open) return null;

  const grouped: { group: string; items: { entry: PaletteEntry; index: number }[] }[] = [];
  entries.forEach((entry, index) => {
    const bucket = grouped.find((g) => g.group === entry.group);
    if (bucket) bucket.items.push({ entry, index });
    else grouped.push({ group: entry.group, items: [{ entry, index }] });
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[10vh]">
      <div
        className="anim-fade absolute inset-0 bg-charcoal/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the admin console"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-canvas shadow-[0_30px_80px_-30px_rgba(36,7,7,0.6)]"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => (entries.length ? (i + 1) % entries.length : 0));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => (entries.length ? (i - 1 + entries.length) % entries.length : 0));
          } else if (event.key === 'Enter') {
            const target = entries[active];
            if (target) {
              event.preventDefault();
              go(target.href);
            }
          }
        }}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search students, subjects, materials — or jump to a screen"
            aria-label="Search students, subjects, materials or screens"
            className="h-8 w-full bg-transparent text-sm text-charcoal outline-none placeholder:text-muted/80"
          />
          {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" /> : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-neutral-soft hover:text-charcoal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
          {entries.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted">
              {trimmed.length < 2
                ? 'Type at least two letters to search.'
                : loading
                  ? 'Searching…'
                  : `Nothing matches “${trimmed}”.`}
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.group} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-[0.16em] text-muted uppercase">
                  {group.group}
                </p>
                <ul>
                  {group.items.map(({ entry, index }) => {
                    const Icon = entry.icon;
                    return (
                      <li key={entry.key}>
                        <Link
                          href={entry.href}
                          data-index={index}
                          onMouseEnter={() => setActive(index)}
                          onClick={(event) => {
                            event.preventDefault();
                            go(entry.href);
                          }}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-colors',
                            index === active
                              ? 'bg-burgundy-tint font-semibold text-burgundy'
                              : 'text-charcoal/85'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                          {entry.subtitle ? (
                            <span className="hidden max-w-[45%] shrink-0 truncate text-[11px] font-medium text-muted sm:block">
                              {entry.subtitle}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-neutral-soft px-1 py-0.5 font-sans text-[10px]">
                ↑↓
              </kbd>
              move
            </span>
            <span className="flex items-center gap-1">
              <kbd className="flex items-center rounded border border-line bg-neutral-soft px-1 py-0.5 font-sans text-[10px]">
                <CornerDownLeft className="h-2.5 w-2.5" />
              </kbd>
              open
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <kbd className="rounded border border-line bg-neutral-soft px-1 py-0.5 font-sans text-[10px]">
                Esc
              </kbd>
              close
            </span>
          </span>
          <span className="hidden sm:block">Screens, students, subjects &amp; materials</span>
        </div>
      </div>
    </div>
  );
}
