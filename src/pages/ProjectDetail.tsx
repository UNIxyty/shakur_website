import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../lang';
import { useProjects } from '../lib/useProjects';
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

/** ShakurProjectDetail.dc.html — header → gallery → scope → body + aside → CTA. */

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLang();
  const { projects, loading } = useProjects();

  const proj = projects.find((p) => p.slug === slug);
  const lb = useLightbox(proj?.media.length ?? 0);

  // Don't flash a 404 while the Supabase query is still in flight.
  if (!proj) return loading ? <div style={{ minHeight: '60vh' }} /> : <NotFound />;

  const title = pick(proj.i18n.title, lang);
  const summary = pick(proj.i18n.summary, lang);
  const paragraphs = pick(proj.i18n.description, lang).split('\n\n').filter(Boolean);
  const mediaSummary = mediaLabel(proj.media, t);
  const statusLabel =
    proj.status === 'Completed'
      ? t.status_completed
      : proj.status === 'In Progress'
        ? t.status_in_progress
        : t.status_paused;
  const endYear = proj.end_date ? proj.end_date.slice(0, 4) : '—';
  const location = [proj.city, proj.country].filter((v) => v && v !== '—').join(', ') || proj.country;

  const facts = [
    { label: t.f_client, value: proj.client },
    { label: t.pd_f_location, value: location },
    { label: t.pd_f_completed, value: endYear },
    { label: t.pd_f_site, value: proj.loc },
  ].filter((f) => f.value);

  return (
    <div>
      {/* ---------- GRAPHIC HEADER ---------- */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1F1408 0%, #160C00 52%, #0C0700 100%)' }}
        aria-labelledby="proj-title"
      >
        <HeaderBackdrop variant="detail" initial={title.charAt(0)} />
        <div className="relative mx-auto w-full" style={{ maxWidth: 1320, padding: '40px 30px 64px' }}>
          <Link
            to="/projects"
            className="inline-flex items-center font-medium transition-colors hover:text-white"
            style={{ gap: 8, color: 'rgba(255,255,255,0.78)', fontSize: 14, marginBottom: 40 }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t.pd_all_projects}
          </Link>
          <div className="flex flex-wrap items-center" style={{ gap: 12, marginBottom: 18 }}>
            <span
              className="inline-flex items-center bg-orange text-ink font-bold uppercase"
              style={{ gap: 7, fontSize: 13, letterSpacing: '0.4px', padding: '5px 12px', borderRadius: 999 }}
            >
              {statusLabel}
            </span>
            <span
              className="inline-flex items-center font-medium"
              style={{ gap: 7, color: 'rgba(255,255,255,0.72)', fontSize: 14 }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {proj.loc}
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
            id="proj-title"
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
        <GalleryGrid media={proj.media} videoChip={t.sd_video} onOpen={lb.show} />
      </section>

      {/* ---------- SCOPE OF WORK ---------- */}
      {proj.scope.items.length > 0 && (
        <NumberedCardBand
          eyebrow={t.pd_scope_eyebrow}
          title={pick(proj.scope.title, lang)}
          intro={pick(proj.scope.intro, lang)}
          items={proj.scope.items}
          lang={lang}
        />
      )}

      {/* ---------- BODY ---------- */}
      <section className="mx-auto" style={{ maxWidth: 1320, padding: '72px 30px 40px' }}>
        <div className="grid items-start min-[901px]:grid-cols-[1fr_340px]" style={{ gap: 56 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={rvViewport} variants={rv26}>
            <h2
              className="m-0 font-serif font-semibold"
              style={{ marginBottom: 22, fontSize: 34, letterSpacing: '-0.8px' }}
            >
              {t.pd_about}
            </h2>
            <div style={{ fontSize: 17, lineHeight: 1.8, color: '#3B3733' }}>
              {paragraphs.map((p, i) => (
                <p key={i} className="m-0" style={{ marginBottom: 20 }}>
                  {p}
                </p>
              ))}
            </div>
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
              style={{ fontSize: 13, letterSpacing: '0.5px', marginBottom: 16 }}
            >
              {t.pd_details}
            </div>
            <div className="flex flex-col" style={{ gap: 14, marginBottom: 22 }}>
              {facts.map((f) => (
                <div key={f.label} className="flex items-center" style={{ gap: 12 }}>
                  <span
                    className="flex shrink-0 items-center justify-center bg-peach text-orange"
                    style={{ width: 34, height: 34, borderRadius: 9 }}
                  >
                    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-placeholder" style={{ fontSize: 12 }}>
                      {f.label}
                    </div>
                    <div className="font-semibold" style={{ fontSize: 15 }}>
                      {f.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/contact"
              className="flex items-center justify-center bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover hover:text-ink"
              style={{
                gap: 10,
                fontSize: 16,
                padding: 15,
                borderRadius: 12,
                boxShadow: '0 10px 24px rgba(228,163,0,0.35)',
              }}
            >
              {t.pd_start_similar}
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#160C00" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </motion.aside>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <DetailCtaBand
        variant="texture"
        title={t.pd_cta_title}
        sub={t.detail_cta_sub}
        btnLabel={t.sp_cta_btn}
        to="/contact"
      />

      {/* ---------- LIGHTBOX ---------- */}
      <AnimatePresence>
        {lb.open && (
          <DetailLightbox media={proj.media} index={lb.index} title={title} onClose={lb.close} onStep={lb.step} />
        )}
      </AnimatePresence>
    </div>
  );
}
