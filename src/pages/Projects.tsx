import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { useProjects } from '../lib/useProjects';
import { pick } from '../lib/db';
import { coverSrc } from '../data';
import { gradients } from '../tokens';
import { Pin } from '../components/icons';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import CtaSection from '../components/CtaSection';
import { tapPress } from '../motion';
import { bgImage } from '../lib/assets';

export default function Projects() {
  const { t, lang } = useLang();
  const { projects, loading } = useProjects();
  const [visible, setVisible] = useState(4);

  const shown = projects.slice(0, visible);
  const canLoadMore = visible < projects.length;

  return (
    <div>
      <section
        className="bg-white"
        style={{ padding: '88px 30px 96px' }}
        aria-labelledby="projects-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1320 }}>
          <Reveal
            as="h1"
            id="projects-title"
            className="m-0 text-center font-serif font-bold text-page-title"
            style={{ marginBottom: 56 }}
          >
            {t.projects_page_title}
          </Reveal>

          {/* While the Supabase query is in flight the section shell renders
              with no cards — never a placeholder flash (v5 contract §3). */}
          {!loading && (
          <RevealGroup
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))',
              gap: 24,
            }}
            gap={0.07}
          >
            {shown.map((proj) => (
              <RevealItem key={proj.slug}>
                <Link
                  to={`/projects/${proj.slug}`}
                  className="group relative block overflow-hidden"
                  style={{ aspectRatio: '1.62', borderRadius: 16 }}
                >
                  <div
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
                    style={{
                      backgroundImage: bgImage(coverSrc(proj)),
                      backgroundSize: 'cover',
                      backgroundPosition: '50% 50%',
                    }}
                  />
                  <div className="absolute inset-0" style={{ background: gradients.projectCard }} />
                  <div
                    className="absolute flex flex-col text-white"
                    style={{ left: 24, right: 24, bottom: 22, gap: 6 }}
                  >
                    <span className="font-semibold" style={{ fontSize: 22, letterSpacing: '-0.4px' }}>
                      {pick(proj.i18n.title, lang)}
                    </span>
                    <span
                      className="inline-flex items-center"
                      style={{ gap: 6, fontSize: 14, color: '#F3F3F3' }}
                    >
                      <Pin size={13} />
                      {proj.loc}
                    </span>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
          )}

          {canLoadMore && (
            <div className="flex justify-center" style={{ marginTop: 36 }}>
              <motion.button
                onClick={() => setVisible((v) => Math.min(v + 2, projects.length))}
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
