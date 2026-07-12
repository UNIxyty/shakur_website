import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { gradients } from '../tokens';
import { ArrowRight } from './icons';
import { RevealGroup, RevealItem } from './Reveal';
import { tapPress } from '../motion';
import { bgImage } from '../lib/assets';

/** CtaSection.dc.html */
export default function CtaSection() {
  const { t } = useLang();

  return (
    <section
      className="relative w-full overflow-hidden bg-ink"
      aria-labelledby="cta-title"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: bgImage('images/cta-meeting.jpg'),
          backgroundSize: 'cover',
          backgroundPosition: '60% 50%',
          filter: 'grayscale(1)',
          opacity: 0.9,
        }}
      />
      <div className="absolute inset-0" style={{ background: gradients.ctaScrim }} />

      <div
        className="relative mx-auto box-border"
        style={{ maxWidth: 1320, padding: '150px 30px' }}
      >
        <RevealGroup
          className="flex flex-col items-start"
          style={{ maxWidth: 560, gap: 28 }}
          gap={0.1}
        >
          <RevealItem
            as="h2"
            id="cta-title"
            className="m-0 font-serif font-bold text-white text-cta-title"
          >
            {t.cta_title}
          </RevealItem>

          <RevealItem
            as="p"
            className="m-0 font-normal"
            style={{
              fontSize: 17,
              lineHeight: 1.75,
              color: 'rgba(255,255,255,0.82)',
              maxWidth: 440,
            }}
          >
            {t.cta_sub}
          </RevealItem>

          <RevealItem>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={tapPress} className="inline-block">
              <Link
                to="/contact"
                className="inline-flex items-center bg-orange text-ink font-semibold no-underline transition-colors duration-200 hover:bg-orange-hover hover:text-ink"
                style={{
                  gap: 10,
                  fontSize: 16,
                  padding: '15px 26px',
                  borderRadius: 12,
                  boxShadow: '0 10px 24px rgba(228,163,0,0.4)',
                }}
              >
                {t.cta_btn}
                <ArrowRight size={18} />
              </Link>
            </motion.div>
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}
