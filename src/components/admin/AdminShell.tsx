'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarRange,
  FilePlus2,
  FolderKanban,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Inbox,
  Megaphone,
  Menu,
  Scale,
  Settings,
  Sparkles,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { Profile } from '@/types/database';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  profile: Profile;
  pendingRequests?: number;
  children: React.ReactNode;
}

/** mainOnly items are super-admin territory: sub-admins never see them. */
const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/students', label: 'Students', icon: Users, mainOnly: true },
  { href: '/admin/team', label: 'Sub-admin Team', icon: UserCog, mainOnly: true },
  { href: '/admin/courses', label: 'Courses & Universities', icon: GraduationCap },
  { href: '/admin/specializations', label: 'Specializations', icon: GitBranch },
  { href: '/admin/regulations', label: 'Academic Regulations', icon: Scale },
  { href: '/admin/semesters', label: 'Semesters', icon: CalendarRange },
  { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/admin/resources', label: 'Study Materials', icon: FolderKanban },
  { href: '/admin/upload', label: 'Upload Resources', icon: FilePlus2 },
  { href: '/admin/notices', label: 'Notices', icon: Megaphone, mainOnly: true },
  { href: '/admin/requests', label: 'Student Requests', icon: Inbox, badge: 'requests' },
  { href: '/admin/advertisements', label: 'Advertisements', icon: Sparkles, mainOnly: true },
  { href: '/admin/analytics', label: 'Analytics & Audit', icon: BarChart3, mainOnly: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, mainOnly: true },
];

/** One-thumb destinations for phones; everything else is in the drawer. */
const MOBILE_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true, badge: '' },
  { href: '/admin/upload', label: 'Upload', icon: FilePlus2, exact: false, badge: '' },
  { href: '/admin/resources', label: 'Materials', icon: FolderKanban, exact: false, badge: '' },
  { href: '/admin/requests', label: 'Requests', icon: Inbox, exact: false, badge: 'requests' },
];

export function AdminShell({ profile, pendingRequests = 0, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  const isMainAdmin = profile.role === 'admin';
  const navItems = ADMIN_NAV.filter((item) => !item.mainOnly || isMainAdmin);

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col bg-burgundy-deep text-canvas">
      {/* Scrollable top: logo + nav. The footer below stays pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <BrandLogo href="/admin" size="sm" theme="dark" subtitle="Admin Console" />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden rounded p-1.5 text-canvas/70 hover:bg-white/10 hover:text-canvas cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Administrator navigation" className="mt-7 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'bg-burgundy text-canvas font-semibold ring-1 ring-white/15'
                    : 'text-canvas/75 hover:bg-white/8 hover:text-canvas'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && item.badge === 'requests' && pendingRequests > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-canvas px-1.5 text-[10px] font-bold text-burgundy-deep">
                    {pendingRequests > 99 ? '99+' : pendingRequests}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pinned footer — profile + logout are always on screen */}
      <div className="shrink-0 space-y-3 border-t border-white/10 bg-burgundy-deep p-4">
        <Link
          href="/admin/account"
          onClick={() => setMobileOpen(false)}
          className="block rounded-md bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-canvas/65" />
            <span className="text-xs font-semibold text-canvas truncate">
              {profile.full_name}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-canvas/65 truncate">
            @{profile.username}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-canvas/50">
            {isMainAdmin ? 'Super Administrator' : 'Sub Administrator'} · My account
          </p>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-burgundy px-3 text-[13px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] transition-colors hover:bg-burgundy-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 border-r border-white/10">
        <div className="sticky top-0 h-dvh">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-72 max-w-[85vw]">
            {sidebarContent}
          </div>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile & Tablet Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas px-4 sm:px-6 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open administrator navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-canvas text-charcoal hover:bg-neutral-soft cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <BrandLogo href="/admin" size="sm" subtitle="Admin" />
          </div>

          <Link
            href="/admin/upload"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-burgundy px-3 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>Upload</span>
          </Link>
        </header>

        <main className="flex-1 p-5 pb-24 sm:p-7 sm:pb-24 lg:p-9 max-w-7xl w-full mx-auto 2xl:max-w-[1560px]">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation — the daily tools, one thumb away */}
      <nav aria-label="Admin quick navigation" className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 rounded-full bg-burgundy-deep/95 px-2 py-2 shadow-[0_16px_32px_-14px_rgba(36,7,7,0.55)] ring-1 ring-white/15 backdrop-blur-md">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-colors',
                  active ? 'bg-burgundy text-white' : 'text-canvas/65 hover:text-canvas'
                )}
              >
                <Icon className="h-[20px] w-[20px]" strokeWidth={active ? 2.2 : 1.8} />
                <span className="leading-none">{item.label}</span>
                {item.badge === 'requests' && pendingRequests > 0 ? (
                  <span className="absolute right-2 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-canvas px-1 text-[9px] font-bold text-burgundy-deep">
                    {pendingRequests > 99 ? '99+' : pendingRequests}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open full administrator menu"
            className="flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium text-canvas/65 transition-colors hover:text-canvas cursor-pointer"
          >
            <Menu className="h-[20px] w-[20px]" strokeWidth={1.8} />
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
