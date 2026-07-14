import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../lang';
import { useServices } from '../lib/useServices';
import { pick } from '../lib/db';
import NotFound from './NotFound';
import {
  CameraGlyph,
  DetailCtaBand,
  DetailLightbox,
  GalleryGrid,
  HeaderBackdrop,
  mediaLabel,
  NumberedCardBand,
  rv26,
  rvViewport,
  useLightbox,
} from '../components/DetailSections';

/** ShakurServiceDetail.dc.html — header → gallery → capabilities → body → CTA. */

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { services, loading } = useServices();

  const svc = services.find((s) => s.slug === slug && s.published);
  const lb = useLightbox(svc?.media.length ?? 0);

  // Don't flash a 404 while the Supabase query is still in flight.
  if (!svc) return loading ? <div style={{ minHeight: '60vh' }} /> : <NotFound />;

  const title = pick(svc.i18n.title, lang);
  const summary = pick(svc.i18n.summary, lang);
  const paragraphs = pick(svc.i18n.description, lang).split('\n\n').filter(Boolean);
  const ctaLabel = pick(svc.cta_label, lang) || t.sd_book;
  const mediaSummary = mediaLabel(svc.media, t);
  const catLabel =
    svc.category === 'Construction'
      ? t.cat_construction
      : svc.category === 'Finishing'
        ? t.cat_finishing
        : t.cat_support;
  const [ctaPre, ctaPost] = t.sd_cta_title.split('{title}');

  return (
    <div>
      {/* ---------- GRAPHIC HEADER ---------- */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1F1408 0%, #160C00 52%, #0C0700 100%)' }}
        aria-labelledby="svc-title"
      >
        <HeaderBackdrop variant="detail" initial={title.charAt(0)} />
        <div className="relative mx-auto w-full" style={{ maxWidth: 1320, padding: '40px 30px 64px' }}>
          <Link
            to="/services"
            className="inline-flex items-center font-medium transition-colors hover:text-white"
            style={{ gap: 8, color: 'rgba(255,255,255,0.78)', fontSize: 14, marginBottom: 40 }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t.sd_all_services}
          </Link>
          <div className="flex items-center" style={{ gap: 12, marginBottom: 18 }}>
            <span
              className="inline-flex items-center bg-orange text-ink font-bold uppercase"
              style={{ gap: 7, fontSize: 13, letterSpacing: '0.4px', padding: '5px 12px', borderRadius: 999 }}
            >
              {catLabel}
            </span>
            <span
              className="inline-flex items-center font-medium"
              style={{ gap: 7, color: 'rgba(255,255,255,0.72)', fontSize: 14 }}
            >
              <CameraGlyph size={15} />
              {mediaSummary}
            </span>
          </div>
          <h1
            id="svc-title"
            className="m-0 font-serif font-bold text-white"
            style={{
              maxWidth: 900,
              fontSize: 'clamp(46px, 8vw, 92px)',
              lineHeight: 0.97,
              letterSpacing: '-1.6px',
            }}
          >
            {title}
          </h1>
          <p
            className="m-0"
            style={{ margin: '20px 0 0', maxWidth: 620, fontSize: 18, lineHeight: 1.6, color: 'rgba(255,255,255,0.82)' }}
          >
            {summary}
          </p>
        </div>
      </section>

      {/* ---------- GALLERY ---------- */}
      <section className="mx-auto" style={{ maxWidth: 1320, padding: '64px 30px 80px' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={rvViewport}
          variants={rv26}
          className="flex items-baseline justify-between"
          style={{ gap: 20, marginBottom: 26 }}
        >
          <h2 className="m-0 font-serif font-semibold" style={{ fontSize: 34, letterSpacing: '-0.8px' }}>
            {t.sd_gallery}
          </h2>
          <span className="text-placeholder" style={{ fontSize: 14 }}>
            {mediaSummary}
          </span>
        </motion.div>
        <GalleryGrid media={svc.media} videoChip={t.sd_video} onOpen={lb.show} />
      </section>

      {/* ---------- CAPABILITIES ---------- */}
      <NumberedCardBand
        eyebrow={t.sd_cap_eyebrow}
        title={pick(svc.capabilities.title, lang)}
        intro={pick(svc.capabilities.intro, lang)}
        items={svc.capabilities.items}
        lang={lang}
      />

      {/* ---------- BODY ---------- */}
      <section className="mx-auto" style={{ maxWidth: 1320, padding: '72px 30px 40px' }}>
        <div className="grid items-start min-[901px]:grid-cols-[1fr_340px]" style={{ gap: 56 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={rvViewport} variants={rv26}>
            <h2
              className="m-0 font-serif font-semibold"
              style={{ marginBottom: 22, fontSize: 34, letterSpacing: '-0.8px' }}
            >
              {t.sd_about}
            </h2>
            <div style={{ fontSize: 17, lineHeight: 1.8, color: '#3B3733' }}>
              {paragraphs.map((p, i) => (
                <p key={i} className="m-0" style={{ marginBottom: 20 }}>
                  {p}
                </p>
              ))}
            </div>
            {svc.extras.highlights.length > 0 && (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  marginTop: 32,
                }}
              >
                {svc.extras.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="bg-surface"
                    style={{ border: '1px solid #EAEAE8', borderRadius: 14, padding: 20 }}
                  >
                    <div
                      className="flex items-center justify-center bg-peach text-orange"
                      style={{ width: 38, height: 38, borderRadius: 10, marginBottom: 12 }}
                    >
                      <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div className="font-bold" style={{ fontSize: 15, marginBottom: 4 }}>
                      {pick(h.title, lang)}
                    </div>
                    <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                      {pick(h.desc, lang)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.aside
            initial="hidden"
            whileInView="visible"
            viewport={rvViewport}
            variants={rv26}
            className="bg-white min-[901px]:sticky min-[901px]:top-[96px]"
            style={{
              border: '1px solid #EAEAE8',
              borderRadius: 18,
              padding: 26,
              boxShadow: '0 18px 44px rgba(22,12,0,0.08)',
            }}
          >
            <div
              className="font-semibold uppercase text-placeholder"
              style={{ fontSize: 13, letterSpacing: '0.5px', marginBottom: 6 }}
            >
              {t.sd_get_started}
            </div>
            <div
              className="font-serif font-bold"
              style={{ fontSize: 30, letterSpacing: '-0.6px', lineHeight: 1.08, marginBottom: 18 }}
            >
              {t.sd_free_consult}
            </div>
            <Link
              to={svc.cta_link || '/contact'}
              className="flex items-center justify-center bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover hover:text-ink"
              style={{
                gap: 10,
                fontSize: 16,
                padding: 15,
                borderRadius: 12,
                boxShadow: '0 10px 24px rgba(228,163,0,0.35)',
              }}
            >
              {ctaLabel}
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#160C00" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <div className="flex flex-col" style={{ marginTop: 22, gap: 14 }}>
              {svc.extras.facts.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center"
                  style={{ gap: 12, paddingTop: 14, borderTop: '1px solid #F2F1EF' }}
                >
                  <span className="flex shrink-0 text-orange">
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-placeholder" style={{ fontSize: 12 }}>
                      {pick(f.label, lang)}
                    </div>
                    <div className="font-semibold" style={{ fontSize: 15 }}>
                      {pick(f.value, lang)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <DetailCtaBand
        variant="photo"
        title={
          <>
            {ctaPre}
            {title.toLowerCase()}
            {ctaPost}
          </>
        }
        sub={t.detail_cta_sub}
        btnLabel={ctaLabel}
        to={svc.cta_link || '/contact'}
      />

      {/* ---------- LIGHTBOX ---------- */}
      <AnimatePresence>
        {lb.open && (
          <DetailLightbox media={svc.media} index={lb.index} title={title} onClose={lb.close} onStep={lb.step} />
        )}
      </AnimatePresence>
    </div>
  );
}
