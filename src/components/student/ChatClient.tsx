'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  Clock,
  Loader2,
  MessagesSquare,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { CHAT_MESSAGE_MAX, formatChatTime } from '@/lib/chat';
import type { ChatMessage } from '@/types/database';
import { cn, getInitials } from '@/lib/utils';

interface ChatClientProps {
  initialMessages: ChatMessage[];
  currentUserId: string;
  /** True when the chat table isn't reachable yet (migration pending). */
  unavailable?: boolean;
}

const STARTERS = [
  'Anyone has short notes for Module 3?',
  'When is the next series test?',
  'Can someone share today’s class notes?',
];

export function ChatClient({ initialMessages, currentUserId, unavailable }: ChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stick, setStick] = useState(true);
  const [hasNew, setHasNew] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickRef = useRef(true);

  const participantCount = useMemo(
    () => new Set(messages.map((m) => m.user_id)).size,
    [messages]
  );

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const fetchLatest = useCallback(async () => {
    try {
      const since = messagesRef.current[messagesRef.current.length - 1]?.created_at;
      const res = await fetch(`/api/chat${since ? `?since=${encodeURIComponent(since)}` : ''}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = await res.json();
      mergeMessages((data.messages || []) as ChatMessage[]);
    } catch {
      // Transient network issue — the next poll/realtime ping retries
    }
  }, [mergeMessages]);

  const fetchLatestRef = useRef(fetchLatest);
  fetchLatestRef.current = fetchLatest;

  // Live updates (Supabase Realtime) + a quiet poll as a safety net
  useEffect(() => {
    if (unavailable) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel('student-group-chat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => void fetchLatestRef.current()
      )
      .subscribe();
    const timer = setInterval(() => void fetchLatestRef.current(), 15000);
    return () => {
      void supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [unavailable]);

  function scrollToBottom(smooth: boolean) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Land at the newest message on open
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  // Follow new messages only while the reader is near the bottom
  useEffect(() => {
    if (stickRef.current) {
      scrollToBottom(true);
      setHasNew(false);
    } else {
      setHasNew(true);
    }
  }, [messages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    stickRef.current = nearBottom;
    setStick(nearBottom);
    if (nearBottom) setHasNew(false);
  }

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending || unavailable) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send that. Try again.');
      if (data.message) mergeMessages([data.message as ChatMessage]);
      setDraft('');
      requestAnimationFrame(autoGrow);
      stickRef.current = true;
      setStick(true);
      scrollToBottom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that. Try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await fetch(`/api/chat?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
    } catch {
      void fetchLatestRef.current();
    }
  }

  function applyStarter(text: string) {
    setDraft(text);
    requestAnimationFrame(() => {
      autoGrow();
      textareaRef.current?.focus();
    });
  }

  if (unavailable) {
    return (
      <section className="rounded-[24px] border border-dashed border-line-strong bg-neutral-soft/40 px-6 py-14 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-burgundy-tint text-burgundy">
          <MessagesSquare className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <h2 className="mt-4 text-[15px] font-semibold text-charcoal">
          The group chat is almost ready
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
          It switches on as soon as the latest database update lands. Check back in a
          little while.
        </p>
      </section>
    );
  }

  return (
    <section className="relative flex h-[calc(100dvh-168px)] min-h-[430px] flex-col overflow-hidden rounded-[24px] border border-line bg-canvas lg:h-[calc(100dvh-142px)]">
      {/* Room header */}
      <div className="flex items-center gap-3 border-b border-line bg-canvas px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-burgundy text-white">
          <MessagesSquare className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px] font-semibold text-charcoal">Student group chat</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {participantCount > 1
              ? `${participantCount} students have chatted today`
              : 'Everyone at Azhimathi Mayam, in one room'}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-burgundy-tint px-2.5 py-1 text-[11px] font-medium text-burgundy sm:flex">
          <RotateCcw className="h-3 w-3" />
          Clears at midnight
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[#FAF3F1] px-3.5 py-4 sm:px-5"
      >
        <div className="mb-1.5 flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-burgundy/10" />
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-muted shadow-sm ring-1 ring-line">
            Today
          </span>
          <span className="h-px flex-1 bg-burgundy/10" />
        </div>
        <p className="mb-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
          <Clock className="h-3 w-3" />
          Fresh start every morning — this chat clears at midnight (IST).
        </p>

        {messages.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-burgundy shadow-sm ring-1 ring-line">
              <MessagesSquare className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <p className="mt-4 text-sm font-semibold text-charcoal">Quiet in here, for now</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
              Be the first to say hi today — ask a doubt, share a note, or just find out
              who else is studying.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {STARTERS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => applyStarter(text)}
                  className="rounded-full border border-burgundy-border bg-white px-3.5 py-2 text-xs font-medium text-burgundy shadow-sm transition-all hover:bg-burgundy-tint active:scale-95 cursor-pointer"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((msg, i) => {
              const own = msg.user_id === currentUserId;
              const senderChanged = i === 0 || messages[i - 1].user_id !== msg.user_id;
              const showName = !own && senderChanged;
              const name = msg.sender?.full_name || 'A student';
              return (
                <div
                  key={msg.id}
                  className={cn('anim-rise flex', senderChanged ? 'mt-3.5' : 'mt-1', own ? 'justify-end' : 'justify-start')}
                >
                  {!own ? (
                    showName ? (
                      msg.sender?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.sender.avatar_url}
                          alt={name}
                          className="mr-2 mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover shadow-sm"
                        />
                      ) : (
                        <span className="mr-2 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-burgundy text-[10px] font-bold text-white shadow-sm">
                          {getInitials(name)}
                        </span>
                      )
                    ) : (
                      <span className="mr-2 w-8 shrink-0" />
                    )
                  ) : null}

                  <div className={cn('group flex max-w-[80%] items-center gap-1.5 sm:max-w-[65%]', own && 'flex-row-reverse')}>
                    <div
                      className={cn(
                        'px-3.5 py-2.5 shadow-[0_1px_2px_rgba(36,7,7,0.10)]',
                        own
                          ? 'rounded-2xl rounded-br-md bg-burgundy text-white'
                          : 'rounded-2xl rounded-bl-md bg-white text-charcoal'
                      )}
                    >
                      {showName ? (
                        <p className="mb-1 flex flex-wrap items-baseline gap-x-2 leading-none">
                          <span className="text-xs font-semibold text-burgundy">{name}</span>
                          {msg.sender?.programme?.name ? (
                            <span className="text-[10px] text-muted">{msg.sender.programme.name}</span>
                          ) : null}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {msg.body}
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-right text-[10px] leading-none',
                          own ? 'text-white/60' : 'text-muted'
                        )}
                      >
                        {formatChatTime(msg.created_at)}
                      </p>
                    </div>

                    {own ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(msg.id)}
                        aria-label="Delete message"
                        title="Delete message"
                        className="shrink-0 rounded-full bg-white p-1.5 text-muted opacity-0 shadow-sm ring-1 ring-line transition-opacity hover:text-burgundy focus:opacity-100 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* "New messages" jump pill */}
      {hasNew && !stick ? (
        <button
          type="button"
          onClick={() => {
            stickRef.current = true;
            setStick(true);
            setHasNew(false);
            scrollToBottom(true);
          }}
          className="absolute bottom-[92px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-charcoal px-3.5 py-2 text-xs font-semibold text-canvas shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New messages
        </button>
      ) : null}

      {/* Composer — sits on the same warm ground as the messages */}
      <div className="bg-[#FAF3F1] px-3 pb-3 pt-1.5 sm:px-4 sm:pb-4">
        {error ? (
          <p className="mb-2 px-1 text-[11px] font-medium text-[#C62F34]">{error}</p>
        ) : null}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 rounded-[26px] border border-line bg-white px-4 py-2 shadow-[0_2px_10px_-4px_rgba(36,7,7,0.18)] focus-within:border-burgundy-border">
            <textarea
              ref={textareaRef}
              value={draft}
              rows={1}
              maxLength={CHAT_MESSAGE_MAX}
              onChange={(e) => {
                setDraft(e.target.value);
                autoGrow();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Message everyone…"
              aria-label="Message everyone"
              className="max-h-[110px] w-full resize-none bg-transparent py-1 text-sm leading-relaxed text-charcoal placeholder:text-muted/80 focus:outline-none"
            />
            {draft.length > CHAT_MESSAGE_MAX - 100 ? (
              <p className="pr-1 text-right text-[10px] leading-none text-muted">
                {draft.length}/{CHAT_MESSAGE_MAX}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || draft.trim().length === 0}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-burgundy text-white shadow-[0_8px_16px_-8px_rgba(121,0,0,0.8)] transition-all hover:bg-burgundy-dark active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
