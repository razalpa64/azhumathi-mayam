'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
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
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Settings,
  Sparkles,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { Profile } from '@/types/database';
import { cn, getInitials } from '@/lib/utils';

interface AdminShellProps {
  profile: Profile;
  pendingRequests?: number;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  /** Super-admin territory: sub-admins never see these. */
  mainOnly?: boolean;
  badge?: 'requests';
}

/**
 * Grouped so the console scans like a desk: daily content work first,
 * the curriculum tables together, people, then system. Fifteen loose
 * links in one flat list was the old sidebar's core problem.
 */
const NAV_SECTIONS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/upload', label: 'Upload Resources', icon: FilePlus2 },
      { href: '/admin/resources', label: 'Study Materials', icon: FolderKanban },
      { href: '/admin/requests', label: 'Student Requests', icon: Inbox, badge: 'requests' },
      { href: '/admin/notices', label: 'Notices', icon: Megaphone, mainOnly: true },
    ],
  },
  {
    label: 'Curriculum',
    items: [
      { href: '/admin/courses', label: 'Courses & Universities', icon: GraduationCap },
      { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
      { href: '/admin/semesters', label: 'Semesters', icon: CalendarRange },
      { href: '/admin/specializations', label: 'Specializations', icon: GitBranch },
      { href: '/admin/regulations', label: 'Academic Regulations', icon: Scale },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/students', label: 'Students', icon: Users, mainOnly: true },
      { href: '/admin/team', label: 'Sub-admin Team', icon: UserCog, mainOnly: true },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/advertisements', label: 'Advertisements', icon: Sparkles, mainOnly: true },
      { href: '/admin/analytics', label: 'Analytics & Audit', icon: BarChart3, mainOnly: true },
      { href: '/admin/settings', label: 'Settings', icon: Settings, mainOnly: true },
    ],
  },
];

/** One-thumb destinations for phones; everything else is in the drawer. */
const MOBILE_NAV: (Omit<NavItem, 'badge'> & { badge: '' | 'requests' })[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true, badge: '' },
  { href: '/admin/upload', label: 'Upload', icon: FilePlus2, badge: '' },
  { href: '/admin/resources', label: 'Materials', icon: FolderKanban, badge: '' },
  { href: '/admin/requests', label: 'Requests', icon: Inbox, badge: 'requests' },
];

