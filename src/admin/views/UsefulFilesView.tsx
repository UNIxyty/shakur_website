/**
 * Admin → Useful files.
 *
 * Both requisites variants with Download (PNG/PDF) + Print, and a quick link to
 * the cards app. The downloads are rendered server-side by Playwright against
 * /requisites-print, so what you download is pixel-identical to what you print.
 *
 * Layout: every tile is the SAME width and the SAME height. The two requisites
 * blocks have very different aspect ratios (595 × 863.5 vs 577 × 503), so each
 * preview is scaled to *fit* a shared fixed-size stage rather than to fill the
 * tile's width — otherwise the tall one makes its tile half again as tall as
 * its neighbour and the row looks accidental.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  REQUISITES_SIZES,
  RequisitesBlock,
  LOGO_SRC,
  type RequisitesVariant,
} from '../requisites/RequisitesBlock';
import { FONT, GhostBtn, PrimaryBtn, Spinner } from '../components/ui';

const INK = '#160C00';
const MUTED = '#54504D';
const LINE = '#E7E5E4';
const CARDS_URL = 'https://cards.shakurs.com';

/** One tile geometry for all three, so the row is a row and not a staircase. */
const TILE_W = 340;
const TILE_PAD = 18;
/** Tailwind's preflight makes every box border-box, so the declared width is
 *  the outside edge: subtract the padding and the 1px border for the content. */
const TILE_INNER = TILE_W - 2 * TILE_PAD - 2;
/** Tall enough for the 595 × 863.5 block to be legible; both fit inside it. */
const STAGE_H = 330;
/** Header = two text lines at a fixed height, so the stages line up too. */
const HEAD_H = 42;

type Busy = { variant: RequisitesVariant; ext: 'png' | 'pdf' } | null;

async function downloadRendered(variant: RequisitesVariant, ext: 'png' | 'pdf') {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session expired — sign in again.');

  const res = await fetch(`/api/admin/requisites/${variant}.${ext}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Render failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SHAKUR-rekviziti-${variant}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** The shared tile shell — the thing that makes the row symmetrical. */
function Tile({
  title,
  subtitle,
  stage,
  footer,
}: {
  title: string;
  subtitle: string;
  stage: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: TILE_W,
        border: `1px solid ${LINE}`,
        borderRadius: 14,
        background: '#fff',
        padding: TILE_PAD,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ height: HEAD_H }}>
        <div style={{ font: `700 14px ${FONT}`, color: INK }}>{title}</div>
        <div style={{ font: `500 12px ${FONT}`, color: MUTED, marginTop: 3 }}>{subtitle}</div>
      </div>

      <div
        style={{
          height: STAGE_H,
          borderRadius: 10,
          background: '#F5F4F3',
          border: `1px solid ${LINE}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {stage}
      </div>

      {/* Fixed height, not just flex: a ghost button is a few px shorter than a
          primary one, which was enough to leave one tile 4px out of line. */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 45 }}>{footer}</div>
    </div>
  );
}

