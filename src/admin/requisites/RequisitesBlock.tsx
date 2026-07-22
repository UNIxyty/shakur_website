/**
 * SHAKUR requisites (rekvizīti) blocks — the single source of truth for both
 * variants, used by three consumers so they can never drift:
 *   1. the admin "Useful files" page (scaled-down preview),
 *   2. /requisites-print (the print view the Print button opens),
 *   3. the API's Playwright renderer, which screenshots that same route for
 *      the PNG/PDF downloads.
 *
 * Sizes are EXACT and non-negotiable — they are the deliverable:
 *   full     595 × 863.5 px  (595 = A4 width in points)
 *   compact  577 × 503 px
 *
 * Transcribed from "SHAKUR Requisites.dc (1).html". All Latvian copy, the
 * word-joiners in the legal address and the hair spaces in the IBAN are
 * preserved verbatim.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';

export const REQUISITES_SIZES = {
  full: { w: 595, h: 863.5, label: 'Pilnā versija', note: '595 × 863.5 px · A4 platums' },
  compact: { w: 577, h: 503, label: 'Kompaktā versija', note: '577 × 503 px' },
} as const;

export type RequisitesVariant = keyof typeof REQUISITES_SIZES;

const INK = '#160C00';
const CARD = '#FCCC2C';
const ACCENT = '#FB8500';
const LABEL_INK = '#6B5320';

/** The real lockup; the wordmark stands in until it is supplied (see below). */
export const LOGO_SRC = '/assets/shakur_full_logo.svg';
export const LOGO_FALLBACK_SRC = '/assets/shakur_wordmark.svg';
const LOGO_W = 238;
/** Slot height = the real lockup's aspect (viewBox 163 × 110) at LOGO_W, so
 *  dropping the real file in later changes nothing about the layout. */
const LOGO_SLOT_H = Math.round((LOGO_W * 110) / 163 * 10) / 10; // 160.6

const lbl: CSSProperties = {
  font: "500 10.5px/1.45 'Inter', sans-serif",
  letterSpacing: '.055em',
  textTransform: 'uppercase',
  color: LABEL_INK,
};
const val: CSSProperties = { font: "600 13.5px/1.4 'Inter', sans-serif", color: INK };
const valMono: CSSProperties = { ...val, fontFeatureSettings: "'tnum' 1", letterSpacing: '.01em' };

function Diamond({ size = 7, style }: { size?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        background: ACCENT,
        transform: 'rotate(45deg)',
        flex: 'none',
        ...style,
      }}
    />
  );
}

function SectionHeader({ children, mb = 11 }: { children: ReactNode; mb?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: mb }}>
      <Diamond />
      <span
        style={{
          font: "700 11px 'Inter', sans-serif",
          letterSpacing: '.19em',
          textTransform: 'uppercase',
          color: INK,
        }}
      >
        {children}
      </span>
      <span style={{ flex: 1, height: 1.5, background: INK }} />
    </div>
  );
}

function Grid({ children, mb }: { children: ReactNode; mb?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '150px 1fr',
        gap: '9px 16px',
        marginBottom: mb,
      }}
    >
      {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <>
      <div style={lbl}>{k}</div>
      <div style={mono ? valMono : val}>{v}</div>
    </>
  );
}

/**
 * The lockup. `onError` swaps to the wordmark, so the moment a real
 * public/assets/shakur_full_logo.svg exists it is picked up with no code change.
 */
