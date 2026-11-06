'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Megaphone,
  Menu,
  Scale,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { Profile } from '@/types/database';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  profile: Profile;
  children: React.ReactNode;
}

const ADMIN_GROUPS: { label?: string; items: { href: string; label: string; icon: typeof Users; exact?: boolean }[] }[] = [
  {
    items: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'People',
    items: [{ href: '/admin/students', label: 'Students', icon: Users }],
  },
  {
    label: 'Curriculum',
    items: [
      { href: '/admin/courses', label: 'Courses & universities', icon: GraduationCap },
      { href: '/admin/specializations', label: 'Specializations', icon: GitBranch },
      { href: '/admin/regulations', label: 'Regulations', icon: Scale },
      { href: '/admin/semesters', label: 'Semesters', icon: CalendarRange },
      { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
    ],
  },
  {
    label: 'Library',
    items: [
      { href: '/admin/upload', label: 'Add a resource', icon: FilePlus2 },
      { href: '/admin/resources', label: 'Materials', icon: FolderKanban },
    ],
  },
  {
    label: 'Reach',
    items: [
      { href: '/admin/notices', label: 'Notices', icon: Megaphone },
      { href: '/admin/advertisements', label: 'Sponsors', icon: Sparkles },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/analytics', label: 'Analytics & audit', icon: BarChart3 },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AdminShell({ profile, children }: AdminShellProps) {
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

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-burgundy-deep text-paper">
      <div className="px-4 py-5">
        <div className="flex items-center justify-between px-1">
          <BrandLogo href="/admin" size="sm" theme="dark" subtitle="Admin" />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden rounded-full p-1.5 text-paper/70 hover:bg-white/10 hover:text-paper cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Admin" className="mt-6">
          {ADMIN_GROUPS.map((group, gi) => (
            <div key={group.label || `g${gi}`} className={gi > 0 ? 'mt-6' : ''}>
              {group.label ? (
                <p className="px-3 pb-1.5 text-[11px] font-semibold text-paper/40">{group.label}</p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors',
                          active
                            ? 'bg-paper font-semibold text-burgundy-deep'
                            : 'text-paper/70 hover:bg-white/[0.07] hover:text-paper'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="px-4 pb-5">
        <div className="border-t border-white/10 px-2 pb-3 pt-4">
          <p className="truncate text-[13px] font-semibold">{profile.full_name}</p>
          <p className="truncate font-mono text-[11px] text-paper/50">{profile.username}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-paper/70 transition-colors hover:bg-white/[0.07] hover:text-paper cursor-pointer disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
          <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-canvas">
      <aside className="hidden lg:block lg:w-60 lg:shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/45" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full w-72 max-w-[85vw] overflow-y-auto">{sidebarContent}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal hover:bg-neutral-soft cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo href="/admin" size="sm" subtitle="Admin" />
          </div>
          <Link
            href="/admin/upload"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-burgundy px-3.5 text-[13px] font-semibold text-paper hover:bg-burgundy-dark"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>Add</span>
          </Link>
        </header>

        <main className="animate-rise mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
