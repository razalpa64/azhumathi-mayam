'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  Loader2,
  Maximize2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ResourceCard } from '@/components/student/ResourceCard';
import { ShareMenu } from '@/components/student/ShareMenu';
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

interface WakeLockSentinelLike {
  release: () => Promise<void>;
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

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [slowLoad, setSlowLoad] = useState(false);
  const [forceEmbedNonPdf, setForceEmbedNonPdf] = useState(false);

  // Immersive reading: real Fullscreen API where available (Android/desktop),
  // a viewport-fixed "focus mode" where it isn't (notably iPhone Safari).
  const stageRef = useRef<HTMLElement | null>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const immersive = nativeFullscreen || focusMode;
  const [chromeIdle, setChromeIdle] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const idleTimer = useRef<number | null>(null);

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

  /* ---------------- immersive plumbing ---------------- */

  useEffect(() => {
    const onChange = () => setNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const pokeChrome = useCallback(() => {
    setChromeIdle(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setChromeIdle(true), 3000);
  }, []);

  useEffect(() => {
    if (!immersive) {
      setChromeIdle(false);
      return;
    }
    pokeChrome();
    setShowHint(true);
    const t = window.setTimeout(() => setShowHint(false), 3600);
    return () => window.clearTimeout(t);
  }, [immersive, pokeChrome]);

  // Focus-mode fallback needs the page behind it frozen
  useEffect(() => {
    if (!focusMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [focusMode]);

  // Keep the screen awake while reading — nobody wants the display
  // dimming halfway through a long answer. Released automatically on exit.
  useEffect(() => {
    if (!immersive) return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        sentinel = await nav.wakeLock!.request('screen');
      } catch {
        // Denied (battery saver, permissions) — reading still works
      }
    };
    const onVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [immersive]);

  const enterImmersive = useCallback(async () => {
    const el = stageRef.current;
    try {
      if (el && document.fullscreenEnabled && typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen();
        return;
      }
      throw new Error('Fullscreen API unavailable');
    } catch {
      setFocusMode(true);
    }
  }, []);

  const exitImmersive = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    setFocusMode(false);
  }, []);

  const toggleImmersive = useCallback(() => {
    if (nativeFullscreen || focusMode) exitImmersive();
    else void enterImmersive();
  }, [nativeFullscreen, focusMode, enterImmersive, exitImmersive]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && focusMode) exitImmersive();
      if (
        (e.key === 'f' || e.key === 'F') &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        showEmbedViewer
      ) {
        toggleImmersive();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusMode, exitImmersive, toggleImmersive, showEmbedViewer]);

  // If the Drive frame takes unusually long, say so and offer a way out
  useEffect(() => {
    setSlowLoad(false);
    if (iframeLoaded) return;
    const t = window.setTimeout(() => setSlowLoad(true), 12000);
    return () => window.clearTimeout(t);
  }, [iframeKey, iframeLoaded]);

