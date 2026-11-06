'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  HelpCircle,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ResourceCard } from '@/components/student/ResourceCard';
import { AdSlot } from '@/components/ads/AdSlot';
import type { Advertisement, Resource } from '@/types/database';
import { cn, formatDate } from '@/lib/utils';

interface ResourceViewerClientProps {
  resource: Resource;
  previewUrl: string;
  openUrl: string;
  supportsInlinePdfPreview: boolean;
  initialBookmarked: boolean;
  relatedResources: Resource[];
  isAdminViewer: boolean;
  adsEnabled: boolean;
  requireAdConsent: boolean;
  belowPreviewAd?: Advertisement | null;
}

export function ResourceViewerClient({
  resource,
  previewUrl,
  openUrl,
  supportsInlinePdfPreview,
  initialBookmarked,
  relatedResources,
  isAdminViewer,
  adsEnabled,
  requireAdConsent,
  belowPreviewAd,
}: ResourceViewerClientProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarking, setBookmarking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(resource.download_count || 0);
  const [downloadStatus, setDownloadStatus] = useState<{
    type: 'info' | 'error';
    message: string;
  } | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [forceEmbedNonPdf, setForceEmbedNonPdf] = useState(false);

  const showEmbedViewer = supportsInlinePdfPreview || forceEmbedNonPdf;

  // Record recently viewed for students
  useEffect(() => {
    if (isAdminViewer) return;
    fetch('/api/student/recently-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ resourceId: resource.id }),
    }).catch(() => {
      // Non-critical telemetry
    });
  }, [isAdminViewer, resource.id]);

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
      }
    } finally {
      setBookmarking(false);
    }
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setDownloadStatus(null);
    try {
      const res = await fetch(`/api/resources/${resource.id}/download`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.downloadUrl) {
        setDownloadStatus({
          type: 'error',
          message:
            data.error ||
            'Unable to prepare Google Drive download link. Please try "Open in Google Drive" instead.',
        });
        return;
      }

      if (typeof data.downloadCount === 'number') {
        setDownloadCount(data.downloadCount);
      }

      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      setDownloadStatus({
        type: 'info',
        message:
          'Google Drive download tab opened. For larger files, Google Drive may display a virus-scan confirmation or quota notice — confirm on that tab to save the file, or use "Open in Google Drive".',
      });
    } catch {
      setDownloadStatus({
        type: 'error',
        message: 'Network error while requesting download navigation.',
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isAdminViewer ? '/admin/resources' : '/dashboard/materials'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-charcoal"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{isAdminViewer ? 'Back to Resource Management' : 'Back to Study Materials'}</span>
        </Link>

        {resource.publication_status === 'draft' ? (
          <Badge variant="warning">Draft — Visible Only to Administrator</Badge>
        ) : null}
      </div>

      {/* Document Header Card */}
      <section className="rounded-xl border border-line bg-canvas p-6 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {resource.category ? (
                <Badge variant={resource.category.is_question_paper ? 'burgundy' : 'neutral'}>
                  {resource.category.name}
                </Badge>
              ) : null}
              <span className="rounded border border-line bg-neutral-soft px-2 py-0.5 font-mono text-xs font-semibold text-charcoal">
                {resource.file_type}
              </span>
              {resource.file_size ? (
                <span className="font-mono text-xs text-muted">{resource.file_size}</span>
              ) : null}
              {resource.academic_year ? (
                <Badge variant="muted">{resource.academic_year}</Badge>
              ) : null}
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-charcoal leading-snug">
              {resource.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {resource.subject ? (
                <Link
                  href={
                    isAdminViewer
                      ? `/admin/resources?subjectId=${resource.subject.id}`
                      : `/dashboard/materials?subjectId=${resource.subject.id}`
                  }
                  className="font-medium text-charcoal hover:text-burgundy"
                >
                  <span className="font-mono font-semibold text-burgundy">
                    {resource.subject.subject_code}
                  </span>{' '}
                  — {resource.subject.name}
                </Link>
              ) : null}
              {resource.programme ? (
                <span>
                  • {resource.programme.name}
                  {resource.specialization ? ` (${resource.specialization.code})` : ''}
                </span>
              ) : null}
              {resource.semester ? <span>• {resource.semester.label}</span> : null}
              {resource.university ? <span>• {resource.university.short_name}</span> : null}
            </div>

            {resource.description ? (
              <p className="pt-1 text-sm text-muted leading-relaxed">{resource.description}</p>
            ) : null}
          </div>

          {/* Primary Document Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download</span>
            </Button>

            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line-strong bg-canvas px-4 text-sm font-medium text-charcoal hover:bg-neutral-soft transition-colors"
            >
              <span>Open in Google Drive</span>
              <ExternalLink className="h-4 w-4 text-muted" />
            </a>

            {!isAdminViewer ? (
              <button
                type="button"
                onClick={handleToggleBookmark}
                disabled={bookmarking}
                aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark resource'}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-md border px-3.5 text-xs font-semibold transition-colors cursor-pointer',
                  bookmarked
                    ? 'border-burgundy-border bg-burgundy-tint text-burgundy'
                    : 'border-line-strong bg-canvas text-charcoal hover:bg-neutral-soft'
                )}
              >
                {bookmarked ? (
                  <>
                    <BookmarkCheck className="h-4 w-4" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-4 font-mono">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Uploaded {formatDate(resource.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {downloadCount} download{downloadCount === 1 ? '' : 's'}
            </span>
            {resource.file_name ? <span>File: {resource.file_name}</span> : null}
          </div>

          {resource.keywords && resource.keywords.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {resource.keywords.slice(0, 6).map((kw) => (
                <span
                  key={kw}
                  className="rounded border border-line bg-neutral-soft px-2 py-0.5 text-[11px] text-muted"
                >
                  #{kw}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Download Status / Guidance Notice */}
        {downloadStatus ? (
          <div
            role="status"
            className={cn(
              'flex items-start gap-2.5 rounded-md border px-4 py-3 text-xs leading-relaxed',
              downloadStatus.type === 'error'
                ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                : 'border-line-strong bg-neutral-soft text-charcoal'
            )}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
            <span>{downloadStatus.message}</span>
          </div>
        ) : null}
      </section>

      {/* Document Viewer / Non-PDF Format Card */}
      {showEmbedViewer ? (
        <section
          aria-label="Embedded Google Drive document preview"
          className={cn(
            'overflow-hidden rounded-xl border border-line-strong bg-burgundy-deep text-canvas transition-all',
            expanded ? 'fixed inset-3 z-50 flex flex-col shadow-2xl' : ''
          )}
        >
          {/* Reader Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-burgundy-deep px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-canvas/80" />
              <span className="truncate text-xs font-semibold text-canvas">
                {resource.title}
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-canvas/80">
                {resource.file_type}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIframeLoaded(false);
                  setIframeKey((k) => k + 1);
                }}
                title="Reload document preview"
                className="inline-flex h-8 items-center gap-1.5 rounded border border-white/15 bg-white/5 px-2.5 text-xs font-medium text-canvas hover:bg-white/15 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reload</span>
              </button>

              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded border border-white/15 bg-white/5 px-2.5 text-xs font-medium text-canvas hover:bg-white/15"
              >
                <span>Open in Drive</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex h-8 items-center gap-1.5 rounded bg-burgundy px-3 text-xs font-semibold text-canvas hover:bg-burgundy-dark cursor-pointer"
              >
                {expanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Exit Full View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Full Screen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Embedded Google Drive Preview Frame */}
          <div
            className={cn(
              'relative w-full bg-[#1C1917]',
              expanded ? 'flex-1' : 'h-[68vh] min-h-[500px] sm:h-[76vh]'
            )}
          >
            {!iframeLoaded ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-canvas/75">
                <Loader2 className="h-5 w-5 animate-spin text-canvas" />
                <span>Loading Google Drive PDF viewer...</span>
              </div>
            ) : null}

            <iframe
              key={iframeKey}
              src={previewUrl}
              title={`Preview of ${resource.title}`}
              onLoad={() => setIframeLoaded(true)}
              allow="autoplay; fullscreen"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              className="relative z-10 h-full w-full border-0"
            />
          </div>

          {/* Transparent Fallback Helper Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 bg-burgundy-deep px-4 py-2.5 text-xs text-canvas/75">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 shrink-0 text-canvas/60" />
              <span>
                Having trouble viewing inside the embedded frame (for example due to strict browser
                cookie blocking or a restricted Drive file)?
              </span>
            </div>
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-semibold text-canvas underline hover:text-canvas/80"
            >
              Open document directly in Google Drive →
            </a>
          </div>
        </section>
      ) : (
        /* Non-PDF Format Experience */
        <section className="rounded-xl border border-line bg-neutral-soft/70 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-line-strong bg-canvas text-burgundy">
            <FileArchive className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <Badge variant="neutral">{resource.file_type} Document</Badge>
            <h2 className="mt-2 text-lg font-semibold text-charcoal">{resource.title}</h2>
            <p className="mx-auto max-w-lg text-xs text-muted leading-relaxed">
              This study material is formatted as a <strong>{resource.file_type}</strong> file. You
              can open it directly in Google Drive or download it to view in your preferred office
              or archive application.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-burgundy px-4 text-sm font-semibold text-canvas hover:bg-burgundy-dark"
            >
              <span>Open in Google Drive</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <Button variant="secondary" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download {resource.file_type}</span>
            </Button>
            {resource.file_type !== 'ZIP' ? (
              <Button variant="subtle" onClick={() => setForceEmbedNonPdf(true)}>
                Try Embedded Drive Viewer
              </Button>
            ) : null}
          </div>
        </section>
      )}

      {/* Below-PDF-Preview Ad Slot (Strictly below viewer, never shown to Admin) */}
      {!isAdminViewer ? (
        <AdSlot
          ad={belowPreviewAd}
          adsEnabled={adsEnabled}
          requireConsent={requireAdConsent}
        />
      ) : null}

      {/* Related Study Materials */}
      {relatedResources.length > 0 && !isAdminViewer ? (
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-base font-semibold text-charcoal">Related Study Materials</h2>
            <p className="text-xs text-muted">
              More notes and question papers from the same subject and semester.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {relatedResources.map((rel) => (
              <ResourceCard key={rel.id} resource={rel} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
