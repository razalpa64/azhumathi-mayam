'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, Download, Loader2 } from 'lucide-react';
import type { Resource } from '@/types/database';
import { cn, formatDate } from '@/lib/utils';

interface ResourceCardProps {
  resource: Resource;
  initialBookmarked?: boolean;
  onBookmarkToggle?: (resourceId: string, bookmarked: boolean) => void;
}

export function ResourceCard({
  resource,
  initialBookmarked = false,
  onBookmarkToggle,
}: ResourceCardProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarking, setBookmarking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(resource.download_count || 0);
  const [downloadHint, setDownloadHint] = useState<string | null>(null);

  async function handleToggleBookmark() {
    if (bookmarking) return;
    setBookmarking(true);
    try {
      const res = await fetch('/api/student/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ resourceId: resource.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(Boolean(data.bookmarked));
        onBookmarkToggle?.(resource.id, Boolean(data.bookmarked));
      }
    } finally {
      setBookmarking(false);
    }
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setDownloadHint(null);
    try {
      const res = await fetch(`/api/resources/${resource.id}/download`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.downloadUrl) {
        if (typeof data.downloadCount === 'number') {
          setDownloadCount(data.downloadCount);
        }
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
        setDownloadHint('Opened in Google Drive — the download should start there.');
      } else {
        setDownloadHint(data.error || 'Couldn’t start the download. Try opening the file first.');
      }
    } catch {
      setDownloadHint('Network hiccup — please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const meta = [
    resource.programme?.name,
    resource.semester?.label,
    resource.file_type,
    resource.file_size,
  ].filter(Boolean) as string[];

  return (
    <article className="group flex h-full flex-col rounded-xl border border-line bg-paper p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_28px_-16px_rgba(33,26,22,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[13px]">
          {resource.subject ? (
            <>
              <span className="font-mono font-semibold text-burgundy">
                {resource.subject.subject_code}
              </span>
              <span className="text-charcoal/75"> · {resource.subject.name}</span>
            </>
          ) : resource.category ? (
            <span className="text-charcoal/75">{resource.category.name}</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={handleToggleBookmark}
          disabled={bookmarking}
          aria-label={bookmarked ? 'Remove from saved' : 'Save for later'}
          aria-pressed={bookmarked}
          title={bookmarked ? 'Saved' : 'Save for later'}
          className={cn(
            '-mr-1.5 -mt-1.5 shrink-0 rounded-full p-2 transition-colors cursor-pointer disabled:opacity-50',
            bookmarked
              ? 'text-burgundy'
              : 'text-charcoal/35 hover:bg-neutral-soft hover:text-charcoal'
          )}
        >
          <Bookmark className={cn('h-[18px] w-[18px]', bookmarked && 'fill-burgundy')} strokeWidth={1.8} />
        </button>
      </div>

      <Link href={`/resources/${resource.id}`} className="mt-1.5 block">
        <h3 className="text-[15px] font-semibold leading-snug text-charcoal group-hover:text-burgundy transition-colors">
          {resource.title}
        </h3>
      </Link>

      {resource.description ? (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
          {resource.description}
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        <p className="truncate text-xs text-muted">
          {meta.join(' · ')}
          {meta.length > 0 ? ' · ' : ''}
          {formatDate(resource.created_at)}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3.5">
          <Link
            href={`/resources/${resource.id}`}
            className="text-[13.5px] font-semibold text-burgundy hover:underline underline-offset-4"
          >
            {resource.file_type === 'PDF' ? 'Read PDF →' : 'Open →'}
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-charcoal/70 transition-colors hover:text-charcoal cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" strokeWidth={1.8} />
            )}
            <span>Download</span>
            <span className="font-mono text-[11px] text-muted">{downloadCount}</span>
          </button>
        </div>

        {downloadHint ? (
          <p className="mt-2.5 text-xs leading-snug text-muted">{downloadHint}</p>
        ) : null}
      </div>
    </article>
  );
}
