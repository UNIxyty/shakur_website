import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { SERVICES, localizeService } from '../data';
import { gradients } from '../tokens';
import { ChevronRight } from '../components/icons';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import CtaSection from '../components/CtaSection';
import { tapPress } from '../motion';
import { bgImage } from '../lib/assets';

export default function Services() {
  const { t } = useLang();
  const [visible, setVisible] = useState(4);

  const services = SERVICES.map((s) => localizeService(s, t));
  const shown = services.slice(0, visible);
  const canLoadMore = visible < services.length;

  return (
    <div>
      <section
        className="bg-white"
        style={{ padding: '88px 30px 96px' }}
        aria-labelledby="services-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1320 }}>
          <Reveal
            as="h1"
            id="services-title"
            className="m-0 text-center font-serif font-bold text-page-title"
            style={{ marginBottom: 56 }}
          >
            {t.services_page_title}
          </Reveal>

          <RevealGroup
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))',
              gap: 22,
            }}
            gap={0.07}
          >
            {shown.map((svc) => (
              <RevealItem
                key={svc.slug}
                className="relative overflow-hidden text-white"
                style={{ aspectRatio: '1.72', borderRadius: 16 }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: bgImage(svc.img),
                    backgroundSize: 'cover',
                    backgroundPosition: '50% 50%',
                  }}
                />
                <div className="absolute inset-0" style={{ background: gradients.servicesGrid }} />

                <div
                  className="absolute flex flex-col"
                  style={{ left: 28, right: 28, bottom: 24, gap: 10 }}
                >
                  <h3
                    className="m-0 font-semibold"
                    style={{ fontSize: 27, lineHeight: 1.08, letterSpacing: '-0.6px' }}
                  >
                    {svc.title}
                  </h3>
                  <p
                    className="m-0"
                    style={{ fontSize: 14, lineHeight: 1.55, color: '#E7E5E4', maxWidth: '78%' }}
                  >
                    {svc.desc}
                  </p>
                  <Link
                    to={`/service/${svc.slug}`}
                    className="absolute inline-flex items-center text-white font-semibold hover:text-white"
                    style={{ right: 0, bottom: 2, gap: 6, fontSize: 14 }}
                  >
                    {t.get_service} <ChevronRight size={15} />
                  </Link>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          {canLoadMore && (
            <div className="flex justify-center" style={{ marginTop: 36 }}>
              <motion.button
                onClick={() => setVisible((v) => Math.min(v + 2, services.length))}
                whileHover={{ scale: 1.03 }}
                whileTap={tapPress}
                className="cursor-pointer border-0 bg-orange text-ink font-semibold transition-colors duration-200 hover:bg-orange-hover"
                style={{ fontSize: 15, padding: '13px 28px', borderRadius: 11 }}
              >
                {t.load_more}
              </motion.button>
            </div>
          )}
        </div>
      </section>

      <CtaSection />
    </div>
  );
}
