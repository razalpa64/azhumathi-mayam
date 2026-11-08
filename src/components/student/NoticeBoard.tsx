import { ExternalLink, FileText, Image as ImageIcon, Megaphone, Pin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Notice, NoticeType } from '@/types/database';
import { cn, formatDate } from '@/lib/utils';

const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
  general: 'General',
  exam: 'Exam',
  assignment: 'Assignment',
  academic_update: 'Update',
  material_update: 'New material',
  college: 'College',
};

interface NoticeBoardProps {
  notices: Notice[];
  noticesEnabled: boolean;
}

export function NoticeBoard({ notices, noticesEnabled }: NoticeBoardProps) {
  if (!noticesEnabled || notices.length === 0) {
    return null;
  }

  return (
    <section aria-label="Official academic notices" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-burgundy" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-charcoal">
            Notices
          </h2>
        </div>
        <span className="text-xs text-muted">{notices.length} new</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 lg:gap-4">
        {notices.map((notice) => {
          const isHighPriority = notice.priority === 'urgent' || notice.priority === 'important';
          return (
            <article
              key={notice.id}
              className={cn(
                'rounded-lg border p-4 transition-colors lg:rounded-[22px] lg:p-5',
                isHighPriority
                  ? 'border-burgundy-border bg-burgundy-tint'
                  : 'border-line bg-canvas'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {notice.is_pinned ? (
                    <Badge variant="solid" className="gap-1">
                      <Pin className="h-3 w-3" />
                      <span>Pinned</span>
                    </Badge>
                  ) : null}
                  {notice.priority === 'urgent' ? (
                    <Badge variant="danger">Urgent</Badge>
                  ) : notice.priority === 'important' ? (
                    <Badge variant="burgundy">Important</Badge>
                  ) : null}
                  <Badge variant="neutral">{NOTICE_TYPE_LABELS[notice.notice_type]}</Badge>
                </div>
                <time className="text-[11px] font-mono text-muted">
                  {formatDate(notice.start_date)}
                </time>
              </div>

              <h3 className="mt-2.5 text-sm font-semibold text-charcoal leading-snug">
                {notice.title}
              </h3>
              <p className="mt-1.5 text-xs text-muted leading-relaxed whitespace-pre-line">
                {notice.description}
              </p>

              {notice.attachment_url && notice.attachment_type === 'image' ? (
                <div className="mt-3 overflow-hidden rounded-md border border-line bg-neutral-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={notice.attachment_url}
                    alt={notice.title}
                    className="max-h-48 w-full object-cover"
                  />
                </div>
              ) : null}

              {(notice.attachment_url || notice.external_link || notice.expiry_date) ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    {notice.attachment_url ? (
                      <a
                        href={notice.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-burgundy hover:underline"
                      >
                        {notice.attachment_type === 'image' ? (
                          <ImageIcon className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        <span>{notice.attachment_name || 'Attachment'}</span>
                      </a>
                    ) : null}

                    {notice.external_link ? (
                      <a
                        href={notice.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal hover:text-burgundy"
                      >
                        <span>{notice.external_link_label || 'More details'}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>

                  {notice.expiry_date ? (
                    <span className="text-[11px] text-muted">
                      Until {formatDate(notice.expiry_date)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
