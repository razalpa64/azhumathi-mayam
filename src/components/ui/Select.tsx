'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  ariaLabel: string;
  /** Shown inside the panel when there is nothing to choose. */
  emptyLabel?: string;
  className?: string;
}

/**
 * A picker for the sign-up form.
 *
 * Phones keep the operating system's own `<select>` — it is the best control
 * on touch and the phone layout must not change. From `sm` up the list is
 * drawn by us instead, because the native popup is styled by the OS: on a
 * laptop it rendered as a grey slab sitting on top of the fields below, with
 * the option text barely readable. Our panel opens under the field, follows
 * the page, and says so plainly when there is nothing to choose.
 */
export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  ariaLabel,
  emptyLabel = 'Nothing to choose yet',
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Near the bottom of the window the panel opens upwards instead of running
  // off the screen.
  const [dropUp, setDropUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  function openPanel() {
    if (disabled || options.length === 0) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setDropUp(rect.top > 320 && window.innerHeight - rect.bottom < 300);
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function closePanel(refocus = false) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    closePanel(true);
  }

  // Click anywhere else closes the panel.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && wrapperRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel(true);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // A form-level reset (or a programme change clearing the semester) should
  // not leave a stale highlight behind.
  useEffect(() => {
    if (!open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openPanel();
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => {
        const next = index + step;
        if (next < 0) return options.length - 1;
        if (next >= options.length) return 0;
        return next;
      });
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) commit(active);
      else openPanel();
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closePanel();
    }
    if (event.key === 'Tab') setOpen(false);
  }

  const isEmpty = options.length === 0;

  return (
    <>
      {/* Phones: the OS picker, exactly as before. */}
      <div className={cn('sm:hidden', className)}>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-label={ariaLabel}
          className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none disabled:opacity-55"
        >
          <option value="">{isEmpty ? emptyLabel : placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Mouse and keyboard: our own panel. */}
      <div ref={wrapperRef} className={cn('relative hidden sm:block', className)}>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => (open ? closePanel() : openPanel())}
          onKeyDown={onTriggerKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-canvas px-3 text-left text-sm transition-colors focus:outline-none',
            open
              ? 'border-burgundy ring-2 ring-burgundy/15'
              : 'border-line-strong hover:border-burgundy-border',
            'focus-visible:border-burgundy focus-visible:ring-2 focus-visible:ring-burgundy/15',
            'disabled:cursor-not-allowed disabled:opacity-55'
          )}
        >
          <span className={cn('truncate', selected ? 'text-charcoal' : 'text-muted/75')}>
            {selected ? selected.label : isEmpty ? emptyLabel : placeholder}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 text-muted transition-transform duration-150',
              open && 'rotate-180'
            )}
          />
        </button>

        {open ? (
          <ul
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            tabIndex={-1}
            className={cn(
              'absolute left-0 right-0 z-40 max-h-64 overflow-y-auto rounded-lg border border-line bg-canvas p-1 shadow-[0_18px_40px_-18px_rgba(36,7,7,0.4)]',
              dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            )}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => commit(index)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                      index === active ? 'bg-burgundy-tint text-burgundy' : 'text-charcoal',
                      isSelected && 'font-semibold'
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-burgundy" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </>
  );
}
