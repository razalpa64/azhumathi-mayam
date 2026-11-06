/**
 * Support contacts shown on the student Help page.
 * The email can be overridden from Admin → Settings (support_email);
 * these are the fallbacks so help is never a dead end.
 */
export const SUPPORT_PHONE_DISPLAY = '86061 59002';
export const SUPPORT_PHONE_TEL = '+918606159002';
export const SUPPORT_WHATSAPP_URL =
  'https://wa.me/918606159002?text=' +
  encodeURIComponent('Hi, I need help with അഴിമതി മയം.');
export const SUPPORT_EMAIL = 'razalpa64@gmail.com';

/** Categories that make up the "Short Notes & Exam Special" collection. */
export const SHORT_NOTE_CATEGORY_SLUGS = ['short-notes', 'cheat-sheets'] as const;