function Logo({ onFallback }: { onFallback?: () => void }) {
  const [src, setSrc] = useState(LOGO_SRC);
  return (
    <div
      style={{
        height: LOGO_SLOT_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={src}
        alt="SHAKUR — Building Services"
        style={{ width: LOGO_W, height: 'auto', display: 'block' }}
        onError={() => {
          if (src !== LOGO_FALLBACK_SRC) {
            setSrc(LOGO_FALLBACK_SRC);
            onFallback?.();
          }
        }}
      />
    </div>
  );
}

/** Shared card shell — exact size, yellow field, 2px ink border. */
function Card({
  variant,
  children,
  shadow = true,
}: {
  variant: RequisitesVariant;
  children: ReactNode;
  shadow?: boolean;
}) {
  const { w, h } = REQUISITES_SIZES[variant];
  return (
    <div
      data-requisites={variant}
      style={{
        position: 'relative',
        width: w,
        height: h,
        // Never let a flex/grid parent shrink the card: these dimensions ARE
        // the deliverable. Without this the block loses the stage padding when
        // the window is narrower than the card (printing from a small window
        // produced a 547px-wide "595px" card).
        flex: 'none',
        minWidth: w,
        minHeight: h,
        background: CARD,
        border: `2px solid ${INK}`,
        overflow: 'hidden',
        padding: variant === 'full' ? '44px 46px 40px' : '34px 44px 32px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
        // Both the field and the rules are printed colour.
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        boxShadow: shadow ? '0 24px 60px -20px rgba(22,12,0,.4)' : 'none',
      } as CSSProperties}
    >
      {children}
    </div>
  );
}

const LEGAL_ADDRESS = 'Augusta Dombrovska iela 44⁠-⁠36, Rīga, LV-1015';
const IBAN = 'LV08 HABA 0551 0483 0199 3';

export function RequisitesFull({
  shadow = true,
  onLogoFallback,
}: {
  shadow?: boolean;
  onLogoFallback?: () => void;
}) {
  return (
    <Card variant="full" shadow={shadow}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: 10,
        }}
      >
        <Logo onFallback={onLogoFallback} />
      </div>

      <div style={{ textAlign: 'center', paddingBottom: 22 }}>
        <div
          style={{
            font: "600 25px/1.2 'Cormorant Garamond', serif",
            color: INK,
            letterSpacing: '.01em',
          }}
        >
          Sabiedrība ar ierobežotu atbildību <span style={{ fontWeight: 700 }}>“SHAKUR”</span>
        </div>
      </div>

      <SectionHeader>Rekvizīti</SectionHeader>
      <Grid mb={22}>
        <Row k="Reģ. Nr." v="51203071901" mono />
        <Row k="PVN maksātāja Nr." v="LV51203071901" mono />
        <Row k="Juridiskā adrese" v={LEGAL_ADDRESS} />
        <Row k="Biroja adrese" v="Audēju iela 8-14, Vecrīgā, LV-1010" />
        <Row k="Būvkomersanta reģ." v="Nr. 15953 · (BIS)" />
      </Grid>

      <SectionHeader>Banka</SectionHeader>
      <Grid mb={22}>
        <Row k="Banka" v="AS “SWEDBANK”" />
        <Row k="BIC / S.W.I.F.T." v="HABALV22" mono />
        <Row k="Norēķinu konts" v={IBAN} mono />
      </Grid>

      <SectionHeader mb={12}>Pakalpojumi</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
        {[
          <>Reģipša starpsienu montāža</>,
          <>Apdares darbi</>,
          <>
            Ēku būvdarbu vadīšana un būvuzraudzība{' '}
            <span style={{ color: LABEL_INK, fontWeight: 500 }}>— sert. Nr. 4-04368</span>
          </>,
          <>Citas būvdarbu pabeigšanas operācijas</>,
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 11 }}>
            <Diamond size={5} style={{ marginTop: 6 }} />
            <span style={{ ...val, fontWeight: 500 }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <SectionHeader>Kontakti</SectionHeader>
        <Grid>
          <Row k="Kontaktpersona" v="Andrejs Shakurs" />
          <Row k="Tālrunis" v="+371 26 872 727" mono />
          <Row k="E-pasts" v="info.andrey.shakur@gmail.com" />
        </Grid>
      </div>
    </Card>
  );
}

export function RequisitesCompact({
  shadow = true,
  onLogoFallback,
}: {
  shadow?: boolean;
  onLogoFallback?: () => void;
}) {
  return (
    <Card variant="compact" shadow={shadow}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 4,
          paddingBottom: 16,
        }}
      >
        <Logo onFallback={onLogoFallback} />
        <div
          style={{
            font: "600 22px/1.2 'Cormorant Garamond', serif",
            color: INK,
            marginTop: 8,
          }}
        >
          Sabiedrība ar ierobežotu atbildību <span style={{ fontWeight: 700 }}>“SHAKUR”</span>
        </div>
      </div>

      <SectionHeader>Rekvizīti</SectionHeader>
      <Grid mb={20}>
        <Row k="Reģ. Nr." v="51203071901" mono />
        <Row k="PVN maksātāja Nr." v="LV51203071901" mono />
        <Row k="Juridiskā adrese" v={LEGAL_ADDRESS} />
      </Grid>

      <SectionHeader>Banka</SectionHeader>
      <Grid>
        <Row k="Banka" v="AS “SWEDBANK”" />
        <Row k="BIC / S.W.I.F.T." v="HABALV22" mono />
        <Row k="Norēķinu konts" v={IBAN} mono />
      </Grid>
    </Card>
  );
}

export function RequisitesBlock({
  variant,
  shadow = true,
  onLogoFallback,
}: {
  variant: RequisitesVariant;
  shadow?: boolean;
  onLogoFallback?: () => void;
}) {
  return variant === 'full' ? (
    <RequisitesFull shadow={shadow} onLogoFallback={onLogoFallback} />
  ) : (
    <RequisitesCompact shadow={shadow} onLogoFallback={onLogoFallback} />
  );
}
