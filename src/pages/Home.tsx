import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useLang } from '../lang';
import { SPACE_LABELS, coverSrc } from '../data';
import { useProjects } from '../lib/useProjects';
import { useServices } from '../lib/useServices';
import { useHome } from '../lib/useHome';
import { pick } from '../lib/db';
import { gradients } from '../tokens';
import { ArrowRight, Check, ChevronRight, Pin, GridIcon, FinishIcon, TeamIcon, GearIcon } from '../components/icons';
import { Reveal } from '../components/Reveal';
import Marquee from '../components/Marquee';
import FaqSection from '../components/FaqSection';
import CtaSection from '../components/CtaSection';
import BookingModal from '../components/BookingModal';
import ConsultationModal from '../components/ConsultationModal';
import { tapPress } from '../motion';
import { bgImage, assetUrl } from '../lib/assets';
import { useSiteChrome } from '../lib/useSiteChrome';

/** SHAKUR-Mobile: reveal-on-scroll is "retained but shortened for phones". */
const IS_PHONE =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 620px)').matches;

/**
 * v3 section reveal — the design's .shk-reveal: opacity 0.8s ease +
 * 30px rise 0.85s cubic-bezier(0.22,1,0.36,1). Every below-fold section
 * enters with this; prefers-reduced-motion is honoured by <MotionConfig>.
 * On phones the rise distance/duration shrink per the mobile spec.
 */
const sectionReveal: Variants = {
  hidden: { opacity: 0, y: IS_PHONE ? 18 : 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      opacity: { duration: IS_PHONE ? 0.55 : 0.8, ease: [0.25, 0.1, 0.25, 1] },
      y: { duration: IS_PHONE ? 0.6 : 0.85, ease: [0.22, 1, 0.36, 1] },
    },
  },
};

/* v5 legibility blur (site_settings.blur_sections via useSiteChrome().blur):
   the hero panel keeps the contract's 34px 40px padding on desktop and drops
   to 22px 20px on phones. */
const BLUR_CSS = `
  @media (max-width: 620px) {
    .shk-hero-blur { padding: 22px 20px !important; }
  }
`;