  /* ---------------- actions ---------------- */

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
          message: data.error || 'Couldn’t prepare the download. Try “Open in Google Drive” instead.',
        });
        return;
      }
      if (typeof data.downloadCount === 'number') {
        setDownloadCount(data.downloadCount);
      }
      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      setDownloadStatus({
        type: 'info',
        message: 'Opened Google Drive in a new tab. If it asks you to confirm the download, go ahead — or use “Open in Google Drive”.',
      });
    } catch {
      setDownloadStatus({
        type: 'error',
        message: 'Couldn’t reach Google Drive. Check your connection and try again.',
      });
    } finally {
      setDownloading(false);
    }
  }

  function reloadFrame() {
    setIframeLoaded(false);
    setSlowLoad(false);
    setIframeKey((k) => k + 1);
  }

  const glassBtn =
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 cursor-pointer';

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isAdminViewer ? '/admin/resources' : '/dashboard/materials'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-charcoal"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to materials</span>
        </Link>
        {resource.publication_status === 'draft' ? (
          <Badge variant="warning">Draft — only you can see this</Badge>
        ) : null}
      </div>

      {/* Compact title row — reading comes first, details move below */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {resource.category ? (
              <Badge variant={resource.category.is_question_paper ? 'burgundy' : 'neutral'}>
                {resource.category.name}
              </Badge>
            ) : null}
            <span className="rounded-full border border-line bg-neutral-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-charcoal">
              {resource.file_type}
            </span>
            {resource.file_size ? (
              <span className="font-mono text-xs text-muted">{resource.file_size}</span>
            ) : null}
            {resource.academic_year ? <Badge variant="muted">{resource.academic_year}</Badge> : null}
          </div>

          <h1 className="text-xl font-bold leading-snug tracking-tight text-charcoal sm:text-2xl">
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
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button onClick={handleDownload} disabled={downloading} className="rounded-full">
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line-strong bg-canvas px-4 text-sm font-medium text-charcoal hover:bg-neutral-soft transition-colors"
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
                'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors cursor-pointer',
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

          {!isAdminViewer ? (
            <ShareMenu
              size="md"
              path={`/resources/${resource.id}`}
              title={resource.title}
              subjectLabel={
                resource.subject
                  ? `${resource.subject.subject_code} — ${resource.subject.name}`
                  : null
              }
            />
          ) : null}
        </div>
      </div>

      {downloadStatus ? (
        <div
          role="status"
          className={cn(
            'flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs leading-relaxed',
            downloadStatus.type === 'error'
              ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
              : 'border-line-strong bg-neutral-soft text-charcoal'
          )}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
          <span>{downloadStatus.message}</span>
        </div>
      ) : null}

      {/* ------------------------------ Reader ------------------------------ */}
      {showEmbedViewer ? (
        <section
          ref={stageRef}
          aria-label="Document reader"
          onMouseMove={immersive ? pokeChrome : undefined}
          className={cn(
            'relative flex flex-col overflow-hidden bg-[#171114] text-canvas',
            focusMode
              ? 'fixed inset-0 z-[70] rounded-none'
              : 'rounded-[24px] border border-line-strong',
            nativeFullscreen && 'h-full w-full rounded-none'
          )}
        >
          {/* Inline toolbar (immersive mode uses the floating pill instead) */}
          {!immersive ? (
            <div className="flex items-center justify-between gap-3 bg-burgundy-deep px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-canvas/80" />
                <span className="truncate text-xs font-semibold text-canvas">{resource.title}</span>
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-canvas/80">
                  {resource.file_type}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={reloadFrame}
                  title="Reload preview"
                  aria-label="Reload preview"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-canvas/85 transition-colors hover:bg-white/10 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in Google Drive"
                  aria-label="Open in Google Drive"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-canvas/85 transition-colors hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => void enterImmersive()}
                  className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-burgundy px-3.5 text-xs font-semibold text-canvas transition-all hover:bg-burgundy-dark active:scale-95 cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Full screen</span>
                </button>
              </div>
            </div>
          ) : (
            /* Floating control pill — always reachable, dims when idle.
               (The Drive frame is cross-origin, so hidden chrome could
               never be summoned back with a tap on the document itself.) */
            <div
              role="toolbar"
              aria-label="Reader controls"
              onMouseEnter={pokeChrome}
              onTouchStart={pokeChrome}
              className={cn(
                'absolute left-1/2 top-3 z-20 flex max-w-[94vw] -translate-x-1/2 items-center gap-1 rounded-full bg-black/55 py-1.5 pl-1.5 pr-2 ring-1 ring-white/15 backdrop-blur-md transition-opacity duration-500',
                chromeIdle ? 'opacity-40' : 'opacity-100'
              )}
              style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
            >
              <button
                type="button"
                onClick={exitImmersive}
                title="Exit full screen (Esc)"
                aria-label="Exit full screen"
                className={glassBtn}
              >
                <X className="h-[18px] w-[18px]" />
              </button>
              <span className="hidden min-w-0 items-center gap-2 border-l border-white/15 pl-2.5 sm:flex">
                <span className="max-w-[34vw] truncate text-xs font-medium text-white">
                  {resource.title}
                </span>
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/75">
                  {resource.file_type}
                </span>
              </span>
              <span className="mx-0.5 hidden h-5 w-px bg-white/15 sm:block" />
              {!isAdminViewer ? (
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  disabled={bookmarking}
                  title={bookmarked ? 'Saved' : 'Save for later'}
                  aria-label={bookmarked ? 'Remove bookmark' : 'Save for later'}
                  className={cn(glassBtn, bookmarked && 'bg-burgundy text-white hover:bg-burgundy-dark')}
                >
                  {bookmarked ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                title="Download"
                aria-label="Download"
                className={glassBtn}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={reloadFrame}
                title="Reload preview"
                aria-label="Reload preview"
                className={glassBtn}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Drive"
                aria-label="Open in Google Drive"
                className={glassBtn}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* One-time hint when entering full screen */}
          {immersive && showHint ? (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-center text-[11px] text-white/85 backdrop-blur-sm">
              You’re reading full screen — controls live at the top. Press Esc or ✕ to leave.
            </div>
          ) : null}

          {/* The document itself */}
          <div
            className={cn(
              'relative w-full bg-[#171114]',
              immersive ? 'min-h-0 flex-1' : 'h-[72dvh] min-h-[470px] sm:h-[78dvh]'
            )}
          >
            {!iframeLoaded ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
                {slowLoad ? (
                  <>
                    <AlertCircle className="h-6 w-6 text-canvas/70" />
                    <p className="max-w-sm text-[13px] font-medium leading-relaxed text-canvas">
                      This is taking longer than usual.
                    </p>
                    <p className="max-w-sm text-xs leading-relaxed text-canvas/65">
                      Slow connection, or Google Drive is being stubborn. Reload the preview,
                      or open the file directly.
                    </p>
                    <div className="pointer-events-auto mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={reloadFrame}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-burgundy px-4 text-xs font-semibold text-white transition-all hover:bg-burgundy-dark active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reload preview
                      </button>
                      <a
                        href={openUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-4 text-xs font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
                      >
                        Open in Drive
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-canvas" />
                    <p className="text-xs text-canvas/70">
                      Opening <span className="font-medium text-canvas">{resource.file_name || 'your note'}</span>…
                    </p>
                  </>
                )}
              </div>
            ) : null}

            <iframe
              key={iframeKey}
              src={previewUrl}
              title={`Preview of ${resource.title}`}
              onLoad={() => setIframeLoaded(true)}
              allow="autoplay; fullscreen"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              className="relative z-[5] h-full w-full border-0"
            />
          </div>

          {/* Quiet help line (inline mode only — immersive stays clean) */}
          {!immersive ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-burgundy-deep px-4 py-2 text-[11px] text-canvas/60">
              <span>Tip: Full screen is the nicest way to read — no distractions.</span>
              <span aria-hidden="true">•</span>
              <span>Preview misbehaving?</span>
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-canvas/85 underline decoration-white/30 underline-offset-2 hover:text-canvas"
              >
                Open it in Google Drive
              </a>
            </p>
          ) : null}
        </section>
      ) : (
        /* Non-PDF Format Experience */
        <section className="space-y-4 rounded-[24px] border border-line bg-neutral-soft/70 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line-strong bg-canvas text-burgundy">
            <FileArchive className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <Badge variant="neutral">{resource.file_type} Document</Badge>
            <h2 className="mt-2 text-lg font-semibold text-charcoal">{resource.title}</h2>
            <p className="mx-auto max-w-lg text-xs leading-relaxed text-muted">
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
              className="inline-flex h-10 items-center gap-2 rounded-full bg-burgundy px-4 text-sm font-semibold text-canvas hover:bg-burgundy-dark"
            >
              <span>Open in Google Drive</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <Button variant="secondary" onClick={handleDownload} disabled={downloading} className="rounded-full">
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download {resource.file_type}</span>
            </Button>
            {resource.file_type !== 'ZIP' ? (
              <Button variant="subtle" onClick={() => setForceEmbedNonPdf(true)} className="rounded-full">
                Try Embedded Drive Viewer
              </Button>
            ) : null}
          </div>
        </section>
      )}

      {/* Details — below the reader, out of the way */}
      {resource.description || resource.keywords?.length ? (
        <section className="space-y-3 rounded-[24px] border border-line bg-canvas p-5">
          {resource.description ? (
            <p className="text-sm leading-relaxed text-charcoal/85">{resource.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Uploaded {formatDate(resource.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {downloadCount} download{downloadCount === 1 ? '' : 's'}
            </span>
            {resource.file_name ? <span className="font-mono">{resource.file_name}</span> : null}
          </div>
          {resource.keywords && resource.keywords.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {resource.keywords.slice(0, 6).map((kw) => (
                <span
                  key={kw}
                  className="rounded-full border border-line bg-neutral-soft px-2 py-0.5 text-[11px] text-muted"
                >
                  #{kw}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Uploaded {formatDate(resource.created_at)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {downloadCount} download{downloadCount === 1 ? '' : 's'}
          </span>
        </p>
      )}

      {/* Below-PDF-Preview Ad Slot (Strictly below viewer, never shown to Admin) */}
      {!isAdminViewer ? (
        <AdSlot
          ad={belowPreviewAd}
          adsEnabled={adsEnabled}
          requireConsent={requireAdConsent}
        />
      ) : null}

      {/* More like this */}
      {relatedResources.length > 0 && !isAdminViewer ? (
        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-base font-semibold text-charcoal">More like this</h2>
            <p className="text-xs text-muted">
              More notes and question papers from the same subject and semester.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {relatedResources.map((rel, i) => (
              <ResourceCard key={rel.id} resource={rel} index={i} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
