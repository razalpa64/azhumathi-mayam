'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Bookmark,
  BookOpen,
  Clock,
  FileQuestion,
  GraduationCap,
  Home,
  Inbox,
  Layers,
  LifeBuoy,
  LogOut,
  Menu,
  MessagesSquare,
  NotebookPen,
  Settings,
  User,
  X,
} from 'lucide-react';
import type { Profile } from '@/types/database';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { InstallPromptCard } from '@/components/pwa/InstallPromptCard';
import { cn, getInitials } from '@/lib/utils';

interface StudentShellProps {
  profile: Profile;
  unreadNotifications: number;
  children: React.ReactNode;
}

/** Everywhere a student can go — used by the mobile menu sheet. */
const ALL_SECTIONS = [
  { href: '/dashboard', label: 'Overview', icon: Home, exact: true },
  { href: '/dashboard/semester', label: 'My Semester', icon: Layers },
  { href: '/dashboard/courses', label: 'My Courses', icon: GraduationCap },
  { href: '/dashboard/materials', label: 'Study Materials', icon: BookOpen },
  { href: '/dashboard/question-papers', label: 'Question Papers', icon: FileQuestion },
  { href: '/dashboard/short-notes', label: 'Short Notes & Exam Special', icon: NotebookPen },
  { href: '/dashboard/chat', label: 'Group Chat', icon: MessagesSquare },
  { href: '/dashboard/requests', label: 'Requests', icon: Inbox },
  { href: '/dashboard/bookmarks', label: 'Saved Materials', icon: Bookmark },
  { href: '/dashboard/history', label: 'Recently Viewed', icon: Clock },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/help', label: 'Help & Contact', icon: LifeBuoy },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

/**
 * The pill strip keeps the everyday study destinations. Everything else
 * (Group Chat, Saved, History, Help...) lives one tap away in the bottom
 * nav or the menu sheet, so the strip stays short and quiet.
 */
const STRIP_TABS = [
  { href: '/dashboard', label: 'Overview', icon: Home, exact: true },
  { href: '/dashboard/semester', label: 'My Semester', icon: Layers },
  { href: '/dashboard/courses', label: 'My Courses', icon: GraduationCap },
  { href: '/dashboard/materials', label: 'Study Materials', icon: BookOpen },
  { href: '/dashboard/question-papers', label: 'Question Papers', icon: FileQuestion },
  { href: '/dashboard/short-notes', label: 'Short Notes', icon: NotebookPen },
  { href: '/dashboard/requests', label: 'Requests', icon: Inbox },
];

/**
 * Five slots, all equal. Requests stays in the pill strip, the dashboard
 * banner and the menu sheet.
 */
const BOTTOM_NAV = [
  { href: '/dashboard', label: 'Home', icon: Home, exact: true },
  { href: '/dashboard/materials', label: 'Materials', icon: BookOpen },
  { href: '/dashboard/chat', label: 'Chat', icon: MessagesSquare },
  { href: '/dashboard/short-notes', label: 'Short Notes', icon: NotebookPen },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export function StudentShell({
  profile,
  unreadNotifications,
  children,
}: StudentShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  const contextLine = [
    profile.university?.short_name,
    profile.programme?.name,
    profile.specialization?.code,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="desktop-ambient min-h-screen flex flex-col bg-canvas">
      {/* Burgundy wave header — scrolls away with the page, only the tab strip sticks */}
      <div className="relative bg-gradient-to-br from-burgundy-logo via-burgundy-dark to-burgundy-deep text-canvas">
        <div className="mx-auto max-w-7xl xl:max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-3 pb-10 pt-3.5 sm:pb-11 sm:pt-4 lg:pb-10 lg:pt-4">
            {/* Brand */}
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-burgundy-logo ring-1 ring-white/25 sm:h-11 sm:w-11 lg:h-11 lg:w-11 lg:rounded-xl">
                <Image
                  src="/brand/logo.png"
                  alt="അഴിമതി മയം"
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                  priority
                />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-logo text-xl font-bold tracking-tight text-white sm:text-[22px] lg:text-[22px]">
                  അഴിമതി മയം
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium tracking-wide text-white/60 lg:text-xs">
                  {contextLine || 'Notes, syllabus & question papers'}
                </span>
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              {/* Notifications */}
              <Link
                href="/dashboard/notifications"
                aria-label="Notifications"
                className={cn(
                  'relative inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 transition-colors lg:h-10 lg:w-10',
                  pathname === '/dashboard/notifications'
                    ? 'bg-white text-burgundy ring-white'
                    : 'bg-white/10 text-white ring-white/20 hover:bg-white/20'
                )}
              >
                <Bell className="h-[18px] w-[18px]" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[10px] font-bold text-white ring-2 ring-burgundy-dark">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                ) : null}
              </Link>

              {/* Profile chip (desktop) */}
              <Link
                href="/dashboard/profile"
                className={cn(
                  'hidden items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-xs font-medium ring-1 transition-colors md:inline-flex lg:py-1.5 lg:pl-1.5 lg:pr-3.5 lg:text-[13px]',
                  pathname === '/dashboard/profile'
                    ? 'bg-white text-burgundy ring-white'
                    : 'bg-white/10 text-white ring-white/20 hover:bg-white/20'
                )}
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-burgundy lg:h-8 lg:w-8 lg:text-[11px]">
                    {getInitials(profile.full_name)}
                  </span>
                )}
                <span className="max-w-[130px] truncate lg:max-w-[180px]">{profile.full_name}</span>
              </Link>

              {/* Logout (desktop) */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Logout"
                title="Logout"
                className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 cursor-pointer disabled:opacity-50 md:inline-flex lg:h-10 lg:w-10"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>

              {/* Mobile menu trigger */}
              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 cursor-pointer lg:hidden"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Wave edge */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[20px] w-full text-canvas sm:h-[26px] lg:h-[34px]"
        >
          <path d="M0 90 L0 52 C 300 84, 860 92, 1440 10 L1440 90 Z" fill="currentColor" />
        </svg>
      </div>

      {/* Sticky pill strip — the one slim bar that stays while scrolling */}
      <div className="sticky top-0 z-40 border-b border-line/70 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl xl:max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <nav
            aria-label="Student workspace sections"
            className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-2 lg:gap-2 lg:py-2"
          >
            {STRIP_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.href, tab.exact);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 lg:gap-2 lg:px-3.5 lg:py-1.5 lg:text-[13px]',
                    active
                      ? 'bg-burgundy font-semibold text-white'
                      : 'text-charcoal/70 hover:bg-burgundy-tint hover:text-burgundy'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
            {contextLine ? (
              <span className="ml-auto hidden shrink-0 items-center gap-1.5 pl-4 text-xs font-medium text-muted lg:inline-flex">
                <GraduationCap className="h-3.5 w-3.5 text-burgundy/70" />
                {contextLine}
                {profile.semester ? ` · ${profile.semester.label}` : ''}
              </span>
            ) : null}
          </nav>
        </div>

        {/* Mobile menu sheet — the full list of sections, one place */}
        {mobileOpen ? (
          <div className="space-y-4 border-t border-line bg-canvas px-4 pb-5 pt-4 lg:hidden">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-burgundy-tint px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">{profile.full_name}</p>
                <p className="text-xs text-muted">@{profile.username}</p>
              </div>
              {profile.programme ? (
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-burgundy ring-1 ring-burgundy-border">
                  {profile.programme.name}
                  {profile.semester ? ` • S${profile.semester.semester_number}` : ''}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ALL_SECTIONS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium',
                      active
                        ? 'border-burgundy bg-burgundy font-semibold text-white'
                        : 'border-line bg-canvas text-charcoal hover:bg-neutral-soft'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.href === '/dashboard/notifications' && unreadNotifications > 0 ? (
                      <span
                        className={cn(
                          'ml-auto rounded-full px-1.5 py-px text-[10px] font-bold',
                          active ? 'bg-white text-burgundy' : 'bg-burgundy text-white'
                        )}
                      >
                        {unreadNotifications}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            <div className="empty:hidden">
              <InstallAppButton className="flex w-full justify-center" />
              <p className="mt-1.5 text-center text-[11px] text-muted">
                Put അഴിമതി മയം on your home screen — opens full-screen, like a real app.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-burgundy py-3 text-[13px] font-semibold text-white hover:bg-burgundy-dark cursor-pointer disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              <span>{loggingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl xl:max-w-[1440px] flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-6">
        <div key={pathname} className="anim-page">
          {children}
        </div>
      </main>

      {/* Floating mobile bottom navigation */}
      <nav aria-label="Bottom" className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 rounded-full border border-line bg-canvas/95 px-2 py-2 shadow-[0_16px_32px_-14px_rgba(36,7,7,0.45)] backdrop-blur-md">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-all active:scale-95',
                  active ? 'text-burgundy' : 'text-muted hover:text-charcoal'
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                <span className={cn('leading-none', active && 'font-bold')}>{item.label}</span>
                <span
                  className={cn(
                    'mt-0.5 h-[3px] w-5 rounded-full bg-burgundy transition-opacity',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="mt-6 border-t border-line bg-neutral-soft/60">
        <div className="mx-auto flex max-w-7xl xl:max-w-[1440px] flex-col items-center justify-between gap-4 px-4 py-7 text-xs text-muted sm:flex-row lg:py-7 lg:text-[13px] sm:px-6 lg:px-10">
          <div className="flex items-center gap-2.5">
            <span className="font-logo text-base font-bold text-burgundy">അഴിമതി മയം</span>
            <span aria-hidden="true">•</span>
            <span>notes, syllabus &amp; question papers</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/dashboard/materials" className="hover:text-charcoal">
              Library
            </Link>
            <Link href="/dashboard/question-papers" className="hover:text-charcoal">
              Question Papers
            </Link>
            <Link href="/dashboard/short-notes" className="hover:text-charcoal">
              Short Notes
            </Link>
            <Link href="/dashboard/requests" className="hover:text-charcoal">
              Requests
            </Link>
            <Link href="/dashboard/help" className="hover:text-charcoal">
              Help
            </Link>
            <Link href="/dashboard/profile" className="hover:text-charcoal">
              Academic Profile
            </Link>
            <Link href="/dashboard/settings" className="hover:text-charcoal">
              Security
            </Link>
            <span className="empty:hidden">
              <InstallAppButton className="h-8 px-3 text-xs shadow-none" />
            </span>
          </div>
        </div>
      </footer>

      {/* Friendly one-time install invitation — Home screen only */}
      {pathname === '/dashboard' ? <InstallPromptCard /> : null}
    </div>
  );
}