export function AdminShell({ profile, pendingRequests = 0, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Desktop icon rail: gives wide tables (Students, Materials) their
  // room back. Remembered per browser; the drawer never collapses.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem('azm-admin-nav') === 'rail');
    } catch {
      // Private mode etc. — collapsing just won't persist.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('azm-admin-nav', next ? 'rail' : 'full');
      } catch {
        // Non-fatal.
      }
      return next;
    });
  }

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
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.mainOnly || isMainAdmin),
  })).filter((section) => section.items.length > 0);

  function renderNavLink(item: NavItem, rail: boolean) {
    const Icon = item.icon;
    const active = isActive(item.href, item.exact);
    const showBadge = item.badge === 'requests' && pendingRequests > 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={active ? 'page' : undefined}
        title={rail ? item.label : undefined}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.98]',
          rail ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
          active
            ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
            : 'text-canvas/70 hover:bg-white/6 hover:text-white',
          !rail && !active && 'hover:translate-x-0.5'
        )}
      >
        {/* Active marker: a small light bar on the leading edge */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-white transition-all duration-200',
            rail ? '-left-3' : '-left-3',
            active ? 'opacity-100' : 'opacity-0'
          )}
        />
        <span className="relative shrink-0">
          <Icon
            className={cn(rail ? 'h-5 w-5' : 'h-[18px] w-[18px]', !active && 'text-canvas/50 group-hover:text-canvas/80')}
            strokeWidth={active ? 2.2 : 1.9}
          />
          {rail && showBadge ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-canvas px-1 text-[9px] font-bold text-burgundy-deep ring-2 ring-burgundy-deep">
              {pendingRequests > 99 ? '99+' : pendingRequests}
            </span>
          ) : null}
        </span>
        {!rail ? (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {showBadge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-canvas px-1.5 text-[10px] font-bold text-burgundy-deep">
                {pendingRequests > 99 ? '99+' : pendingRequests}
              </span>
            ) : null}
          </>
        ) : (
          <span className="sr-only">{item.label}</span>
        )}
      </Link>
    );
  }

  function renderSidebar(rail: boolean, variant: 'desktop' | 'drawer') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-burgundy-dark via-burgundy-deep to-burgundy-deep text-canvas">
        {/* Brand row */}
        <div
          className={cn(
            'flex shrink-0 items-center pt-5',
            rail ? 'flex-col gap-3 px-3' : 'justify-between px-5'
          )}
        >
          {rail ? (
            <Link
              href="/admin"
              aria-label="Admin overview"
              className="relative block h-10 w-10 overflow-hidden rounded-xl ring-1 ring-white/20 transition-transform hover:scale-105"
            >
              <Image
                src="/brand/logo.png"
                alt="അഴിമതി മയം"
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </Link>
          ) : (
            <BrandLogo href="/admin" size="sm" theme="dark" subtitle="Admin Console" />
          )}

          {variant === 'drawer' ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-canvas/70 transition-colors hover:bg-white/10 hover:text-canvas cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-canvas/60 transition-colors hover:bg-white/10 hover:text-canvas cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Grouped navigation — the scrollable middle */}
        <nav
          aria-label="Administrator navigation"
          className={cn('min-h-0 flex-1 overflow-y-auto pb-4', rail ? 'px-3' : 'px-3')}
        >
          {sections.map((section, si) => (
            <div key={section.label || `top-${si}`} className={si === 0 ? 'mt-4' : 'mt-6'}>
              {section.label ? (
                rail ? (
                  <div aria-hidden="true" className="mx-2 mb-2 h-px bg-white/10" />
                ) : (
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-canvas/40">
                    {section.label}
                  </p>
                )
              ) : null}
              <div className="space-y-0.5">
                {section.items.map((item) => renderNavLink(item, rail))}
              </div>
            </div>
          ))}
        </nav>

        {/* Pinned footer: account + logout, always on screen */}
        <div className="shrink-0 border-t border-white/10 p-3">
          {rail ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/admin/account"
                title={`${profile.full_name} (@${profile.username})`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-canvas ring-1 ring-white/15 transition-colors hover:bg-white/15"
              >
                {getInitials(profile.full_name)}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Logout"
                aria-label="Logout"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-canvas/70 transition-colors hover:bg-white/10 hover:text-canvas cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/admin/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/6"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-canvas ring-1 ring-white/15">
                  {getInitials(profile.full_name)}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-semibold text-canvas">
                    {profile.full_name}
                  </span>
                  <span className="block truncate text-[11px] text-canvas/55">
                    @{profile.username} · {isMainAdmin ? 'Super Admin' : 'Sub-admin'}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-burgundy px-3 text-[13px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] transition-all hover:bg-burgundy-dark active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Desktop sidebar (full or icon rail) */}
      <aside
        className={cn(
          'hidden shrink-0 transition-[width] duration-300 ease-out lg:block',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64'
        )}
      >
        <div className="sticky top-0 h-dvh">{renderSidebar(collapsed, 'desktop')}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="anim-fade fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="anim-drawer relative z-10 h-full w-80 max-w-[86vw]">
            {renderSidebar(false, 'drawer')}
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile & tablet header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/95 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open administrator navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-canvas text-charcoal transition-colors hover:bg-neutral-soft active:scale-95 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo href="/admin" size="sm" subtitle="Admin" />
          </div>

          <Link
            href="/admin/upload"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-burgundy px-3.5 text-xs font-semibold text-canvas shadow-[0_8px_16px_-8px_rgba(121,0,0,0.7)] transition-all hover:bg-burgundy-dark active:scale-95"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>Upload</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-28 sm:p-7 sm:pb-28 lg:p-9 2xl:max-w-[1560px]">
          {/* Keyed by route: each console page rises in gently instead
              of snapping, matching the student shell's page motion. */}
          <div key={pathname} className="anim-page">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom bar — the daily tools, one thumb away */}
      <nav aria-label="Admin quick navigation" className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="grid grid-cols-5 border-t border-white/10 bg-burgundy-deep/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-all active:scale-95',
                  active ? 'bg-white/12 font-semibold text-white' : 'text-canvas/60 hover:text-canvas'
                )}
              >
                <span className="relative">
                  <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} />
                  {item.badge === 'requests' && pendingRequests > 0 ? (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-canvas px-1 text-[9px] font-bold text-burgundy-deep">
                      {pendingRequests > 99 ? '99+' : pendingRequests}
                    </span>
                  ) : null}
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open full administrator menu"
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-canvas/60 transition-colors hover:text-canvas active:scale-95 cursor-pointer"
          >
            <Menu className="h-[21px] w-[21px]" strokeWidth={1.8} />
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
