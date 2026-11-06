import { ExternalLink, FileText, Image as ImageIcon, Pin } from 'lucide-react';
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
    <section aria-label="Notices" className="mt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-medium text-charcoal">Notices</h2>
        <span className="text-[13px] text-muted">
          {notices.length} new
        </span>
      </div>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {notices.map((notice) => {
          const isUrgent = notice.priority === 'urgent';
          return (
            <li key={notice.id} className="py-5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12.5px]">
                {notice.is_pinned ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-burgundy">
                    <Pin className="h-3 w-3" /> Pinned
                  </span>
                ) : null}
                {isUrgent ? (
                  <Badge variant="danger">Urgent</Badge>
                ) : notice.priority === 'important' ? (
                  <Badge variant="burgundy">Important</Badge>
                ) : null}
                <span className="font-medium text-charcoal/70">
                  {NOTICE_TYPE_LABELS[notice.notice_type]}
                </span>
                <span className="text-muted">{formatDate(notice.start_date)}</span>
                {notice.expiry_date ? (
                  <span className="text-muted">· until {formatDate(notice.expiry_date)}</span>
                ) : null}
              </div>

              <h3 className="mt-2 text-[15.5px] font-semibold leading-snug text-charcoal">
                {notice.title}
              </h3>
              <p className="mt-1 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted">
                {notice.description}
              </p>

              {notice.attachment_url && notice.attachment_type === 'image' ? (
                <div className="mt-3 max-w-xl overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={notice.attachment_url} alt={notice.title} className="max-h-52 w-full object-cover" />
                </div>
              ) : null}

              {notice.attachment_url || notice.external_link ? (
                <p className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[13.5px]">
                  {notice.attachment_url ? (
                    <a
                      href={notice.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-burgundy hover:underline underline-offset-4"
                    >
                      {notice.attachment_type === 'image' ? (
                        <ImageIcon className="h-4 w-4" strokeWidth={1.8} />
                      ) : (
                        <FileText className="h-4 w-4" strokeWidth={1.8} />
                      )}
                      {notice.attachment_name || 'Attachment'}
                    </a>
                  ) : null}
                  {notice.external_link ? (
                    <a
                      href={notice.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn('inline-flex items-center gap-1.5 font-semibold text-burgundy hover:underline underline-offset-4')}
                    >
                      {notice.external_link_label || 'More details'}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
