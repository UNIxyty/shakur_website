import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { Close, ChevronLeft, ChevronRight, Play, ZoomIn } from './icons';
import { assetUrl, bgImage } from '../lib/assets';

export type LbItem = { kind: 'image' | 'video'; poster: string; title: string };

type Props = {
  items: LbItem[];
  index: number;
  zoomed: boolean;
  onIndex: (i: number) => void;
  onToggleZoom: () => void;
  onClose: () => void;
};

/** Full-screen media viewer. Images can be zoomed; videos show the design's poster state. */
export default function Lightbox({ items, index, zoomed, onIndex, onToggleZoom, onClose }: Props) {
  const { t } = useLang();

  const len = items.length || 1;
  const i = Math.max(0, Math.min(index, len - 1));
  const cur = items[i];

  const prev = () => onIndex((i - 1 + len) % len);
  const next = () => onIndex((i + 1) % len);

  // Escape closes; arrows page. The design binds Escape at the app level, but keeping
  // it here means the lightbox owns its own keyboard contract.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Lock body scroll while open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!cur) return null;

  const isVideo = cur.kind === 'video';

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={cur.title || 'Media viewer'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 10000, background: 'rgba(10,7,4,0.95)' }}
    >
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '18px 22px' }}
      >
        <span
          className="font-semibold"
          style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, letterSpacing: '0.03em' }}
        >
          {i + 1} / {len}
        </span>

        <div className="flex" style={{ gap: 10 }}>
          {!isVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleZoom();
              }}
              aria-label="Zoom"
              className="flex cursor-pointer items-center justify-center border-0 text-white transition-colors"
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.12)',
              }}
            >
              <ZoomIn size={20} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            className="flex cursor-pointer items-center justify-center border-0 text-white transition-colors"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
            }}
          >
            <Close size={20} stroke="currentColor" />
          </button>
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-1 items-center justify-center"
        style={{ minHeight: 0, padding: '0 12px' }}
      >
        <button
          onClick={prev}
          aria-label="Previous"
          className="absolute flex cursor-pointer items-center justify-center border-0 text-white"
          style={{
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 5,
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
          }}
        >
          <ChevronLeft size={24} strokeWidth={2.4} />
        </button>

        <button
          onClick={next}
          aria-label="Next"
          className="absolute flex cursor-pointer items-center justify-center border-0 text-white"
          style={{
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 5,
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
          }}
        >
          <ChevronRight size={24} stroke="currentColor" strokeWidth={2.4} />
        </button>

        {!isVideo && !zoomed && (
          <motion.img
            key={cur.poster}
            src={assetUrl(cur.poster)}
            alt={cur.title || ''}
            onClick={onToggleZoom}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
            style={{
              maxWidth: 'min(1240px, 86vw)',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: 8,
              cursor: 'zoom-in',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          />
        )}

        {!isVideo && zoomed && (
          <div style={{ maxWidth: '92vw', maxHeight: '84vh', overflow: 'auto', borderRadius: 8 }}>
            <img
              src={assetUrl(cur.poster)}
              alt={cur.title || ''}
              onClick={onToggleZoom}
              style={{ height: '150vh', width: 'auto', maxWidth: 'none', display: 'block', cursor: 'zoom-out' }}
            />
          </div>
        )}

        {isVideo && (
          <div
            className="relative overflow-hidden"
            style={{
              width: 'min(1100px, 88vw)',
              aspectRatio: '16 / 9',
              maxHeight: '80vh',
              borderRadius: 12,
              background: '#000',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: bgImage(cur.poster),
                backgroundSize: 'cover',
                backgroundPosition: '50% 50%',
                opacity: 0.55,
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: 16 }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  background: 'rgba(251,133,0,0.96)',
                  boxShadow: '0 12px 34px rgba(0,0,0,0.5)',
                }}
              >
                <Play size={28} />
              </div>
              <span
                className="font-medium uppercase"
                style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, letterSpacing: '0.04em' }}
              >
                {t.m_video_hint}
              </span>
            </div>
          </div>
        )}
      </div>

      {cur.title && (
        <div
          className="text-center shrink-0 font-medium"
          style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, padding: '12px 22px 22px' }}
        >
          {cur.title}
        </div>
      )}
    </motion.div>
  );
}
