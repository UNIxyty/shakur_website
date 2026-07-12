import { useParams } from 'react-router-dom';
import { useLang } from '../lang';
import { useProjects } from '../lib/useProjects';
import { PROJ_VIDS, PROJ_VID_DURATIONS } from '../data';
import { gradients } from '../tokens';
import { Pin } from '../components/icons';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import MediaGallery, { type GalleryVideo } from '../components/MediaGallery';
import ProcessSteps from '../components/ProcessSteps';
import FaqSection from '../components/FaqSection';
import CtaSection from '../components/CtaSection';
import NotFound from './NotFound';
import { bgImage } from '../lib/assets';

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLang();
  const { projects, loading } = useProjects();

  const proj = projects.find((p) => p.slug === slug);

  // Don't flash a 404 while the Supabase query is still in flight.
  if (!proj) return loading ? <div style={{ minHeight: '60vh' }} /> : <NotFound />;

  const images = proj.images.length ? proj.images : [proj.img];
  const posters = PROJ_VIDS[proj.slug] ?? [];
  const videos: GalleryVideo[] = posters.map((p, i) => ({
    poster: p,
    dur: PROJ_VID_DURATIONS[i] ?? PROJ_VID_DURATIONS[PROJ_VID_DURATIONS.length - 1],
    title: i % 2 === 0 ? t.m_walk : t.m_progress,
  }));

  const facts: { label: string; value: string; accent?: boolean }[] = [
    { label: t.f_service, value: proj.service },
    { label: t.f_start, value: proj.start },
    { label: t.f_end, value: proj.end },
    { label: t.f_country, value: proj.country },
    { label: t.f_city, value: proj.city },
    { label: t.f_client, value: proj.client },
  ];

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section
        className="relative flex items-end overflow-hidden"
        style={{ height: 420 }}
        aria-labelledby="proj-title"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: bgImage(proj.img),
            backgroundSize: 'cover',
            backgroundPosition: '50% 50%',
          }}
        />
        <div className="absolute inset-0" style={{ background: gradients.projectHero }} />

        <RevealGroup
          className="relative mx-auto flex w-full flex-col items-start"
          style={{ maxWidth: 1320, padding: '0 30px 44px', gap: 14 }}
          gap={0.1}
        >
          <RevealItem
            as="span"
            className="inline-flex items-center bg-orange text-ink font-semibold"
            style={{ gap: 7, fontSize: 13, padding: '7px 13px', borderRadius: 999 }}
          >
            <Pin size={13} stroke="#160C00" strokeWidth={2.6} />
            {proj.loc}
          </RevealItem>
          <RevealItem
            as="h1"
            id="proj-title"
            className="m-0 font-serif font-bold text-white text-detail-title"
          >
            {proj.title}
          </RevealItem>
        </RevealGroup>
      </section>

      {/* ---------- GALLERY + FACTS ---------- */}
      <section className="bg-white" style={{ padding: '60px 30px 80px' }}>
        <div
          className="mx-auto flex flex-wrap items-start"
          style={{ maxWidth: 1320, gap: 44 }}
        >
          <div className="flex flex-col" style={{ flex: 2, minWidth: 280, gap: 16 }}>
            <MediaGallery images={images} videos={videos} variant="project" />
          </div>

          <Reveal
            className="bg-surface"
            style={{
              flex: 1,
              minWidth: 300,
              border: '1px solid #EAEAE8',
              borderRadius: 16,
              padding: 30,
            }}
          >
            <h2
              className="m-0 font-semibold"
              style={{
                marginBottom: 20,
                fontSize: 20,
                borderBottom: '1px solid #E0DFDC',
                paddingBottom: 14,
              }}
            >
              {t.facts_title}
            </h2>

            <dl className="m-0 flex flex-col" style={{ gap: 15 }}>
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="flex justify-between"
                  style={{ gap: 18, fontSize: 15 }}
                >
                  <dt className="text-muted">{f.label}</dt>
                  <dd
                    className="m-0 text-right font-medium"
                    style={{ maxWidth: f.label === t.f_service ? '60%' : undefined }}
                  >
                    {f.value}
                  </dd>
                </div>
              ))}

              <div
                className="flex justify-between"
                style={{
                  gap: 18,
                  fontSize: 15,
                  borderTop: '1px solid #E0DFDC',
                  paddingTop: 15,
                }}
              >
                <dt className="text-muted">{t.f_status}</dt>
                <dd className="m-0 font-semibold" style={{ color: '#1F8A5B' }}>
                  {t.status_completed}
                </dd>
              </div>
            </dl>

            {proj.official.url && (
              <div
                className="flex flex-col"
                style={{
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: '1px solid #E0DFDC',
                  gap: 6,
                }}
              >
                <span className="text-muted" style={{ fontSize: 13 }}>
                  {t.official_site}
                </span>
                <a
                  href={proj.official.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-orange hover:text-orange-hover"
                  style={{ fontSize: 15 }}
                >
                  {proj.official.label}
                </a>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      <ProcessSteps />
      <FaqSection />
      <CtaSection />
    </div>
  );
}
