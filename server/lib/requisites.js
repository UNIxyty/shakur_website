/**
 * Requisites renderer — GET /api/admin/requisites/:variant.:ext (png | pdf).
 *
 * Renders the SPA's /requisites-print route with Playwright and returns the
 * exact-size artefact. Rendering server-side (rather than html2canvas in the
 * browser) is deliberate: Chromium honours `@page { size }` and
 * `print-color-adjust: exact` natively, so the PDF page box is exactly
 * 595 × 863.5 / 577 × 503 and the yellow field survives — which is the whole
 * point of these blocks.
 *
 * The React component is the single source of truth; this only photographs it.
 *
 * Chromium comes from the distro (playwright-core never downloads browsers),
 * so the image stays small. CHROMIUM_PATH overrides the default location.
 */
import { chromium } from 'playwright-core';

const SIZES = {
  full: { w: 595, h: 863.5 },
  compact: { w: 577, h: 503 },
};

const WEB_URL = (process.env.WEB_INTERNAL_URL || 'http://web:3000').replace(/\/+$/, '');
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';
const NAV_TIMEOUT = 20000;

/**
 * The blocks are static company data, so a render is reusable until the image
 * is rebuilt. Keyed by variant+ext+scale; bounded by construction (2×2×2).
 */
const cache = new Map();

function launch() {
  return chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
}

async function render(variant, ext, scale) {
  const { w, h } = SIZES[variant];
  const browser = await launch();
  try {
    const context = await browser.newContext({
      // Roomier than the card so the print view's stage padding can never
      // compress it; the element screenshot clips to the card regardless.
      viewport: { width: Math.ceil(w) + 120, height: Math.ceil(h) + 120 },
      deviceScaleFactor: ext === 'png' ? scale : 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT);

    const url = `${WEB_URL}/requisites-print?v=${encodeURIComponent(variant)}`;
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT });
    if (!res || !res.ok()) throw new Error(`print view returned ${res ? res.status() : 'no response'}`);

    // The route sets this only after document.fonts.ready — without it the
    // capture can land on fallback metrics and the Latvian diacritics shift.
    await page.waitForSelector('html[data-requisites-ready="1"]', { timeout: NAV_TIMEOUT });
    const el = await page.waitForSelector(`[data-requisites="${variant}"]`, { timeout: NAV_TIMEOUT });

    if (ext === 'png') {
      const buf = await el.screenshot({ type: 'png' });
      await context.close();
      return buf;
    }

    await page.emulateMedia({ media: 'print' });
    // The page box IS the artwork, at its exact px size: 595 × 863.5 px =
    // 446.88 × 648 pt = 157.5 × 228.6 mm, which prints on A4 at 100% with
    // margins. (Treating the design's units as points instead would give a
    // 210 × 304.8 mm page — taller than A4, so it could not print at 100%.)
    const buf = await page.pdf({
      width: `${w}px`,
      height: `${h}px`,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      pageRanges: '1',
    });
    await context.close();
    return buf;
  } finally {
    await browser.close().catch(() => {});
  }
}

/** GET /api/admin/requisites/:file — `:file` is `<variant>.<ext>`. */
export async function handleRequisites(req, res) {
  const m = /^(full|compact)\.(png|pdf)$/.exec(req.params.file || '');
  if (!m) {
    return res.status(400).json({ error: 'Expected full.png, full.pdf, compact.png or compact.pdf' });
  }
  const [, variant, ext] = m;
  const scale = req.query.scale === '1' ? 1 : 2;
  const key = `${variant}.${ext}@${scale}`;

  try {
    let buf = cache.get(key);
    if (!buf) {
      buf = await render(variant, ext, scale);
      cache.set(key, buf);
    }
    const { w, h } = SIZES[variant];
    res.setHeader('Content-Type', ext === 'png' ? 'image/png' : 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="SHAKUR-rekviziti-${variant}.${ext}"`
    );
    // Exact geometry, so a caller can verify what it received.
    res.setHeader('X-Requisites-Size', ext === 'png' ? `${w * scale}x${h * scale}` : `${w}x${h}`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buf);
  } catch (err) {
    console.error('[requisites]', err.message);
    res.status(500).json({
      error:
        'Could not render the requisites file. Chromium may be unavailable in this container — check CHROMIUM_PATH.',
    });
  }
}
