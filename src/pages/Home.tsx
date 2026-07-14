import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { localizeService, SERVICES, LOGOS_ROW1, LOGOS_ROW2, SPACE_LABELS } from '../data';
import { useProjects } from '../lib/useProjects';
import { gradients } from '../tokens';
import { ArrowRight, Check, ChevronRight, Pin, GridIcon, FinishIcon, TeamIcon, GearIcon } from '../components/icons';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import Marquee from '../components/Marquee';
import FaqSection from '../components/FaqSection';
import CtaSection from '../components/CtaSection';
import { tapPress } from '../motion';
import { bgImage, assetUrl } from '../lib/assets';

export default function Home() {
  const { t } = useLang();
  const { projects } = useProjects();
  const services = SERVICES.map((s) => localizeService(s, t));

  const valueProps = [
    { t: t.pi_t, d: t.pi_d },
    { t: t.bis_t, d: t.bis_d },
    { t: t.fast_t, d: t.fast_d },
    { t: t.stress_t, d: t.stress_d },
  ];

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
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden" aria-labelledby="hero-title">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: bgImage('images/home-hero.jpg'),
            backgroundSize: 'cover',
            backgroundPosition: '50% 40%',
          }}
        />
        <div className="absolute inset-0" style={{ background: gradients.heroScrim }} />

        <div
          className="relative mx-auto flex flex-wrap items-center justify-between"
          style={{ maxWidth: 1320, padding: '96px 30px 104px', gap: 48 }}
        >
          <RevealGroup
            className="flex flex-col"
            style={{ flex: 1, minWidth: 280, maxWidth: 680, gap: 16 }}
            gap={0.12}
          >
            <RevealItem
              as="h1"
              id="hero-title"
              className="m-0 font-serif font-bold text-white text-hero-title"
            >
              {t.hero_title}
            </RevealItem>
            <RevealItem
              as="p"
              className="m-0 text-on-dark"
              style={{ fontSize: 17, lineHeight: 1.75, maxWidth: 560 }}
            >
              {t.hero_sub}
            </RevealItem>
          </RevealGroup>

          <Reveal
            as="form"
            onSubmit={(e: React.FormEvent) => e.preventDefault()}
            className="flex flex-col bg-white"
            style={{
              width: 452,
              maxWidth: '100%',
              borderRadius: 16,
              padding: 30,
              gap: 16,
              boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
            }}
            delay={0.15}
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
                placeholder={t.ph_email}
                className="outline-none"
                style={{
                  border: '1px solid #E7E5E4',
                  borderRadius: 10,
                  padding: '13px 14px',
                  fontSize: 15,
                  background: '#FAFAF9',
                }}
              />
            </label>

            <label className="flex flex-col text-ink font-medium" style={{ gap: 7, fontSize: 14 }}>
              {t.form_phone}
              <input
                type="tel"
                placeholder={t.ph_phone}
                className="outline-none"
                style={{
                  border: '1px solid #E7E5E4',
                  borderRadius: 10,
                  padding: '13px 14px',
                  fontSize: 15,
                  background: '#FAFAF9',
                }}
              />
            </label>

            <div className="flex" style={{ gap: 12, marginTop: 4 }}>
              <motion.div whileTap={tapPress} style={{ flex: 1 }}>
                <Link
                  to="/contact"
                  className="block text-center bg-orange text-ink font-semibold transition-colors duration-200 hover:bg-orange-hover hover:text-ink"
                  style={{ fontSize: 14, padding: '13px 10px', borderRadius: 10 }}
                >
                  {t.nav_cta}
                </Link>
              </motion.div>
              <motion.div whileTap={tapPress} style={{ flex: 1 }}>
                <Link
                  to="/contact"
                  className="block text-center bg-yellow text-ink font-semibold transition-colors duration-200 hover:bg-yellow-hover hover:text-ink"
                  style={{ fontSize: 14, padding: '13px 10px', borderRadius: 10 }}
                >
                  {t.form_book}
                </Link>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- TRUST LOGOS ---------- */}
      <section className="bg-white" style={{ padding: '44px 0 28px' }} aria-label="Partners">
        <div className="mx-auto" style={{ maxWidth: 1200, padding: '0 24px' }}>
          <div style={{ marginBottom: 30 }}>
            <Marquee logos={LOGOS_ROW1} direction="left" label={t.partner_row1} />
          </div>
          <Marquee logos={LOGOS_ROW2} direction="right" label={t.partner_row2} />
        </div>
      </section>

      {/* ---------- YOUR PARTNER ---------- */}
      <section className="bg-white" style={{ padding: '80px 30px' }} aria-labelledby="value-title">
        <div
          className="mx-auto flex flex-wrap items-center"
          style={{ maxWidth: 1320, gap: 64 }}
        >
          <Reveal style={{ flex: 1, minWidth: 280 }}>
            <div style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '4 / 3.4' }}>
              <img
                src={assetUrl("images/home-interior.png")}
                alt="Interior finishing"
                className="block w-full h-full object-cover"
              />
            </div>
          </Reveal>

          <RevealGroup
            className="flex flex-col"
            style={{ flex: 1, minWidth: 280, gap: 26 }}
            gap={0.08}
          >
            <RevealItem
              as="h2"
              id="value-title"
              className="m-0 font-semibold text-section-title"
            >
              {t.value_title}
            </RevealItem>

            <div className="flex flex-col" style={{ gap: 20 }}>
              {valueProps.map((v) => (
                <RevealItem key={v.t} style={{ borderTop: '1px solid #EAEAE8', paddingTop: 18 }}>
                  <h3
                    className="flex items-center font-semibold"
                    style={{ margin: '0 0 5px', fontSize: 18, gap: 9 }}
                  >
                    <Check size={18} />
                    {v.t}
                  </h3>
                  <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                    {v.d}
                  </p>
                </RevealItem>
              ))}
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ---------- FROM CONCEPT TO COMPLETION ---------- */}
      <section
        className="bg-white"
        style={{ padding: '40px 30px 90px' }}
        aria-labelledby="concept-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1320 }}>
          <Reveal
            as="h2"
            id="concept-title"
            className="m-0 text-center font-semibold text-section-title"
            style={{ marginBottom: 44 }}
          >
            {t.concept_title}
          </Reveal>

          <RevealGroup
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
              gap: 20,
            }}
            gap={0.07}
          >
            {services.map((svc) => (
              <RevealItem key={svc.slug}>
                <Link
                  to={`/services/${svc.detail}`}
                  className="group relative block overflow-hidden text-white hover:text-white"
                  style={{ aspectRatio: '1.42', borderRadius: 16 }}
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
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ---------- FROM PLANNING TO PERFECTION ---------- */}
      <section
        className="bg-surface"
        style={{ padding: '92px 30px' }}
        aria-labelledby="planning-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1180 }}>
          <Reveal
            as="h2"
            id="planning-title"
            className="m-0 text-center font-semibold text-section-title"
            style={{ marginBottom: 60 }}
          >
            {t.planning_title}
          </Reveal>

          <RevealGroup
            className="relative grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))',
              gap: 32,
            }}
            gap={0.1}
          >
            {planning.map((p) => (
              <RevealItem key={p.n} className="flex flex-col items-start" style={{ gap: 16 }}>
                <div
                  className="flex items-center justify-center bg-orange text-ink font-bold"
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
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ---------- SEE THE SPACES ---------- */}
      <section className="bg-ink" style={{ padding: '92px 30px' }} aria-labelledby="spaces-title">
        <div className="mx-auto" style={{ maxWidth: 1320 }}>
          <Reveal
            as="h2"
            id="spaces-title"
            className="m-0 text-center font-semibold text-white text-section-title"
            style={{ marginBottom: 48 }}
          >
            {t.spaces_title}
          </Reveal>

          <RevealGroup
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
              gap: 20,
            }}
            gap={0.07}
          >
            {projects.map((sp) => (
              <RevealItem key={sp.slug}>
                <Link
                  to={`/projects/${sp.slug}`}
                  className="group relative block overflow-hidden"
                  style={{ aspectRatio: '1.55', borderRadius: 14 }}
                >
                  <div
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: bgImage(sp.space_img),
                      backgroundSize: 'cover',
                      backgroundPosition: '50% 50%',
                    }}
                  />
                  <div className="absolute inset-0" style={{ background: gradients.spaceCard }} />
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
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal className="flex justify-center" style={{ marginTop: 40 }}>
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
          </Reveal>
        </div>
      </section>

      {/* ---------- RELIABLE PARTNER ---------- */}
      <section
        className="bg-white"
        style={{ padding: '92px 30px' }}
        aria-labelledby="reliable-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <Reveal
            as="h2"
            id="reliable-title"
            className="m-0 text-center font-semibold text-section-title"
            style={{ marginBottom: 48 }}
          >
            {t.reliable_title}
          </Reveal>

          <RevealGroup
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
              gap: 18,
            }}
            gap={0.08}
          >
            {reliable.map(({ Icon, t: title, d }) => (
              <RevealItem
                key={title}
                className="flex flex-col bg-surface"
                style={{
                  border: '1px solid #EAEAE8',
                  borderRadius: 16,
                  padding: 30,
                  gap: 14,
                }}
              >
                <Icon size={30} />
                <h3 className="m-0 font-semibold" style={{ fontSize: 19 }}>
                  {title}
                </h3>
                <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                  {d}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <FaqSection />
      <CtaSection />
    </div>
  );
}
