import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { ArrowRight, Mail, NotFoundArt } from '../components/icons';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import { tapPress } from '../motion';

export default function NotFound() {
  const { t } = useLang();

  return (
    <section
      className="bg-white"
      style={{ padding: '100px 30px 120px' }}
      aria-labelledby="nf-title"
    >
      <div
        className="mx-auto flex flex-wrap items-center justify-center"
        style={{ maxWidth: 1180, gap: 72 }}
      >
        <Reveal
          className="relative shrink-0"
          style={{ width: 300, height: 250 }}
        >
          <NotFoundArt />
        </Reveal>

        <RevealGroup className="flex flex-col" style={{ maxWidth: 560, gap: 26 }} gap={0.1}>
          <RevealItem
            as="h1"
            id="nf-title"
            className="m-0 font-serif font-bold text-nf-title"
          >
            {t.nf_title}
          </RevealItem>

          <RevealItem as="p" className="m-0 text-muted" style={{ fontSize: 17 }}>
            {t.nf_sub}
          </RevealItem>

          <RevealItem className="flex flex-wrap" style={{ gap: 14 }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={tapPress}>
              <Link
                to="/"
                className="inline-flex items-center bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover hover:text-ink"
                style={{ gap: 9, fontSize: 15, padding: '14px 24px', borderRadius: 11 }}
              >
                {t.nf_home} <ArrowRight size={16} />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={tapPress}>
              <Link
                to="/contact"
                className="inline-flex items-center bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover hover:text-ink"
                style={{ gap: 9, fontSize: 15, padding: '14px 24px', borderRadius: 11 }}
              >
                {t.nf_contact} <Mail size={16} />
              </Link>
            </motion.div>
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}
