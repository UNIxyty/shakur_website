/**
 * Admin → Useful files (Полезные файлы).
 *
 * Both requisites variants with Download (PNG/PDF) + Print, and a quick link to
 * the cards app. The downloads are rendered server-side by Playwright against
 * /requisites-print, so what you download is pixel-identical to what you print.
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

function VariantCard({
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

  // Preview scaled to fit the admin column; the block itself stays exact size.
  const previewW = 300;
  const scale = previewW / meta.w;

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
    <div
      style={{
        border: `1px solid ${LINE}`,
        borderRadius: 14,
        background: '#fff',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div>
        <div style={{ font: `700 14px ${FONT}`, color: INK }}>{meta.label}</div>
        <div style={{ font: `500 12px ${FONT}`, color: MUTED, marginTop: 2 }}>{meta.note}</div>
      </div>

      <div
        style={{
          width: previewW,
          height: meta.h * scale,
          overflow: 'hidden',
          alignSelf: 'center',
          borderRadius: 6,
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <RequisitesBlock variant={variant} shadow={false} onLogoFallback={onLogoFallback} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PrimaryBtn onClick={() => run('pdf')} disabled={!!busy}>
          {busy?.ext === 'pdf' ? <Spinner /> : null} PDF
        </PrimaryBtn>
        <GhostBtn onClick={() => run('png')}>{busy?.ext === 'png' ? <Spinner /> : null} PNG</GhostBtn>
        <GhostBtn
          onClick={() => window.open(`/requisites-print?v=${variant}&print=1`, '_blank', 'noopener')}
        >
          Print
        </GhostBtn>
      </div>

      <div style={{ font: `500 11.5px/1.5 ${FONT}`, color: MUTED }}>
        Printing: set <strong>Margins: None</strong>, <strong>Background graphics: ON</strong>,{' '}
        <strong>Scale: 100%</strong> — the yellow field is printed colour, so with background
        graphics off the sheet comes out blank.
      </div>
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
    fetch(LOGO_SRC, { method: 'HEAD' })
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
          <strong>Temporary placeholder logo.</strong> The full SHAKUR lockup could not be
          retrieved (the source SVG exceeds the design tool's 256&nbsp;KiB read limit, and the
          available PNGs are 206×137 — far too low-resolution to print). These blocks currently use
          the wordmark. To fix permanently, drop the real file at{' '}
          <code style={{ background: '#fff', padding: '1px 5px', borderRadius: 4 }}>
            public/assets/shakur_full_logo.svg
          </code>{' '}
          and redeploy — the layout reserves its exact slot, so nothing else moves.
        </div>
      )}

      {error && (
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
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <VariantCard
          variant="full"
          onError={setError}
          onLogoFallback={() => setLogoMissing(true)}
        />
        <VariantCard
          variant="compact"
          onError={setError}
          onLogoFallback={() => setLogoMissing(true)}
        />

        <a
          href={CARDS_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            border: `1px solid ${LINE}`,
            borderRadius: 14,
            background: '#fff',
            padding: 18,
            width: 300,
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#FCCC2C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.8}>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="2" />
              <path d="M5 17c1.2-2 2.6-3 4-3s2.8 1 4 3M15 9h4M15 13h4" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ font: `700 14px ${FONT}`, color: INK }}>Worker access cards</div>
          <div style={{ font: `500 12px/1.55 ${FONT}`, color: MUTED }}>
            Print worker access-card stickers at cards.shakurs.com. You are signed in there
            automatically with this same account.
          </div>
          <div style={{ font: `600 12px ${FONT}`, color: '#B8860B' }}>cards.shakurs.com →</div>
        </a>
      </div>
    </div>
  );
}