const heroBlurPanel: React.CSSProperties = {
  background: 'rgba(22,12,0,0.34)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  padding: '34px 40px',
  borderRadius: 22,
  width: 'fit-content',
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const projectBlurPanel: React.CSSProperties = {
  background: 'rgba(22,12,0,0.42)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  padding: '16px 22px',
  borderRadius: 16,
  maxWidth: '100%',
};

/* 46px-tall inputs (SHAKUR-Mobile hero note; matches the design's computed
   13px padding + 18px line = 46px box). */
const heroInputStyle: React.CSSProperties = {
  border: '1px solid #E7E5E4',
  borderRadius: 10,
  height: 46,
  padding: '0 14px',
  fontSize: 15,
  background: '#FAFAF9',
};

export default function Home() {
  const { t, lang } = useLang();
  const { projects } = useProjects();
  const { services } = useServices();
  const { content } = useHome();
  const chrome = useSiteChrome();

  // Hero form is controlled so "Request a Consultation" can pre-fill the modal.
  const [heroEmail, setHeroEmail] = useState('');
  const [heroPhone, setHeroPhone] = useState('');
  const [booking, setBooking] = useState(false);
  const [consult, setConsult] = useState(false);

  const homeServices = services.map((s) => ({
    slug: s.slug,
    title: pick(s.i18n.title, lang),
    desc: pick(s.i18n.summary, lang),
    img: coverSrc(s),
  }));

  const planning = [
    { n: 1, t: t.pl1_t, d: t.pl1_d },
    { n: 2, t: t.pl2_t, d: t.pl2_d },
    { n: 3, t: t.pl3_t, d: t.pl3_d },
    { n: 4, t: t.pl4_t, d: t.pl4_d },
  ];

  const reliable = [
    { Icon: GridIcon, t: t.rl1_t, d: t.rl1_d },
    { Icon: FinishIcon, t: t.rl2_t, d: t.rl2_d },
    { Icon: TeamIcon, t: t.rl3_t, d: t.rl3_d },
    { Icon: GearIcon, t: t.rl4_t, d: t.rl4_d },
  ];

  return (
    <div>
      {/* ---------- FIRST VIEWPORT: hero + partner-logo marquee ---------- */}
      <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 128px)' }}>
        {/* HERO */}
        <section
          className="relative flex items-center overflow-hidden"
          style={{ flex: 1 }}
          aria-labelledby="hero-title"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: bgImage(content.hero.image),
              backgroundSize: 'cover',
              backgroundPosition: '50% 40%',
            }}
          />
          <div className="absolute inset-0" style={{ background: gradients.heroScrim }} />

          <div
            className="relative mx-auto flex w-full flex-wrap items-center justify-between"
            style={{ maxWidth: 1320, padding: '56px 30px', gap: 48 }}
          >
            <div className="flex flex-col" style={{ flex: 1, minWidth: 280, maxWidth: 680, gap: 16 }}>
              {chrome.blur.hero ? (
                /* v5: legibility backdrop behind the headline (admin-toggled) */
                <>
                  <style>{BLUR_CSS}</style>
                  <div className="shk-hero-blur" style={heroBlurPanel}>
                    <h1 id="hero-title" className="m-0 font-serif font-bold text-white text-hero-title">
                      {pick(content.text.heroTitle, lang)}
                    </h1>
                    <p className="m-0 text-on-dark" style={{ fontSize: 17, lineHeight: 1.75, maxWidth: 560 }}>
                      {pick(content.text.heroSub, lang)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h1 id="hero-title" className="m-0 font-serif font-bold text-white text-hero-title">
                    {pick(content.text.heroTitle, lang)}
                  </h1>
                  <p className="m-0 text-on-dark" style={{ fontSize: 17, lineHeight: 1.75, maxWidth: 560 }}>
                    {pick(content.text.heroSub, lang)}
                  </p>
                </>
              )}
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col bg-white"
              style={{
                width: 452,
                maxWidth: '100%',
                borderRadius: 16,
                padding: 30,
                gap: 16,
                boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
              }}
            >
              <img
                src="/images/shakur-logo.svg"
                alt="SHAKUR"
                className="self-center"
                style={{ height: 20, marginBottom: 4, filter: 'brightness(0)' }}
              />

              <label className="flex flex-col text-ink font-medium" style={{ gap: 7, fontSize: 14 }}>
                {t.form_email}
                <input
                  type="email"
                  value={heroEmail}
                  onChange={(e) => setHeroEmail(e.target.value)}
                  placeholder={t.ph_email}
                  className="outline-none"
                  style={heroInputStyle}
                />
              </label>

              <label className="flex flex-col text-ink font-medium" style={{ gap: 7, fontSize: 14 }}>
                {t.form_phone}
                <input
                  type="tel"
                  value={heroPhone}
                  onChange={(e) => setHeroPhone(e.target.value)}
                  placeholder={t.ph_phone}
                  className="outline-none"
                  style={heroInputStyle}
                />
              </label>

              <div className="flex" style={{ gap: 12, marginTop: 4 }}>
                <motion.button
                  type="button"
                  whileTap={tapPress}
                  onClick={() => setConsult(true)}
                  className="m-cta cursor-pointer border-0 text-center bg-orange text-ink font-semibold transition-colors duration-200 hover:bg-orange-hover"
                  style={{ flex: 1, fontSize: 14, padding: '13px 10px', borderRadius: 10 }}
                >
                  {t.nav_cta}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={tapPress}
                  onClick={() => setBooking(true)}
                  className="m-cta cursor-pointer border-0 text-center bg-yellow text-ink font-semibold transition-colors duration-200 hover:bg-yellow-hover"
                  style={{ flex: 1, fontSize: 14, padding: '13px 10px', borderRadius: 10 }}
                >
                  {t.form_book}
                </motion.button>
              </div>
            </form>
          </div>
        </section>

        {/* TRUST LOGOS — pinned at the bottom of the first viewport */}
        <section className="shrink-0 bg-white" style={{ padding: '30px 0 24px' }} aria-label={t.a11y_partners}>
          {/* .mq-wrap: side padding drops on phones so the marquee runs edge-to-edge. */}
          <div className="mq-wrap mx-auto" style={{ maxWidth: 1200, padding: '0 24px' }}>
            <div style={{ marginBottom: 30 }}>
              <Marquee
                logos={chrome.logosRow1}
                direction="left"
                label={t.partner_row1}
                durationS={chrome.speedS}
              />
            </div>
            {/* Row 2 keeps the design's 25s/30s pace ratio at any configured speed. */}
            <Marquee
              logos={chrome.logosRow2}
              direction="right"
              label={t.partner_row2}
              durationS={(chrome.speedS * 25) / 30}
            />
          </div>
        </section>
      </div>

      {/* ---------- YOUR PARTNER ---------- */}
      <Reveal
        as="section"
        variants={sectionReveal}
        className="bg-white"
        style={{ padding: '80px 30px' }}
        aria-labelledby="value-title"
      >
        <div className="mx-auto flex flex-wrap items-center" style={{ maxWidth: 1320, gap: 64 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '4 / 3.4' }}>
              <img
                src={assetUrl(content.partner.image)}
                alt={t.alt_interior}
                className="block w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col" style={{ flex: 1, minWidth: 280, gap: 26 }}>
            <h2 id="value-title" className="m-0 font-semibold text-section-title">
              {pick(content.text.partnerTitle, lang)}
            </h2>

            <div className="flex flex-col" style={{ gap: 20 }}>
              {content.text.partnerItems.map((item, i) => (
                <div key={i} style={{ borderTop: '1px solid #EAEAE8', paddingTop: 18 }}>
                  <h3
                    className="flex items-center font-semibold"
                    style={{ margin: '0 0 5px', fontSize: 18, gap: 9 }}
                  >
                    <Check size={18} />
                    {pick(item.a, lang)}
                  </h3>
                  <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                    {pick(item.b, lang)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---------- FROM CONCEPT TO COMPLETION ---------- */}
      <Reveal
        as="section"
        variants={sectionReveal}
        className="bg-white"
        style={{ padding: '40px 30px 90px' }}
        aria-labelledby="concept-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1320 }}>
          <h2
            id="concept-title"
            className="m-0 text-center font-semibold text-section-title"
            style={{ marginBottom: 44 }}
          >
            {t.concept_title}
          </h2>

          {homeServices.length === 0 ? (
            <div
              className="mx-auto flex flex-col items-center text-center"
              style={{
                maxWidth: 560,
                border: '1.5px dashed #DDD9D4',
                borderRadius: 18,
                padding: '54px 30px',
                gap: 12,
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: 52, height: 52, borderRadius: 14, background: '#F5F5F4' }}
              >
                <svg
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A8A29E"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <h3 className="m-0 font-semibold" style={{ fontSize: 19 }}>
                {t.empty_svc_t}
              </h3>
              <p className="m-0" style={{ fontSize: 14.5, color: '#8A8580', maxWidth: 360, lineHeight: 1.55 }}>
                {t.empty_svc_d}
              </p>
            </div>
          ) : (
            /* Centred flex grid — stays intentional at 1/2/3/many items. */
            <div className="flex flex-wrap justify-center" style={{ gap: 20 }}>
              {homeServices.map((svc) => (
                <Link
                  key={svc.slug}
                  to={`/services/${svc.slug}`}
                  className="group relative block overflow-hidden text-white hover:text-white"
                  style={{ flex: '1 1 340px', maxWidth: 432, aspectRatio: '1.42', borderRadius: 16 }}
                >
                  <div
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: bgImage(svc.img),
                      backgroundSize: 'cover',
                      backgroundPosition: '50% 50%',
                    }}
                  />
                  <div className="absolute inset-0" style={{ background: gradients.serviceCard }} />
                  <div
                    className="absolute flex flex-col text-white"
                    style={{ left: 24, right: 24, bottom: 22, gap: 8 }}
                  >
                    <span
                      className="font-semibold"
                      style={{ fontSize: 24, lineHeight: 1.12, letterSpacing: '-0.5px' }}
                    >
                      {svc.title}
                    </span>
                    <span style={{ fontSize: 14, lineHeight: 1.5, color: '#E7E5E4' }}>
                      {svc.desc}
                    </span>
                    <span
                      className="inline-flex items-center font-semibold"
                      style={{ gap: 6, fontSize: 14, marginTop: 2 }}
                    >
                      {t.get_service} <ChevronRight size={15} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* ---------- FROM PLANNING TO PERFECTION ---------- */}
      <Reveal
        as="section"
        variants={sectionReveal}
        className="bg-surface"
        style={{ padding: '92px 30px' }}
        aria-labelledby="planning-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1180 }}>
          <h2
            id="planning-title"
            className="m-0 text-center font-semibold text-section-title"
            style={{ marginBottom: 60 }}
          >
            {t.planning_title}
          </h2>

          {/* .plan-grid/.plan-step: vertical timeline on phones (SHAKUR-Mobile). */}
          <div
            className="plan-grid relative grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: 32 }}
          >
            {planning.map((p) => (
              <div key={p.n} className="plan-step flex flex-col items-start" style={{ gap: 16 }}>
                <div
                  className="plan-num flex items-center justify-center bg-orange text-ink font-bold"
                  style={{ width: 34, height: 34, borderRadius: '50%', fontSize: 15 }}
                >
                  {p.n}
                </div>
                <h3 className="m-0 font-semibold" style={{ fontSize: 18 }}>
                  {p.t}
                </h3>
                <p className="m-0 text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {p.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ---------- SEE THE SPACES ---------- */}
      <Reveal
        as="section"
        variants={sectionReveal}
        className="bg-ink"
        style={{ padding: '92px 30px' }}
        aria-labelledby="spaces-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1320 }}>
          <h2
            id="spaces-title"
            className="m-0 text-center font-semibold text-white text-section-title"
            style={{ marginBottom: 48 }}
          >
            {t.spaces_title}
          </h2>

          {projects.length === 0 ? (
            <div
              className="mx-auto flex flex-col items-center text-center"
              style={{
                maxWidth: 560,
                border: '1.5px dashed rgba(255,255,255,0.18)',
                borderRadius: 18,
                padding: '54px 30px',
                gap: 12,
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.06)' }}
              >
                <Pin size={24} strokeWidth={1.8} />
              </div>
              <h3 className="m-0 font-semibold text-white" style={{ fontSize: 19 }}>
                {t.empty_proj_t}
              </h3>
              <p
                className="m-0"
                style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', maxWidth: 360, lineHeight: 1.55 }}
              >
                {t.empty_proj_d}
              </p>
            </div>
          ) : (
            <>
              {/* Centred flex grid — same intent rules as the services grid. */}
              <div className="flex flex-wrap justify-center" style={{ gap: 20 }}>
                {projects.map((sp) => (
                  <Link
                    key={sp.slug}
                    to={`/projects/${sp.slug}`}
                    className="group relative block overflow-hidden"
                    style={{ flex: '1 1 340px', maxWidth: 432, aspectRatio: '1.55', borderRadius: 14 }}
                  >
                    <div
                      className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: bgImage(sp.space_img || coverSrc(sp)),
                        backgroundSize: 'cover',
                        backgroundPosition: '50% 50%',
                      }}
                    />
                    <div className="absolute inset-0" style={{ background: gradients.spaceCard }} />
                    {chrome.blur.projects ? (
                      /* v5: caption panel — title + location on a blur backdrop */
                      <span
                        className="absolute flex"
                        style={{ left: 16, right: 16, bottom: 16, justifyContent: 'flex-start' }}
                      >
                        <span className="flex flex-col" style={projectBlurPanel}>
                          <span
                            className="text-white font-semibold"
                            style={{ fontSize: 21, lineHeight: 1.15, letterSpacing: '-0.5px' }}
                          >
                            {pick(sp.i18n.title, lang)}
                          </span>
                          <span style={{ fontSize: 13.5, color: '#E7E5E4', marginTop: 4 }}>
                            {SPACE_LABELS[sp.slug] ?? sp.loc}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span
                        className="absolute inline-flex items-center text-white font-medium"
                        style={{
                          left: 16,
                          bottom: 16,
                          gap: 7,
                          background: 'rgba(22,12,0,0.72)',
                          backdropFilter: 'blur(6px)',
                          fontSize: 13,
                          padding: '7px 12px',
                          borderRadius: 8,
                        }}
                      >
                        <Pin size={13} />
                        {SPACE_LABELS[sp.slug] ?? sp.loc}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              <div className="flex justify-center" style={{ marginTop: 40 }}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={tapPress}>
                  <Link
                    to="/projects"
                    className="inline-flex items-center bg-orange text-ink font-semibold transition-colors duration-200 hover:bg-orange-hover hover:text-ink"
                    style={{ gap: 9, fontSize: 15, padding: '13px 24px', borderRadius: 11 }}
                  >
                    {t.view_all}
                    <ArrowRight size={16} />
                  </Link>
                </motion.div>
              </div>
            </>
          )}
        </div>
      </Reveal>

      {/* ---------- RELIABLE PARTNER ---------- */}
      <Reveal
        as="section"
        variants={sectionReveal}
        className="bg-white"
        style={{ padding: '92px 30px' }}
        aria-labelledby="reliable-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <h2
            id="reliable-title"
            className="m-0 text-center font-semibold text-section-title"
            style={{ marginBottom: 48 }}
          >
            {t.reliable_title}
          </h2>

          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: 18 }}
          >
            {reliable.map(({ Icon, t: title, d }) => (
              <div
                key={title}
                className="m-cardpad flex flex-col bg-surface"
                style={{ border: '1px solid #EAEAE8', borderRadius: 16, padding: 30, gap: 14 }}
              >
                <Icon size={30} />
                <h3 className="m-0 font-semibold" style={{ fontSize: 19 }}>
                  {title}
                </h3>
                <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal variants={sectionReveal}>
        <FaqSection />
      </Reveal>
      <Reveal variants={sectionReveal}>
        <CtaSection
          title={pick(content.text.ctaTitle, lang)}
          sub={pick(content.text.ctaSub, lang)}
          btn={pick(content.text.ctaBtn, lang)}
          image={content.cta.image}
        />
      </Reveal>

      {/* ---------- OVERLAYS ---------- */}
      <AnimatePresence>
        {booking && <BookingModal onClose={() => setBooking(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {consult && (
          <ConsultationModal
            onClose={() => setConsult(false)}
            initialEmail={heroEmail}
            initialPhone={heroPhone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
