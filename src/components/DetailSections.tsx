import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import type { Capability, L10n, Lang, MediaItem } from '../lib/db';
import { pick, mediaCounts } from '../lib/db';
import type { Dict } from '../i18n';
import { assetUrl, bgImage } from '../lib/assets';

/**
 * Shared building blocks for the v2 detail pages
 * (ShakurServiceDetail.dc.html / ShakurProjectDetail.dc.html — the two designs
 * are structurally identical, so the gallery, lightbox, numbered-card band,
 * and CTA bands live here once).
 */

/** The design's `.rv` reveal: opacity 0 / y 26px → in, .7s cubic-bezier(0.22,1,0.36,1). */
export const rv26: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export const rvViewport = { once: true, amount: 0.12 } as const;

/** Localized "3 images · 1 video" label. */
export function mediaLabel(media: MediaItem[], t: Dict): string {
  const { images, videos } = mediaCounts(media);
  const parts: string[] = [];
  if (images) parts.push(`${images} ${images === 1 ? t.mc_image : t.mc_images}`);
  if (videos) parts.push(`${videos} ${videos === 1 ? t.mc_video : t.mc_videos}`);
  return parts.join(' · ');
}

/** Camera glyph used by the media-count chips (verbatim from the design). */
export const CameraGlyph = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const ArrowGlyph = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#160C00"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/** Grid texture + orange radial glow + circle ring + rotated square + faint monogram. */
export function HeaderBackdrop({ variant, initial }: { variant: 'index' | 'detail'; initial?: string }) {
  const detail = variant === 'detail';
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          WebkitMaskImage: 'linear-gradient(120deg, #000 20%, transparent 78%)',
          maskImage: 'linear-gradient(120deg, #000 20%, transparent 78%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: -180,
          right: -140,
          width: 560,
          height: 560,
          background: 'radial-gradient(circle, rgba(251,133,0,0.30), transparent 62%)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          right: 48,
          bottom: detail ? -150 : -160,
          width: detail ? 360 : 380,
          height: detail ? 360 : 380,
          border: '1.5px solid rgba(251,133,0,0.4)',
        }}
      />
      <div
        className="absolute"
        style={{
          right: detail ? 150 : 170,
          top: detail ? 44 : 50,
          width: 128,
          height: 128,
          border: '1.5px solid rgba(255,255,255,0.12)',
          transform: 'rotate(20deg)',
        }}
      />
      {initial && (
        <span
          className="pointer-events-none absolute select-none font-serif font-bold"
          style={{
            right: 40,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 400,
            lineHeight: 0.7,
            color: 'rgba(255,255,255,0.045)',
          }}
        >
          {initial}
        </span>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Gallery grid — lead item 21/9 spanning the full row; ≤900px 2 cols (lead
// spans 2); ≤560px 1 col. Videos show a white play circle + "Video" chip.
// ---------------------------------------------------------------------------

export function GalleryGrid({
  media,
  videoChip,
  onOpen,
}: {
  media: MediaItem[];
  videoChip: string;
  onOpen: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[561px]:grid-cols-2 min-[901px]:grid-cols-3">
      {media.map((m, i) => {
        const lead = i === 0;
        return (
          <motion.div
            key={m.id || i}
            initial="hidden"
            whileInView="visible"
            viewport={rvViewport}
            variants={rv26}
            onClick={() => onOpen(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(i);
              }
            }}
            className={`group relative cursor-pointer overflow-hidden ${
              lead ? 'min-[561px]:col-span-2 min-[901px]:col-span-3' : ''
            }`}
            style={{ aspectRatio: lead ? '21 / 9' : '4 / 3', borderRadius: 16, background: '#F0EFEC' }}
          >
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{
                backgroundImage: bgImage(m.poster || m.src),
                backgroundSize: 'cover',
                backgroundPosition: '50% 50%',
              }}
            />
            {m.type === 'video' && (
              <>
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.4))' }}
                />
                <span
                  className="absolute flex items-center justify-center rounded-full text-ink"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 62,
                    height: 62,
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }} aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </span>
                <span
                  className="absolute text-white font-semibold"
                  style={{
                    bottom: 12,
                    left: 12,
                    background: 'rgba(22,12,0,0.72)',
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {videoChip}
                </span>
              </>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbox — prev/next, keyboard arrows, Esc, "2 / 6" counter, video playback
// with poster. Design source: the LIGHTBOX block of both detail .dc.html files.
// ---------------------------------------------------------------------------

const lbBtn: React.CSSProperties = {
  border: 'none',
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  cursor: 'pointer',
};

export function DetailLightbox({
  media,
  index,
  title,
  onClose,
  onStep,
}: {
  media: MediaItem[];
  index: number;
  title: string;
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onStep]);

  const item = media[index] ?? media[0];
  if (!item) return null;
  const isVideo = item.type === 'video';
  // Uploaded videos carry a real file in src (+ optional poster); seeds only
  // have a poster-style src, so the <video> shows its poster until sources exist.
  const posterSrc = assetUrl(item.poster || item.src);

  return (
    <motion.div
      ref={rootRef}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 flex items-center justify-center outline-none"
      style={{ zIndex: 200, background: 'rgba(8,5,1,0.92)' }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.25)]"
        style={{ ...lbBtn, top: 22, right: 22, width: 44, height: 44, borderRadius: 12 }}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <button
        onClick={() => onStep(-1)}
        aria-label="Previous"
        className="absolute flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(255,255,255,0.25)]"
        style={{ ...lbBtn, left: 22, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48 }}
      >
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        onClick={() => onStep(1)}
        aria-label="Next"
        className="absolute flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(255,255,255,0.25)]"
        style={{ ...lbBtn, right: 22, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48 }}
      >
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: 'min(1040px, 92vw)', maxHeight: '84vh' }}
      >
        {isVideo ? (
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: '16 / 9', background: '#000', borderRadius: 14 }}
          >
            <video
              controls
              poster={posterSrc}
              className="h-full w-full object-contain"
              style={{ background: '#000' }}
            >
              {/* Seed rows have no separate video file; uploaded rows do. */}
              {item.poster ? <source src={assetUrl(item.src)} type="video/mp4" /> : null}
            </video>
          </div>
        ) : (
          <img
            src={posterSrc}
            alt={title}
            className="block w-full object-contain"
            style={{ maxHeight: '84vh', borderRadius: 14 }}
          />
        )}
        <div className="text-center" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 14 }}>
          {index + 1} / {media.length}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Convenience hook: open/close/step state for the lightbox. */
export function useLightbox(count: number) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  return {
    open,
    index,
    show: (i: number) => {
      setIndex(i);
      setOpen(true);
    },
    close: () => setOpen(false),
    step: (d: 1 | -1) => setIndex((i) => (count ? (i + d + count) % count : 0)),
  };
}

