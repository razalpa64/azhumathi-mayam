'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Bookmark,
  ChevronDown,
  Clock,
  Layers,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { Profile } from '@/types/database';
import { cn, getInitials } from '@/lib/utils';

interface StudentShellProps {
  profile: Profile;
  unreadNotifications: number;
  children: React.ReactNode;
}

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Home', exact: true },
  { href: '/dashboard/materials', label: 'Materials' },
  { href: '/dashboard/question-papers', label: 'Question papers' },
  { href: '/dashboard/courses', label: 'Courses' },
];

const ACCOUNT_LINKS = [
  { href: '/dashboard/semester', label: 'My semester', icon: Layers },
  { href: '/dashboard/bookmarks', label: 'Saved', icon: Bookmark },
  { href: '/dashboard/history', label: 'Recently opened', icon: Clock },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function StudentShell({ profile, unreadNotifications, children }: StudentShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const firstName = profile.full_name.split(' ')[0];

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-9">
            <BrandLogo href="/dashboard" size="sm" />
            <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative py-1.5 text-[14px] transition-colors',
                      active
                        ? 'font-semibold text-charcoal after:absolute after:inset-x-0 after:-bottom-[13px] after:h-[2px] after:bg-burgundy'
                        : 'text-charcoal/65 hover:text-charcoal'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard/notifications"
              aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
              className={cn(
                'relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                pathname === '/dashboard/notifications'
                  ? 'bg-burgundy-tint text-burgundy'
                  : 'text-charcoal/70 hover:bg-neutral-soft hover:text-charcoal'
              )}
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
              {unreadNotifications > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 text-[9px] font-bold text-paper">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              ) : null}
            </Link>

            {/* Account menu */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-neutral-soft cursor-pointer"
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy text-[11px] font-bold text-paper">
                    {getInitials(profile.full_name)}
                  </span>
                )}
                <span className="hidden sm:block max-w-[110px] truncate text-[13.5px] font-medium text-charcoal">
                  {firstName}
                </span>
                <ChevronDown
                  className={cn('hidden sm:block h-3.5 w-3.5 text-muted transition-transform', menuOpen && 'rotate-180')}
                />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="animate-rise absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-xl border border-line bg-paper shadow-[0_12px_32px_-12px_rgba(33,26,22,0.25)]"
                >
                  <div className="px-4 py-3.5">
                    <p className="truncate text-sm font-semibold text-charcoal">{profile.full_name}</p>
                    <p className="truncate text-xs text-muted">
                      {profile.programme
                        ? `${profile.programme.name}${profile.semester ? ` · ${profile.semester.label}` : ''}`
                        : `@${profile.username}`}
                    </p>
                  </div>
                  <div className="border-t border-line py-1.5">
                    {ACCOUNT_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          className="flex items-center gap-2.5 px-4 py-2 text-[13.5px] text-charcoal/85 hover:bg-neutral-soft hover:text-charcoal"
                        >
                          <Icon className="h-4 w-4 text-muted" strokeWidth={1.8} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="border-t border-line py-1.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13.5px] text-charcoal/85 hover:bg-neutral-soft cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4 text-muted" strokeWidth={1.8} />
                      {loggingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-full text-charcoal hover:bg-neutral-soft cursor-pointer"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="border-b border-line" />

        {/* Mobile menu — one quiet list, no boxes */}
        {mobileOpen ? (
          <div className="md:hidden border-b border-line bg-canvas px-4 pb-5 pt-2">
            <nav aria-label="Mobile" className="divide-y divide-line/70">
              {[...PRIMARY_NAV, ...ACCOUNT_LINKS.map((l) => ({ href: l.href, label: l.label }))].map(
                (item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between py-3 text-[15px]',
                      isActive(item.href, (item as { exact?: boolean }).exact)
                        ? 'font-semibold text-burgundy'
                        : 'text-charcoal'
                    )}
                  >
                    {item.label}
                    {item.href === '/dashboard/notifications' ? null : null}
                  </Link>
                )
              )}
              <Link href="/dashboard/notifications" className="flex items-center justify-between py-3 text-[15px] text-charcoal">
                Notifications
                {unreadNotifications > 0 ? (
                  <span className="rounded-full bg-burgundy px-2 py-0.5 text-[10px] font-bold text-paper">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Link>
            </nav>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-4 text-[14px] font-medium text-muted hover:text-charcoal cursor-pointer disabled:opacity-50"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        ) : null}
      </header>

      <main className="animate-rise mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-7 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-malayalam font-semibold text-charcoal">അഴിമതി മയം</span>
            <span className="mx-2 text-line-strong">·</span>
            notes, syllabus &amp; question papers
          </p>
          <nav className="flex items-center gap-5">
            <Link href="/dashboard/materials" className="hover:text-charcoal">Materials</Link>
            <Link href="/dashboard/question-papers" className="hover:text-charcoal">Question papers</Link>
            <Link href="/dashboard/bookmarks" className="hover:text-charcoal">Saved</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
