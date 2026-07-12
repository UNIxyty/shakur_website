import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../lang';
import { gradients } from '../tokens';
import { ChevronLeft, ChevronRight, Expand, PhotoIcon, Play, VideoIcon } from './icons';
import Lightbox, { type LbItem } from './Lightbox';
import { bgImage } from '../lib/assets';

export type GalleryVideo = { poster: string; dur: string; title: string };

/**
 * Photos/Videos gallery used on both detail pages.
 *
 * The design ships two size variants: the service page uses a 16/9 stage with 116x74
 * thumbs, the project page a 16/10 stage with 104x68 thumbs.
 */
export default function MediaGallery({
  images,
  videos,
  variant,
  title,
}: {
  images: string[];
  videos: GalleryVideo[];
  variant: 'service' | 'project';
  /**
   * When set, the tab strip is placed in a header row beside this heading — the
   * service page's layout. The project page omits it and stacks the tabs instead.
   */
  title?: string;
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<'images' | 'videos'>('images');
  const [index, setIndex] = useState(0);
  const [lb, setLb] = useState<{ mode: 'image' | 'video'; index: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const isService = variant === 'service';
  const stageRatio = isService ? '16 / 9' : '16 / 10';
  const thumbW = isService ? 116 : 104;
  const thumbH = isService ? 74 : 68;
  const videoMin = isService ? 280 : 240;
  const videoGap = isService ? 16 : 14;

  const safeIndex = Math.max(0, Math.min(index, images.length - 1));
  const main = images[safeIndex];

  const step = (i: number) => setIndex((i + images.length) % images.length);

  const lbItems: LbItem[] =
    lb?.mode === 'video'
      ? videos.map((v) => ({ kind: 'video', poster: v.poster, title: v.title }))
      : images.map((src) => ({ kind: 'image', poster: src, title: '' }));

  const tabBtn = (active: boolean) => ({
    background: active ? '#160C00' : 'transparent',
    color: active ? '#FFFFFF' : '#57534E',
  });

  const tabs = (
    <div
      className="inline-flex self-start"
      style={{
        background: isService ? '#FFFFFF' : '#F5F5F4',
        border: '1px solid #EAEAE8',
        borderRadius: 13,
        padding: 5,
        gap: 4,
      }}
      role="tablist"
      aria-label={t.m_gallery_t}
    >
      <button
        role="tab"
        aria-selected={tab === 'images'}
        onClick={() => setTab('images')}
        className="inline-flex cursor-pointer items-center border-0 font-semibold transition-colors duration-200"
        style={{ gap: 8, fontSize: 14, padding: '9px 15px', borderRadius: 9, ...tabBtn(tab === 'images') }}
      >
        <PhotoIcon size={16} />
        {t.m_photos}
        <span style={{ opacity: 0.5, fontWeight: 500 }}>{images.length}</span>
      </button>
      <button
        role="tab"
        aria-selected={tab === 'videos'}
        onClick={() => setTab('videos')}
        className="inline-flex cursor-pointer items-center border-0 font-semibold transition-colors duration-200"
        style={{ gap: 8, fontSize: 14, padding: '9px 15px', borderRadius: 9, ...tabBtn(tab === 'videos') }}
      >
        <VideoIcon size={16} />
        {t.m_videos}
        <span style={{ opacity: 0.5, fontWeight: 500 }}>{videos.length}</span>
      </button>
    </div>
  );

  return (
    <>
      {title ? (
        <div
          className="flex flex-wrap items-center justify-between"
          style={{ gap: 18, marginBottom: 26 }}
        >
          <h2 id="svc-gallery-title" className="m-0 font-semibold text-gallery-title">
            {title}
          </h2>
          {tabs}
        </div>
      ) : (
        tabs
      )}

      <AnimatePresence mode="wait">
        {tab === 'images' ? (
          <motion.div
            key="images"
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col"
            style={{ gap: 14 }}
          >
            <div
              onClick={() => {
                setLb({ mode: 'image', index: safeIndex });
                setZoomed(false);
              }}
              className="relative overflow-hidden"
              style={{
                borderRadius: 16,
                aspectRatio: stageRatio,
                background: '#0C0C0C',
                cursor: 'zoom-in',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={main}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0"
                  style={{
                    backgroundImage: bgImage(main),
                    backgroundSize: 'cover',
                    backgroundPosition: '50% 50%',
                  }}
                />
              </AnimatePresence>

              <span
                className="pointer-events-none absolute inline-flex items-center font-medium text-white"
                style={{
                  top: 14,
                  right: 14,
                  gap: 6,
                  background: 'rgba(22,12,0,0.58)',
                  backdropFilter: 'blur(6px)',
                  fontSize: 12,
                  padding: '7px 11px',
                  borderRadius: 8,
                }}
              >
                <Expand size={14} />
                {t.m_zoomhint}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(safeIndex - 1);
                }}
                aria-label="Previous"
                className="absolute flex cursor-pointer items-center justify-center border-0 hover:bg-white"
                style={{
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                }}
              >
                <ChevronLeft size={20} stroke="#160C00" strokeWidth={2.4} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(safeIndex + 1);
                }}
                aria-label="Next"
                className="absolute flex cursor-pointer items-center justify-center border-0 hover:bg-white"
                style={{
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                }}
              >
                <ChevronRight size={20} stroke="#160C00" strokeWidth={2.4} />
              </button>
            </div>

            <div className="flex overflow-x-auto" style={{ gap: 10, paddingBottom: 4 }}>
              {images.map((src, i) => {
                const active = i === safeIndex;
                return (
                  <button
                    key={`${src}-${i}`}
                    onClick={() => setIndex(i)}
                    aria-label={`Image ${i + 1}`}
                    aria-current={active}
                    className="relative shrink-0 cursor-pointer overflow-hidden border-0 p-0"
                    style={{ width: thumbW, height: thumbH, borderRadius: 8 }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: bgImage(src),
                        backgroundSize: 'cover',
                        backgroundPosition: '50% 50%',
                      }}
                    />
                    {!active && (
                      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
                    )}
                    {active && (
                      <div
                        className="absolute inset-0"
                        style={{ border: '3px solid #FB8500', borderRadius: 8 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="videos"
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(min(${videoMin}px, 100%), 1fr))`,
              gap: videoGap,
            }}
          >
            {videos.map((v, i) => (
              <button
                key={`${v.poster}-${i}`}
                onClick={() => {
                  setLb({ mode: 'video', index: i });
                  setZoomed(false);
                }}
                className="group relative cursor-pointer overflow-hidden border-0 p-0 text-left"
                style={{ aspectRatio: '16 / 10', borderRadius: 14 }}
              >
                <div
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: bgImage(v.poster),
                    backgroundSize: 'cover',
                    backgroundPosition: '50% 50%',
                  }}
                />
                <div className="absolute inset-0" style={{ background: gradients.videoCard }} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: isService ? 58 : 54,
                      height: isService ? 58 : 54,
                      borderRadius: '50%',
                      background: 'rgba(251,133,0,0.94)',
                      boxShadow: '0 10px 26px rgba(0,0,0,0.4)',
                    }}
                  >
                    <Play size={isService ? 22 : 20} />
                  </div>
                </div>
                <span
                  className="absolute font-semibold text-white"
                  style={{
                    top: isService ? 12 : 11,
                    right: isService ? 12 : 11,
                    background: 'rgba(22,12,0,0.72)',
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 6,
                  }}
                >
                  {v.dur}
                </span>
                <span
                  className="absolute font-semibold text-white"
                  style={{
                    left: isService ? 15 : 14,
                    bottom: isService ? 13 : 12,
                    fontSize: isService ? 15 : 14,
                  }}
                >
                  {v.title}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lb && (
          <Lightbox
            items={lbItems}
            index={lb.index}
            zoomed={zoomed}
            onIndex={(i) => {
              setLb({ ...lb, index: i });
              setZoomed(false);
            }}
            onToggleZoom={() => setZoomed((z) => !z)}
            onClose={() => {
              setLb(null);
              setZoomed(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