// ---------------------------------------------------------------------------
// Numbered-card band (#F5F5F4) — "What we can do" / "Scope of work".
// ---------------------------------------------------------------------------

export function NumberedCardBand({
  eyebrow,
  title,
  intro,
  items,
  lang,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  items: Capability[];
  lang: Lang;
}) {
  return (
    <section className="bg-surface" style={{ borderTop: '1px solid #EAEAE8', borderBottom: '1px solid #EAEAE8' }}>
      <div className="mx-auto" style={{ maxWidth: 1320, padding: '72px 30px' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={rvViewport}
          variants={rv26}
          style={{ maxWidth: 720, marginBottom: 44 }}
        >
          <span
            className="inline-block font-bold uppercase text-orange"
            style={{ fontSize: 13, letterSpacing: '0.5px', marginBottom: 14 }}
          >
            {eyebrow}
          </span>
          <h2
            className="m-0 font-serif font-semibold"
            style={{
              marginBottom: 16,
              fontSize: 'clamp(30px, 4.4vw, 44px)',
              lineHeight: 1.05,
              letterSpacing: '-1px',
            }}
          >
            {title}
          </h2>
          <p className="m-0 text-muted" style={{ fontSize: 17, lineHeight: 1.7 }}>
            {intro}
          </p>
        </motion.div>

        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 18 }}
        >
          {items.map((c) => (
            <motion.div
              key={c.number}
              initial="hidden"
              whileInView="visible"
              viewport={rvViewport}
              variants={rv26}
              className="flex flex-col bg-white transition-colors hover:border-[#DAD7D3]"
              style={{ border: '1px solid #EAEAE8', borderRadius: 16, padding: 26, gap: 12 }}
            >
              <div className="flex items-center" style={{ gap: 12 }}>
                <span
                  className="flex shrink-0 items-center justify-center bg-peach font-bold text-orange"
                  style={{ width: 30, height: 30, borderRadius: 8, fontSize: 13 }}
                >
                  {c.number}
                </span>
                <h3 className="m-0 font-bold" style={{ fontSize: 17, letterSpacing: '-0.2px' }}>
                  {pick(c.title, lang)}
                </h3>
              </div>
              <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                {pick(c.description, lang)}
              </p>
              <ul className="m-0 flex list-none flex-col p-0" style={{ marginTop: 4, gap: 8 }}>
                {c.bullets.map((b: L10n, i: number) => (
                  <li
                    key={i}
                    className="flex items-start"
                    style={{ gap: 9, fontSize: 14, lineHeight: 1.5, color: '#3B3733' }}
                  >
                    <span className="flex shrink-0 text-orange" style={{ marginTop: 2 }}>
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {pick(b, lang)}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bottom CTA bands. 'texture' = dark grid texture + radial glow left
// (Services page + ProjectDetail); 'photo' = cta-meeting.jpg grayscale
// (ServiceDetail).
// ---------------------------------------------------------------------------

export function DetailCtaBand({
  variant,
  title,
  sub,
  btnLabel,
  to,
  marginTop,
}: {
  variant: 'texture' | 'photo';
  title: ReactNode;
  sub: string;
  btnLabel: string;
  to: string;
  marginTop?: number;
}) {
  const photo = variant === 'photo';
  return (
    <section className="relative overflow-hidden bg-ink" style={{ marginTop }}>
      {photo ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: bgImage('images/cta-meeting.jpg'),
              backgroundSize: 'cover',
              backgroundPosition: '60% 50%',
              filter: 'grayscale(1)',
              opacity: 0.85,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(10,7,3,0.94) 0%, rgba(10,7,3,0.72) 40%, rgba(10,7,3,0.1) 100%)',
            }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '46px 46px',
              WebkitMaskImage: 'linear-gradient(120deg, #000 10%, transparent 70%)',
              maskImage: 'linear-gradient(120deg, #000 10%, transparent 70%)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: -160,
              left: -120,
              width: 480,
              height: 480,
              background: 'radial-gradient(circle, rgba(251,133,0,0.24), transparent 62%)',
            }}
          />
        </>
      )}
      <div className="relative mx-auto" style={{ maxWidth: 1320, padding: photo ? '120px 30px' : '110px 30px' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={rvViewport}
          variants={rv26}
          className="flex flex-col items-start"
          style={{ maxWidth: 560, gap: 24 }}
        >
          <h2
            className="m-0 font-serif font-bold text-white"
            style={{ fontSize: 'clamp(36px, 6vw, 60px)', lineHeight: 1.02, letterSpacing: '-1px' }}
          >
            {title}
          </h2>
          <p className="m-0" style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,0.82)', maxWidth: 440 }}>
            {sub}
          </p>
          <Link
            to={to}
            className="inline-flex items-center bg-orange text-ink font-semibold transition-colors duration-200 hover:bg-orange-hover hover:text-ink"
            style={{
              gap: 10,
              fontSize: 16,
              padding: '15px 26px',
              borderRadius: 12,
              boxShadow: '0 10px 24px rgba(228,163,0,0.4)',
            }}
          >
            {btnLabel}
            <ArrowGlyph />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
