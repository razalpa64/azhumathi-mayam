/**
 * Username normalization & deterministic internal Supabase Auth email mapping.
 *
 * Users (students and the super administrator `admin@invytra`) sign in exclusively
 * with a username + password. Because Supabase Auth requires a valid RFC email
 * identifier under the hood, we deterministically map any normalized username to a
 * synthetic internal email domain while storing the canonical username in `profiles.username`.
 */

const INTERNAL_AUTH_DOMAIN = 'auth.azhimathimayam.app';

export const USERNAME_REGEX = /^[a-z0-9._@-]{3,64}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsernameFormat(raw: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    return { valid: false, normalized, error: 'Username is required.' };
  }
  if (normalized.length < 3 || normalized.length > 64) {
    return { valid: false, normalized, error: 'Username must be between 3 and 64 characters.' };
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Username may only contain letters, numbers, dots (.), underscores (_), hyphens (-), or @.',
    };
  }
  return { valid: true, normalized };
}

/**
 * Deterministically converts a normalized username (including `admin@invytra`)
 * into a collision-free RFC-compliant email for Supabase Auth.
 */
export function usernameToAuthEmail(rawUsername: string): string {
  const normalized = normalizeUsername(rawUsername);
  // Encode non-alphanumeric chars into hex tokens so `a@b` and `a.b` never collide
  const encodedLocal = Array.from(normalized)
    .map((ch) => {
      if (/^[a-z0-9]$/.test(ch)) return ch;
      return `_${ch.charCodeAt(0).toString(16)}_`;
    })
    .join('');

  return `u.${encodedLocal}@${INTERNAL_AUTH_DOMAIN}`;
}