function VariantTile({
  variant,
  onError,
  onLogoFallback,
}: {
  variant: RequisitesVariant;
  onError: (m: string) => void;
  onLogoFallback: () => void;
}) {
  const [busy, setBusy] = useState<Busy>(null);
  const meta = REQUISITES_SIZES[variant];

  // Scale to FIT the stage — the limiting dimension wins — so the tall variant
  // and the wide one occupy the same box. The block itself stays exact size;
  // only the preview is transformed.
  const scale = Math.min(TILE_INNER / meta.w, STAGE_H / meta.h);

  const run = async (ext: 'png' | 'pdf') => {
    setBusy({ variant, ext });
    try {
      await downloadRendered(variant, ext);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Tile
      title={meta.label}
      subtitle={meta.note}
      stage={
        <div
          style={{
            width: meta.w * scale,
            height: meta.h * scale,
            boxShadow: '0 6px 20px -8px rgba(22,12,0,.45)',
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <RequisitesBlock variant={variant} shadow={false} onLogoFallback={onLogoFallback} />
          </div>
        </div>
      }
      footer={
        <>
          <PrimaryBtn onClick={() => run('pdf')} disabled={!!busy}>
            {busy?.ext === 'pdf' ? <Spinner /> : null} PDF
          </PrimaryBtn>
          <GhostBtn onClick={() => run('png')}>
            {busy?.ext === 'png' ? <Spinner /> : null} PNG
          </GhostBtn>
          <GhostBtn
            onClick={() => window.open(`/requisites-print?v=${variant}&print=1`, '_blank', 'noopener')}
          >
            Print
          </GhostBtn>
        </>
      }
    />
  );
}

function CardsTile() {
  return (
    <Tile
      title="Worker access cards"
      subtitle="cards.shakurs.com"
      stage={
        <div style={{ textAlign: 'center', padding: '0 22px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#FCCC2C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.8}>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="2" />
              <path d="M5 17c1.2-2 2.6-3 4-3s2.8 1 4 3M15 9h4M15 13h4" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ font: `500 13px/1.6 ${FONT}`, color: MUTED }}>
            Print worker access-card stickers. You are signed in there automatically with this
            same SHAKUR account — no second password.
          </div>
        </div>
      }
      footer={
        <GhostBtn onClick={() => window.open(CARDS_URL, '_blank', 'noopener')}>
          Open cards app →
        </GhostBtn>
      }
    />
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #F2D0C6',
        background: '#FDF3F0',
        borderRadius: 12,
        padding: '12px 14px',
        font: `500 12.5px/1.55 ${FONT}`,
        color: '#8A3D24',
      }}
    >
      {children}
    </div>
  );
}

export default function UsefulFilesView() {
  const [error, setError] = useState('');
  const [logoMissing, setLogoMissing] = useState(false);

  // Independent of the <img> fallback so the notice shows even when both
  // previews resolve from cache.
  useEffect(() => {
    let alive = true;
    fetch(LOGO_SRC, { method: 'HEAD', cache: 'no-cache' })
      .then((r) => {
        if (alive && !r.ok) setLogoMissing(true);
      })
      .catch(() => alive && setLogoMissing(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
      {logoMissing && (
        <Notice>
          <strong>Logo not found.</strong> These blocks are falling back to the SHAKUR wordmark.
          Put the full lockup at{' '}
          <code style={{ background: '#fff', padding: '1px 5px', borderRadius: 4 }}>
            public/assets/shakur_full_logo.svg
          </code>{' '}
          and redeploy — the layout reserves its exact slot, so nothing else moves.
        </Notice>
      )}

      {error && <Notice>{error}</Notice>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, ${TILE_W}px)`,
          gap: 18,
          alignItems: 'start',
        }}
      >
        <VariantTile variant="full" onError={setError} onLogoFallback={() => setLogoMissing(true)} />
        <VariantTile
          variant="compact"
          onError={setError}
          onLogoFallback={() => setLogoMissing(true)}
        />
        <CardsTile />
      </div>

      {/* One shared note instead of the same paragraph under each tile — it is
          the same advice both times, and repeating it made the tiles different
          heights. */}
      <div
        style={{
          border: `1px solid ${LINE}`,
          background: '#FAFAF9',
          borderRadius: 12,
          padding: '13px 15px',
          font: `500 12.5px/1.6 ${FONT}`,
          color: MUTED,
          maxWidth: TILE_W * 3 + 36,
        }}
      >
        <strong style={{ color: INK }}>Printing.</strong> Set <strong>Margins: None</strong>,{' '}
        <strong>Background graphics: ON</strong> and <strong>Scale: 100%</strong>. The yellow field
        is printed colour, so with background graphics off the sheet comes out blank.{' '}
        <strong style={{ color: INK }}>PDF and PNG</strong> are rendered on the server at the exact
        sizes above and need none of that — the PDF's page is the artwork itself, so it prints on A4
        at 100% with margins.
      </div>
    </div>
  );
}
