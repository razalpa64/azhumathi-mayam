'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, CornerDownLeft, Menu, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface DesktopNavProps {
  sections: NavItem[];
  unreadNotifications: number;
}

/**
 * Where each section sits in the desktop menu. Anything missing from these
 * lists is appended to the last group, so a section added to ALL_SECTIONS can
 * never become unreachable on a laptop.
 */
const GROUP_DEFS: { title: string; hrefs: string[] }[] = [
  {
    title: 'Study',
    hrefs: [
      '/dashboard',
      '/dashboard/semester',
      '/dashboard/courses',
      '/dashboard/materials',
      '/dashboard/question-papers',
      '/dashboard/important-questions',
      '/dashboard/short-notes',
      '/dashboard/study-planner',
    ],
  },
  {
    title: 'Tools',
    hrefs: ['/sgpa-calculator', '/dashboard/chat', '/dashboard/contribute', '/dashboard/requests'],
  },
  {
    title: 'Your library',
    hrefs: ['/dashboard/bookmarks', '/dashboard/history', '/dashboard/notifications'],
  },
  {
    title: 'Account',
    hrefs: ['/dashboard/profile', '/dashboard/help', '/dashboard/settings'],
  },
];

function groupSections(sections: NavItem[]) {
  const byHref = new Map(sections.map((section) => [section.href, section]));
  const placed = new Set<string>();

  const groups = GROUP_DEFS.map((group) => {
    const items = group.hrefs
      .map((href) => byHref.get(href))
      .filter((item): item is NavItem => Boolean(item));
    items.forEach((item) => placed.add(item.href));
    return { title: group.title, items };
  }).filter((group) => group.items.length > 0);

  // Safety net: no section may vanish because someone forgot to file it.
  const orphans = sections.filter((section) => !placed.has(section.href));
  if (orphans.length > 0) {
    if (groups.length > 0) {
      groups[groups.length - 1] = {
        title: groups[groups.length - 1].title,
        items: [...groups[groups.length - 1].items, ...orphans],
      };
    } else {
      groups.push({ title: 'More', items: orphans });
    }
  }

  return groups;
}

/**
 * The desktop "menubar": one control in the burgundy header that opens every
 * section at once, grouped and searchable, plus a ⌘K / Ctrl K shortcut.
 *
 * It exists because the pill strip can only carry a handful of tabs — the
 * others (Group Chat, Saved Materials, Recently Viewed…) had no desktop entry
 * point at all, and the strip itself scrolled sideways behind a hidden
 * scrollbar. Rendering is desktop-only (`hidden lg:block`), so phones keep the
 * menu sheet and bottom bar exactly as they are.
 */
export function DesktopNav({ sections, unreadNotifications }: DesktopNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [shortcutLabel, setShortcutLabel] = useState('');

  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const groups = useMemo(() => groupSections(sections), [sections]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (!trimmed) return [];
    const needle = trimmed.toLowerCase();
    return flat.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) || item.href.toLowerCase().includes(needle)
    );
  }, [flat, trimmed]);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Platform-correct hint, resolved after mount so the server and client
  // markup agree.
  useEffect(() => {
    const platform = `${navigator.platform || ''} ${navigator.userAgent || ''}`;
    setShortcutLabel(/mac|iphone|ipad|ipod/i.test(platform) ? '⌘K' : 'Ctrl K');
  }, []);

  // ⌘K / Ctrl K from anywhere in the app.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Closing by any route (Esc, outside click, ⌘K, navigation) forgets the query.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Open → put the caret in the search field.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  // Escape closes and hands focus back to the trigger; clicking anywhere else
  // closes too, except inside the panel.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      if (target && triggerRef.current?.contains(target)) return; // the trigger toggles itself
      close();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  // The panel hangs off the header, which scrolls away with the page; close it
  // rather than leave it open off-screen.
  useEffect(() => {
    if (!open) return;
    function onScroll() {
      close();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open, close]);

  // Navigating anywhere closes the menu.
  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [pathname]);

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const first = results[0];
    if (first) {
      router.push(first.href);
    } else if (trimmed) {
      // No section matches — treat the query as a materials search.
      router.push(`/dashboard/materials?q=${encodeURIComponent(trimmed)}`);
    } else {
      return;
    }
    close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-controls="desktop-nav-panel"
        aria-label="Open all sections"
        className="hidden h-10 cursor-pointer items-center gap-2 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none lg:inline-flex"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span>Menu</span>
        <kbd className="ml-0.5 hidden items-center rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[10px] font-semibold tracking-tight text-white/75 xl:inline-flex">
          {shortcutLabel || '⌘K'}
        </kbd>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="desktop-nav-panel"
          className="absolute inset-x-0 top-full z-50 hidden lg:block"
        >
          <div className="mx-auto max-w-7xl px-10 xl:max-w-[1440px]">
            <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-canvas shadow-[0_24px_60px_-24px_rgba(36,7,7,0.45)]">
              {/* Search */}
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Jump to a section, or type a topic to search materials…"
                  aria-label="Search sections"
                  className="h-8 w-full bg-transparent text-sm text-charcoal outline-none placeholder:text-muted/80"
                />
                {trimmed && results.length > 0 ? (
                  <span className="hidden shrink-0 items-center gap-1 text-[11px] font-medium text-muted xl:inline-flex">
                    <CornerDownLeft className="h-3 w-3" /> opens the first match
                  </span>
                ) : null}
                <kbd className="shrink-0 rounded-md border border-line bg-neutral-soft px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted">
                  Esc
                </kbd>
              </div>

              {trimmed ? (
                <div className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
                  {results.length > 0 ? (
                    <ul className="space-y-0.5">
                      {results.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => close()}
                              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-charcoal/85 transition-colors hover:bg-neutral-soft hover:text-charcoal"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                              <span className="truncate">{item.label}</span>
                              {isActive(item) ? (
                                <span className="ml-auto shrink-0 rounded-full bg-burgundy-tint px-2 py-0.5 text-[10px] font-bold text-burgundy">
                                  Here
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="px-3 py-4 text-center text-[13px] text-muted">
                      Nothing in the menu matches &ldquo;{trimmed}&rdquo;.
                    </p>
                  )}

                  <Link
                    href={`/dashboard/materials?q=${encodeURIComponent(trimmed)}`}
                    onClick={() => close()}
                    className="mt-1 flex items-center gap-2.5 rounded-xl border border-dashed border-burgundy-border px-3 py-2.5 text-[13px] font-semibold text-burgundy transition-colors hover:bg-burgundy-tint"
                  >
                    <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Search materials for &ldquo;{trimmed}&rdquo;</span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-x-6 gap-y-5 p-4 xl:grid-cols-4">
                  {groups.map((group) => (
                    <div key={group.title} className="min-w-0">
                      <p className="px-2 pb-1.5 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
                        {group.title}
                      </p>
                      <ul className="space-y-0.5">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item);
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={() => close()}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-xl px-2 py-2 text-[13px] font-medium transition-colors',
                                  active
                                    ? 'bg-burgundy-tint font-semibold text-burgundy'
                                    : 'text-charcoal/80 hover:bg-neutral-soft hover:text-charcoal'
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="truncate">{item.label}</span>
                                {item.href === '/dashboard/notifications' &&
                                unreadNotifications > 0 ? (
                                  <span className="ml-auto shrink-0 rounded-full bg-burgundy px-1.5 py-px text-[10px] font-bold text-white">
                                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
