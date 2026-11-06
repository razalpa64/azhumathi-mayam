'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, FileText, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestSubject {
  id: string;
  subject_code: string;
  name: string;
  programme_id: string;
  semester_id: string;
  programme?: { name: string } | null;
  semester?: { label: string } | null;
}

interface SuggestResource {
  id: string;
  title: string;
  file_type: string;
  subject?: { subject_code: string; name: string } | null;
  category?: { name: string } | null;
}

const RECENT_KEY = 'azm_recent_searches_v1';

interface GlobalSearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
}

export function GlobalSearchBar({
  initialQuery = '',
  placeholder = 'Search notes, subjects, question papers…',
  className,
}: GlobalSearchBarProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<SuggestSubject[]>([]);
  const [resources, setResources] = useState<SuggestResource[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
      if (Array.isArray(saved)) setRecentSearches(saved.slice(0, 6));
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSubjects([]);
      setResources([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/resources?mode=suggest&q=${encodeURIComponent(trimmed)}`,
          { credentials: 'same-origin' }
        );
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.subjects || []);
          setResources(data.resources || []);
        }
      } catch {
        // Ignore transient network errors
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  function saveRecent(term: string) {
    const clean = term.trim();
    if (!clean) return;
    const next = [clean, ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }

  function clearRecent() {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      // Ignore
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) {
      router.push('/dashboard/materials');
      return;
    }
    saveRecent(clean);
    setFocused(false);
    router.push(`/dashboard/materials?q=${encodeURIComponent(clean)}`);
  }

  const showDropdown =
    focused &&
    (query.trim().length >= 2 || recentSearches.length > 0);

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} role="search" className="relative flex items-center">
        <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted" />
        <input
          type="search"
          value={query}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFocused(false);
          }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search notes, subjects and question papers"
          className="h-12.5 w-full rounded-full border border-line-strong bg-paper pl-11 pr-24 text-[14.5px] text-charcoal shadow-[0_1px_2px_rgba(33,26,22,0.05)] placeholder:text-muted/75 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search query"
            className="absolute right-24 rounded p-1 text-muted hover:bg-neutral-soft hover:text-charcoal cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="submit"
          className="absolute right-1.5 inline-flex h-9.5 items-center gap-1.5 rounded-full bg-burgundy px-4 text-[13px] font-semibold text-paper hover:bg-burgundy-dark transition-colors cursor-pointer"
        >
          <span>Search</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {showDropdown ? (
        <div className="animate-rise absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-line bg-paper shadow-[0_16px_40px_-16px_rgba(33,26,22,0.3)]">
          {query.trim().length < 2 && recentSearches.length > 0 ? (
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-xs font-semibold text-muted">Recent</span>
                <button
                  type="button"
                  onClick={clearRecent}
                  className="text-[11px] font-medium text-muted hover:text-burgundy cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-0.5">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      saveRecent(term);
                      setFocused(false);
                      router.push(`/dashboard/materials?q=${encodeURIComponent(term)}`);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs text-charcoal hover:bg-neutral-soft cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {query.trim().length >= 2 ? (
            <div className="divide-y divide-line">
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-4 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-burgundy" />
                  <span>Searching…</span>
                </div>
              ) : subjects.length === 0 && resources.length === 0 ? (
                <div className="px-4 py-4 text-xs text-muted">
                  Nothing found for <span className="font-semibold text-charcoal">&ldquo;{query.trim()}&rdquo;</span>. Try Enter for a full search.
                </div>
              ) : (
                <>
                  {subjects.length > 0 ? (
                    <div className="p-2.5">
                      <p className="px-2 pb-1.5 text-xs font-semibold text-muted">Subjects</p>
                      {subjects.map((subj) => (
                        <Link
                          key={subj.id}
                          href={`/dashboard/materials?subjectId=${subj.id}`}
                          onClick={() => {
                            saveRecent(subj.subject_code);
                            setFocused(false);
                          }}
                          className="flex items-center justify-between rounded-md px-2.5 py-2 text-xs hover:bg-neutral-soft"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-burgundy" />
                            <span className="font-mono font-semibold text-burgundy">
                              {subj.subject_code}
                            </span>
                            <span className="truncate font-medium text-charcoal">{subj.name}</span>
                          </div>
                          <span className="ml-2 shrink-0 text-[11px] text-muted">
                            {subj.programme?.name || ''} {subj.semester?.label ? `• ${subj.semester.label}` : ''}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  {resources.length > 0 ? (
                    <div className="p-2.5">
                      <p className="px-2 pb-1.5 text-xs font-semibold text-muted">Materials</p>
                      {resources.map((res) => (
                        <Link
                          key={res.id}
                          href={`/resources/${res.id}`}
                          onClick={() => {
                            saveRecent(res.title);
                            setFocused(false);
                          }}
                          className="flex items-center justify-between rounded-md px-2.5 py-2 text-xs hover:bg-neutral-soft"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
                            <span className="truncate font-medium text-charcoal">{res.title}</span>
                          </div>
                          <span className="ml-2 shrink-0 rounded border border-line bg-neutral-soft px-1.5 py-0.5 font-mono text-[10px] text-muted">
                            {res.file_type}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
