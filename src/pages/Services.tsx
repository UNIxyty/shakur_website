import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { useServices } from '../lib/useServices';
import { pick, type ServiceRow } from '../lib/db';
import { coverSrc } from '../data';
import { bgImage } from '../lib/assets';
import {
  CameraGlyph,
  DetailCtaBand,
  HeaderBackdrop,
  mediaLabel,
  rv26,
  rvViewport,
} from '../components/DetailSections';

/** ShakurServicesPage.dc.html — graphic header, filter chips, card grid, CTA. */

const CATEGORIES = ['All', 'Construction', 'Finishing', 'Support'] as const;
type Filter = (typeof CATEGORIES)[number];

export default function Services() {
  const { t, lang } = useLang();
  const { services, loading } = useServices();
  const [filter, setFilter] = useState<Filter>('All');

  const published = services.filter((s) => s.published);
  const list = filter === 'All' ? published : published.filter((s) => s.category === filter);

  const chipLabel = (c: Filter) =>
    c === 'All'
      ? t.sp_filter_all
      : c === 'Construction'
        ? t.cat_construction
        : c === 'Finishing'
          ? t.cat_finishing
          : t.cat_support;

  return (
    <div>
      {/* ---------- GRAPHIC PAGE HEADER ---------- */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1F1408 0%, #160C00 52%, #0C0700 100%)' }}
        aria-labelledby="services-title"
      >
        <HeaderBackdrop variant="index" />
        <div className="relative mx-auto w-full" style={{ maxWidth: 1320, padding: '68px 30px 72px' }}>
          <span
            className="inline-flex items-center font-bold uppercase"
            style={{
              gap: 7,
              background: 'rgba(251,133,0,0.16)',
              color: '#FFB703',
              fontSize: 13,
              letterSpacing: '0.5px',
              padding: '6px 13px',
              borderRadius: 999,
              marginBottom: 22,
            }}
          >
            {t.sp_eyebrow}
          </span>
          <h1
            id="services-title"
            className="hero-serif-clamp m-0 font-serif font-bold text-white"
            style={{
              maxWidth: 900,
              fontSize: 'clamp(48px, 8.5vw, 96px)',
              lineHeight: 0.96,
              letterSpacing: '-1.8px',
            }}
          >
            {t.sp_title}
          </h1>
          <p
            className="m-0"
            style={{
              margin: '20px 0 0',
              maxWidth: 600,
              fontSize: 18,
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.82)',
            }}
          >
            {t.sp_intro}
          </p>
        </div>
      </section>

      {/* ---------- GRID ---------- */}
      <section className="mx-auto" style={{ maxWidth: 1320, padding: '44px 30px 20px' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={rvViewport}
          variants={rv26}
          className="flex flex-wrap"
          style={{ gap: 10, marginBottom: 34 }}
        >
          {CATEGORIES.map((c) => {
            const active = filter === c;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                aria-pressed={active}
                className="m-chip cursor-pointer font-semibold transition-all duration-[180ms] hover:border-orange"
                style={{
                  border: `1px solid ${active ? '#160C00' : '#E7E5E4'}`,
                  background: active ? '#160C00' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#54504D',
                  fontSize: 14,
                  padding: '9px 16px',
                  borderRadius: 999,
                }}
              >
                {chipLabel(c)}
              </button>
            );
          })}
        </motion.div>

        {/* Empty state only after the query settles — no flash while loading
            (v5 contract §3); in-flight the grid area is simply blank. */}
        {!loading && list.length === 0 && (
          <div className="text-center text-placeholder" style={{ padding: '80px 24px' }}>
            <p className="m-0" style={{ fontSize: 16 }}>
              {t.sp_empty}
            </p>
          </div>
        )}

        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(390px, 100%), 1fr))', gap: 24 }}
        >
          {list.map((s: ServiceRow) => (
            <motion.div key={s.slug} initial="hidden" whileInView="visible" viewport={rvViewport} variants={rv26}>
              <Link
                to={`/services/${s.slug}`}
                className="group flex h-full flex-col overflow-hidden bg-white text-ink transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[5px] hover:border-[#DAD7D3] hover:text-ink hover:shadow-[0_20px_44px_rgba(22,12,0,0.14)] focus-visible:border-orange focus-visible:shadow-[0_0_0_3px_rgba(251,133,0,0.4)]"
                style={{ border: '1px solid #EAEAE8', borderRadius: 18, outline: 'none' }}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 10', background: '#F0EFEC' }}>
                  <div
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.06]"
                    style={{
                      backgroundImage: bgImage(coverSrc(s)),
                      backgroundSize: 'cover',
                      backgroundPosition: '50% 50%',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)' }}
                  />
                  <span
                    className="absolute bg-orange text-ink font-bold uppercase"
                    style={{
                      top: 14,
                      left: 14,
                      fontSize: 12,
                      letterSpacing: '0.4px',
                      padding: '5px 11px',
                      borderRadius: 999,
                    }}
                  >
                    {chipLabel(s.category)}
                  </span>
                  <span
                    className="absolute inline-flex items-center text-white font-semibold"
                    style={{
                      bottom: 14,
                      right: 14,
                      gap: 6,
                      background: 'rgba(22,12,0,0.72)',
                      fontSize: 12,
                      padding: '4px 10px',
                      borderRadius: 999,
                    }}
                  >
                    <CameraGlyph size={13} />
                    {mediaLabel(s.media, t)}
                  </span>
                </div>

                <div className="m-cardpad flex flex-1 flex-col" style={{ padding: '22px 24px 24px', gap: 10 }}>
                  <h2
                    className="m-0 font-serif font-bold"
                    style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: '-0.6px' }}
                  >
                    {pick(s.i18n.title, lang)}
                  </h2>
                  <p
                    className="m-0 overflow-hidden text-muted"
                    style={{
                      fontSize: 15,
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {pick(s.i18n.summary, lang)}
                  </p>
                  <div
                    className="flex items-center justify-between"
                    style={{ marginTop: 'auto', paddingTop: 16, gap: 8 }}
                  >
                    <span className="inline-flex items-center font-semibold text-ink" style={{ gap: 8, fontSize: 14 }}>
                      {t.sp_view}
                    </span>
                    <span
                      className="flex shrink-0 items-center justify-center rounded-full bg-surface text-ink transition-[transform,background-color,color] duration-[250ms] group-hover:translate-x-[4px] group-hover:bg-orange"
                      style={{ width: 36, height: 36 }}
                    >
                      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <DetailCtaBand
        variant="texture"
        title={t.sp_cta_title}
        sub={t.sp_cta_sub}
        btnLabel={t.sp_cta_btn}
        to="/contact"
        marginTop={60}
      />
    </div>
  );
}
