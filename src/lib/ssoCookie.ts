/**
 * Cross-subdomain single sign-on for cards.shakurs.com.
 *
 * The cards app is a separate application on a sibling subdomain, so it cannot
 * see this origin's localStorage. This mirrors the Supabase **access token**
 * — and only the access token — into a cookie scoped to `.shakurs.com`, where
 * the cards app can read it once and trade it for its own session.
 *
 * What is deliberately NOT here:
 *
 *   * the refresh token — it never leaves this origin, so a flaw on
 *     cards.shakurs.com cannot mint new sessions or extend one;
 *   * httpOnly — the cards app's JavaScript has to read this, which is the
 *     whole purpose. The value is short-lived and, on its own, worthless
 *     against the cards app: that app re-verifies the token with Supabase
 *     server-side and separately checks the account's `cards_access` before
 *     issuing anything.
 *
 * Max-Age tracks the token's own expiry, so a stale token is not left lying
 * around after it stops being useful.
 */
const COOKIE = 'shakur_sso';
const DOMAIN = '.shakurs.com';

type MinimalSession = { access_token?: string | null; expires_at?: number | null } | null;

/**
 * Only meaningful on https://*.shakurs.com. A `Domain=.shakurs.com` cookie is
 * silently rejected anywhere else (localhost, preview hosts, the old
 * shakur.verxyl.com), so writing one there would fail quietly and confuse the
 * next person to debug this.
 */
function canShare(): boolean {
  if (typeof document === 'undefined' || typeof location === 'undefined') return false;
  return location.protocol === 'https:' && /(^|\.)shakurs\.com$/.test(location.hostname);
}

export function clearSsoCookie(): void {
  if (!canShare()) return;
  document.cookie = `${COOKIE}=; Domain=${DOMAIN}; Path=/; Max-Age=0; Secure; SameSite=Lax`;
}

export function writeSsoCookie(session: MinimalSession): void {
  if (!canShare()) return;
  if (!session?.access_token || !session.expires_at) {
    clearSsoCookie();
    return;
  }
  // 30s of slack: handing over a token that expires mid-flight just produces a
  // confusing "sign-in expired" on the other side.
  const maxAge = Math.floor(session.expires_at - Date.now() / 1000) - 30;
  if (maxAge <= 0) {
    clearSsoCookie();
    return;
  }
  document.cookie =
    `${COOKIE}=${encodeURIComponent(session.access_token)}` +
    `; Domain=${DOMAIN}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax`;
}

/** `?redirect=` targets are honoured only inside our own subdomains. */
export function safeRedirectTarget(raw: string | null): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw, typeof location === 'undefined' ? undefined : location.href);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (!/(^|\.)shakurs\.com$/.test(u.hostname)) return null;
  return u.toString();
}
