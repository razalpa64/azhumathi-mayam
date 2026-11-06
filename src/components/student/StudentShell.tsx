'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  NotebookPen,
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

const TOP_NAV = [
  { href: '/dashboard', label: 'Home', icon: Home, exact: true },
  { href: '/dashboard/materials', label: 'Browse Materials', icon: BookOpen },
  { href: '/dashboard/courses', label: 'Courses', icon: GraduationCap },
  { href: '/dashboard/question-papers', label: 'Question Papers', icon: FileQuestion },
  { href: '/dashboard/short-notes', label: 'Short Notes', icon: NotebookPen },
];

const WORKSPACE_TABS = [
  { href: '/dashboard', label: 'Overview', icon: Home, exact: true },
  { href: '/dashboard/semester', label: 'My Semester', icon: Layers },
  { href: '/dashboard/courses', label: 'My Courses', icon: GraduationCap },
  { href: '/dashboard/materials', label: 'Study Materials', icon: BookOpen },
  { href: '/dashboard/question-papers', label: 'Question Papers', icon: FileQuestion },
  { href: '/dashboard/short-notes', label: 'Short Notes & Exam Special', icon: NotebookPen },
  { href: '/dashboard/requests', label: 'Requests', icon: Inbox },
  { href: '/dashboard/bookmarks', label: 'Saved Materials', icon: Bookmark },
  { href: '/dashboard/history', label: 'Recently Viewed', icon: Clock },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/profile', label: 'My Profile', icon: User },
  { href: '/dashboard/help', label: 'Help & Contact', icon: LifeBuoy },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const BOTTOM_NAV = [
  { href: '/dashboard', label: 'Home', icon: Home, exact: true },
  { href: '/dashboard/materials', label: 'Materials', icon: BookOpen },
  { href: '/dashboard/short-notes', label: 'Short Notes', icon: NotebookPen },
  { href: '/dashboard/requests', label: 'Requests', icon: Inbox },
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

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Primary Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <BrandLogo href="/dashboard" size="sm" />

            <nav aria-label="Primary student navigation" className="hidden md:flex items-center gap-1">
              {TOP_NAV.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-burgundy-tint text-burgundy font-semibold'
                        : 'text-charcoal/80 hover:bg-neutral-soft hover:text-charcoal'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications Link */}
            <Link
              href="/dashboard/notifications"
              aria-label="Notifications"
              className={cn(
                'relative inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
                pathname === '/dashboard/notifications'
                  ? 'border-burgundy-border bg-burgundy-tint text-burgundy'
                  : 'border-line bg-canvas text-charcoal hover:bg-neutral-soft'
              )}
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 text-[10px] font-bold text-canvas">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              ) : null}
            </Link>

            {/* Profile Chip */}
            <Link
              href="/dashboard/profile"
              className={cn(
                'hidden sm:inline-flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                pathname === '/dashboard/profile'
                  ? 'border-burgundy-border bg-burgundy-tint text-burgundy'
                  : 'border-line bg-canvas text-charcoal hover:bg-neutral-soft'
              )}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-6 w-6 rounded-full object-cover border border-line"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-burgundy text-[10px] font-bold text-canvas">
                  {getInitials(profile.full_name)}
                </span>
              )}
              <span className="max-w-[130px] truncate">{profile.full_name}</span>
            </Link>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-canvas px-3 text-xs font-medium text-muted hover:border-line-strong hover:bg-neutral-soft hover:text-charcoal cursor-pointer disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>
            </button>

            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-md border border-line bg-canvas text-charcoal hover:bg-neutral-soft cursor-pointer"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Workspace Secondary Bar (Desktop & Tablet Horizontal Scroll) */}
        <div className="border-t border-line bg-neutral-soft/75">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav
              aria-label="Student workspace sections"
              className="flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar"
            >
              {WORKSPACE_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = isActive(tab.href, tab.exact);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'bg-canvas text-burgundy border border-burgundy-border font-semibold'
                        : 'text-muted hover:text-charcoal hover:bg-canvas/70 border border-transparent'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.href === '/dashboard/notifications' && unreadNotifications > 0 ? (
                      <span className="ml-0.5 rounded bg-burgundy px-1.5 py-0.2 text-[10px] font-semibold text-canvas">
                        {unreadNotifications}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen ? (
          <div className="md:hidden border-t border-line bg-canvas px-4 py-4 space-y-4">
            <div className="flex items-center justify-between rounded-md border border-line bg-neutral-soft px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-charcoal">{profile.full_name}</p>
                <p className="text-xs text-muted font-mono">@{profile.username}</p>
              </div>
              {profile.programme ? (
                <span className="rounded border border-burgundy-border bg-burgundy-tint px-2 py-0.5 text-xs font-medium text-burgundy">
                  {profile.programme.name}
                  {profile.semester ? ` • S${profile.semester.semester_number}` : ''}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {WORKSPACE_TABS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium',
                      active
                        ? 'border-burgundy-border bg-burgundy-tint text-burgundy font-semibold'
                        : 'border-line bg-canvas text-charcoal hover:bg-neutral-soft'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-neutral-soft py-2.5 text-xs font-semibold text-charcoal hover:bg-neutral-inset cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{loggingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        ) : null}
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 pt-7 pb-24 sm:px-6 lg:px-8 lg:pb-7">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Bottom"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                  active ? 'text-burgundy' : 'text-muted hover:text-charcoal'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn(active && 'font-bold')}>{item.label}</span>
                <span
                  className={cn(
                    'h-0.5 w-6 rounded-full bg-burgundy transition-opacity',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Clean Institutional Footer */}
      <footer className="border-t border-line bg-neutral-soft/60 mt-12">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8 text-xs text-muted">
          <div className="flex items-center gap-2.5">
            <span className="font-logo font-bold text-sm text-burgundy">അഴിമതി മയം</span>
            <span>•</span>
            <span>notes, syllabus & question papers</span>
          </div>
          <div className="flex items-center gap-5">
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
          </div>
        </div>
      </footer>
    </div>
  );
}
