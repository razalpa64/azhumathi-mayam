'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  CalendarRange,
  FilePlus2,
  Flame,
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
  UploadCloud,
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
  pendingSubmissions?: number;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  /** Super-admin territory: sub-admins never see these. */
  mainOnly?: boolean;
  badge?: 'requests' | 'submissions';
}

/**
 * Grouped so the console scans like a desk: daily content work first,
 * the curriculum tables together, people, then system.
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
      { href: '/admin/submissions', label: 'Student Uploads', icon: UploadCloud, badge: 'submissions' },
      { href: '/admin/important-questions', label: 'Important Questions', icon: Flame },
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

export function AdminShell({
  profile,
  pendingRequests = 0,
  pendingSubmissions = 0,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // The bottom bar is permanent (never hides while scrolling); a route
  // change only resets the scroll region to the top so pages don't open
  // mid-scroll.
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [pathname]);

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
    const badgeCount =
      item.badge === 'requests'
        ? pendingRequests
        : item.badge === 'submissions'
          ? pendingSubmissions
          : 0;
    const showBadge = badgeCount > 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={active ? 'page' : undefined}
        title={rail ? item.label : undefined}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]',
          rail && 'justify-center px-0 py-2',
          active
            ? 'bg-white/10 font-semibold text-white shadow-[0_12px_24px_-12px_rgba(0,0,0,0.6)]'
            : 'font-medium text-canvas/90 hover:bg-white/[0.06] hover:text-white'
        )}
      >
        {/* Active marker: a soft-rose bar on the leading edge */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -left-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[#F4B8C1] shadow-[0_0_12px_rgba(244,184,193,0.55)] transition-opacity duration-200',
            active ? 'opacity-100' : 'opacity-0'
          )}
        />
        {/* Icon chip: glassy when idle, solid paper when active */}
        <span
          className={cn(
            'relative flex shrink-0 items-center justify-center rounded-lg transition-all duration-200',
            rail ? 'h-9 w-9' : 'h-8 w-8',
            active
              ? 'bg-white text-burgundy-deep shadow-[0_6px_14px_-6px_rgba(0,0,0,0.55)]'
              : 'bg-white/[0.09] text-canvas/80 ring-1 ring-white/[0.1] group-hover:bg-white/10 group-hover:text-canvas'
          )}
        >
          <Icon
            className={rail ? 'h-[19px] w-[19px]' : 'h-[17px] w-[17px]'}
            strokeWidth={active ? 2.2 : 1.9}
          />
          {rail && showBadge ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E5484D] px-1 text-[9px] font-bold text-white ring-2 ring-burgundy">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          ) : null}
        </span>
        {!rail ? (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {showBadge ? (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#E5484D] px-1.5 text-[10px] font-bold text-white shadow-[0_4px_10px_-4px_rgba(229,72,77,0.9)]">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            ) : null}
          </>
        ) : (
          <span className="sr-only">{item.label}</span>
        )}
      </Link>
    );
  }

  function renderBrand(rail: boolean) {
    if (rail) {
      return (
        <Link
          href="/admin"
          aria-label="Admin overview"
          className="relative block h-10 w-10 overflow-hidden rounded-xl shadow-[0_8px_18px_-8px_rgba(0,0,0,0.7)] ring-1 ring-white/25 transition-transform duration-200 hover:scale-105"
        >
          <Image
            src="/brand/logo.png"
            alt="അഴിമതി മയം"
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        </Link>
      );
    }
    return (
      <Link
        href="/admin"
        className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-[0_8px_18px_-8px_rgba(0,0,0,0.7)] ring-1 ring-white/25">
          <Image
            src="/brand/logo.png"
            alt="അഴിമതി മയം"
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-logo text-[17px] font-bold leading-[1.45] tracking-tight text-white">
            അഴിമതി മയം
          </span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.24em] text-canvas/75">
            Admin Console
          </span>
        </span>
      </Link>
    );
  }

  function renderSidebar(rail: boolean, variant: 'desktop' | 'drawer') {
    return (
      <div className="relative isolate flex h-full min-h-0 flex-col overflow-hidden bg-burgundy text-canvas shadow-[inset_-1px_0_0_rgba(255,255,255,0.07)]">

        {/* Brand row */}
        <div
          className={cn(
            'flex shrink-0 items-center px-5',
            variant === 'drawer' && 'pt-[max(1.25rem,env(safe-area-inset-top))]',
            variant === 'desktop' && 'pt-5',
            rail ? 'flex-col gap-3 px-3' : 'justify-between'
          )}
        >
          {renderBrand(rail)}

          {variant === 'drawer' ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-canvas/90 transition-colors hover:bg-white/10 hover:text-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-canvas/80 transition-all hover:bg-white/[0.07] hover:text-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer"
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

        {/* Grouped navigation — scrolls with softened edges */}
        <nav
          aria-label="Administrator navigation"
          className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-2 [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sections.map((section, si) => (
            <div key={section.label || `top-${si}`} className={si === 0 ? 'mt-2' : 'mt-6'}>
              {section.label ? (
                rail ? (
                  <div aria-hidden="true" className="mx-2.5 mb-2 h-px bg-white/[0.08]" />
                ) : (
                  <div className="mb-1.5 flex items-center gap-2 px-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-canvas/65">
                      {section.label}
                    </span>
                    <span aria-hidden="true" className="h-px flex-1 bg-white/[0.06]" />
                  </div>
                )
              ) : null}
              <div className="space-y-0.5">
                {section.items.map((item) => renderNavLink(item, rail))}
              </div>
            </div>
          ))}
        </nav>

        {/* Account footer: one glass card, always on screen */}
        <div className="relative shrink-0 p-3">
          <div
            aria-hidden="true"
            className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
          />
          {rail ? (
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <Link
                href="/admin/account"
                title={`${profile.full_name} (@${profile.username})`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/25 to-white/5 text-[11px] font-bold text-canvas ring-1 ring-white/20 transition-all hover:from-white/30 hover:to-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {getInitials(profile.full_name)}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Logout"
                aria-label="Logout"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-canvas/90 transition-colors hover:bg-[#C62F34] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.05] p-2 ring-1 ring-white/[0.07] backdrop-blur-sm transition-colors hover:bg-white/[0.07]">
              <Link
                href="/admin/account"
                onClick={() => setMobileOpen(false)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/25 to-white/5 text-[11px] font-bold text-canvas ring-1 ring-white/20">
                  {getInitials(profile.full_name)}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-semibold text-canvas">
                    {profile.full_name}
                  </span>
                  <span className="block truncate text-[11px] text-canvas/80">
                    @{profile.username} · {isMainAdmin ? 'Super Admin' : 'Sub-admin'}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Logout"
                aria-label="Logout"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-canvas/90 transition-all hover:bg-[#C62F34] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    // App shell on phones (same rule as the student shell): fixed-height
    // column, only <main> scrolls, top/bottom bars are in-flow rows — the
    // browser chrome resizing the viewport mid-scroll can't strand them.
    <div className="flex h-dvh overflow-hidden bg-canvas lg:h-auto lg:min-h-dvh lg:overflow-visible">
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
          <div className="anim-drawer relative z-10 h-full w-80 max-w-[86vw] shadow-2xl">
            {renderSidebar(false, 'drawer')}
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile & tablet header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/95 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open administrator navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-canvas text-charcoal transition-all hover:bg-neutral-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/50 active:scale-95 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo href="/admin" size="sm" subtitle="Admin" />
          </div>

          <Link
            href="/admin/upload"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-burgundy px-3.5 text-xs font-semibold text-canvas shadow-[0_8px_16px_-8px_rgba(121,0,0,0.7)] transition-all hover:bg-burgundy-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/50 active:scale-95"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>Upload</span>
          </Link>
        </header>

        <main
          ref={mainRef}
          className="relative isolate mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-canvas p-4 pb-10 sm:p-7 sm:pb-10 lg:overflow-visible lg:p-9 2xl:max-w-[1560px]"
        >
          {/* Keyed by route: each console page rises in gently instead
              of snapping, matching the student shell's page motion. */}
          <div key={pathname} className="anim-page">
            {children}
          </div>
        </main>

      {/* Mobile bottom bar — the daily tools, one thumb away. In-flow
          row of the shell, not position:fixed, so mobile browser chrome
          can never strand it half off-screen. */}
      <nav aria-label="Admin quick navigation" className="flex-none lg:hidden">
        <div className="grid grid-cols-5 border-t border-white/10 bg-[#3d000a]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95',
                  active ? 'bg-white/12 font-semibold text-white' : 'text-canvas/85 hover:text-canvas'
                )}
              >
                <span className="relative">
                  <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} />
                  {item.badge === 'requests' && pendingRequests > 0 ? (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E5484D] px-1 text-[9px] font-bold text-white ring-2 ring-[#3d000a]">
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
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-canvas/85 transition-colors hover:text-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 cursor-pointer"
          >
            <Menu className="h-[21px] w-[21px]" strokeWidth={1.8} />
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </nav>
      </div>


    </div>
  );
}
