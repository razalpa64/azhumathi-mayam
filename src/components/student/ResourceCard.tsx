'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  BookmarkCheck,
  Calendar,
  Download,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Resource } from '@/types/database';
import { cn, formatDate } from '@/lib/utils';

interface ResourceCardProps {
  resource: Resource;
  initialBookmarked?: boolean;
  onBookmarkToggle?: (resourceId: string, bookmarked: boolean) => void;
  /** Position in a grid — only used to stagger the entrance animation. */
  index?: number;
}

export function ResourceCard({
  resource,
  initialBookmarked = false,
  onBookmarkToggle,
  index = 0,
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
        setDownloadHint(
          'Opened in Google Drive — your download should start there.'
        );
      } else {
        setDownloadHint(data.error || 'Couldn’t start the download. Try opening the file first.');
      }
    } catch {
      setDownloadHint('Network hiccup — please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="anim-rise group flex flex-col justify-between rounded-[22px] border border-line bg-canvas p-5 transition-colors hover:border-burgundy-border"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {resource.category ? (
              <Badge variant={resource.category.is_question_paper ? 'burgundy' : 'neutral'}>
                {resource.category.name}
              </Badge>
            ) : null}
            <span className="inline-flex items-center rounded border border-line bg-neutral-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-charcoal">
              {resource.file_type}
            </span>
            {resource.file_size ? (
              <span className="font-mono text-[11px] text-muted">{resource.file_size}</span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleToggleBookmark}
            disabled={bookmarking}
            aria-label={bookmarked ? 'Remove from saved materials' : 'Save material'}
            title={bookmarked ? 'Saved in Bookmarks' : 'Save to Bookmarks'}
            className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer',
              bookmarked
                ? 'border-burgundy-border bg-burgundy-tint text-burgundy'
                : 'border-line bg-canvas text-muted hover:bg-neutral-soft hover:text-charcoal'
            )}
          >
            {bookmarked ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>

        <Link
          href={`/resources/${resource.id}`}
          className="mt-3 block focus:outline-none focus-visible:underline"
        >
          <h3 className="text-base font-bold text-charcoal group-hover:text-burgundy transition-colors leading-snug">
            {resource.title}
          </h3>
        </Link>

        {resource.subject ? (
          <p className="mt-1.5 text-xs font-medium text-charcoal/85">
            <span className="font-mono font-semibold text-burgundy">
              {resource.subject.subject_code}
            </span>{' '}
            — {resource.subject.name}
          </p>
        ) : null}

        {resource.description ? (
          <p className="mt-2 line-clamp-2 text-xs text-muted leading-relaxed">
            {resource.description}
          </p>
        ) : null}
      </div>

      <div className="mt-4 pt-3.5 border-t border-line space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <div className="flex flex-wrap items-center gap-1.5">
            {resource.programme ? (
              <span className="font-medium text-charcoal">{resource.programme.name}</span>
            ) : null}
            {resource.specialization ? (
              <>
                <span>•</span>
                <span>{resource.specialization.code}</span>
              </>
            ) : null}
            {resource.semester ? (
              <>
                <span>•</span>
                <span>{resource.semester.label}</span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span className="inline-flex items-center gap-1" title="Upload date">
              <Calendar className="h-3 w-3" />
              {formatDate(resource.created_at)}
            </span>
            <span className="inline-flex items-center gap-1" title="Downloads">
              <Download className="h-3 w-3" />
              {downloadCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/resources/${resource.id}`}
            className="inline-flex flex-1 h-9 items-center justify-center gap-1.5 rounded-full bg-burgundy px-3 text-xs font-semibold text-canvas hover:bg-burgundy-dark transition-colors"
          >
            {resource.file_type === 'PDF' ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Open PDF</span>
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" />
                <span>Open</span>
              </>
            )}
          </Link>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-line-strong bg-canvas px-3.5 text-xs font-semibold text-charcoal hover:bg-neutral-soft transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Download</span>
          </button>
        </div>

        {downloadHint ? (
          <p className="text-[11px] text-muted leading-snug">{downloadHint}</p>
        ) : null}
      </div>
    </article>
  );
}
