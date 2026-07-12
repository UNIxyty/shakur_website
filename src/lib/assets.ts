/**
 * Resolve an image reference to a usable URL.
 *
 * Two shapes reach the UI:
 *   - design-relative paths from the static content ("images/proj-rimi.png")
 *   - absolute URLs from Supabase Storage, once the admin uploads a cover
 *
 * Leading-slash and data: URIs are passed through untouched.
 */
export function assetUrl(src: string): string {
  if (!src) return '';
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  return src.startsWith('/') ? src : `/${src}`;
}

/** Same, wrapped for use in a CSS `background-image`. */
export function bgImage(src: string): string {
  return `url(${JSON.stringify(assetUrl(src))})`;
}
