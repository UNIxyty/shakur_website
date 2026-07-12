import { useParams } from 'react-router-dom';
import { useLang } from '../lang';
import { SERVICES, SVC_MEDIA, localizeService, serviceLongCopy } from '../data';
import { gradients } from '../tokens';
import { Check } from '../components/icons';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import MediaGallery, { type GalleryVideo } from '../components/MediaGallery';
import ProcessSteps from '../components/ProcessSteps';
import FaqSection from '../components/FaqSection';
import CtaSection from '../components/CtaSection';
import NotFound from './NotFound';
import { bgImage } from '../lib/assets';

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLang();

  const base = SERVICES.find((s) => s.slug === slug);
  if (!base) return <NotFound />;

  const svc = localizeService(base, t);
  const long = serviceLongCopy(svc.slug, t) || svc.desc;

  const media = SVC_MEDIA[svc.slug] ?? { gallery: [svc.img], vids: [] };
  const images = media.gallery.length ? media.gallery : [svc.img];
  const videos: GalleryVideo[] = media.vids.map((v, i) => ({
    poster: v.p,
    dur: v.d,
    title: i % 2 === 0 ? t.m_walk : t.m_progress,
  }));

  const why = [t.why1, t.why2, t.why3, t.why4];
  const how = [
    { t: t.how1_t, d: t.how1_d },
    { t: t.how2_t, d: t.how2_d },
    { t: t.how3_t, d: t.how3_d },
    { t: t.how4_t, d: t.how4_d },
  ];

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section
        className="relative flex items-end overflow-hidden"
        style={{ height: 460 }}
        aria-labelledby="svc-title"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: bgImage(svc.img),
            backgroundSize: 'cover',
            backgroundPosition: '50% 50%',
          }}
        />
        <div className="absolute inset-0" style={{ background: gradients.serviceHero }} />

        <div
          className="relative mx-auto w-full"
          style={{ maxWidth: 1320, padding: '0 30px 60px' }}
        >
          <RevealGroup className="flex flex-col" style={{ maxWidth: 640, gap: 16 }} gap={0.1}>
            <RevealItem
              as="h1"
              id="svc-title"
              className="m-0 font-serif font-bold text-white text-detail-title"
            >
              {svc.title}
            </RevealItem>
            <RevealItem
              as="p"
              className="m-0 text-on-dark"
              style={{ fontSize: 16, lineHeight: 1.65, maxWidth: 520 }}
            >
              {svc.desc}
            </RevealItem>
          </RevealGroup>
        </div>
      </section>

      {/* ---------- LONG COPY + WHY / HOW ---------- */}
      <section className="bg-white" style={{ padding: '76px 30px' }}>
        <Reveal className="mx-auto" style={{ maxWidth: 900, margin: '0 auto 46px' }}>
          <p
            className="m-0"
            style={{ fontSize: 19, lineHeight: 1.72, color: '#3B3835', letterSpacing: '-0.1px' }}
          >
            {long}
          </p>
        </Reveal>

        <div className="mx-auto flex flex-wrap" style={{ maxWidth: 900, gap: 64 }}>
          <RevealGroup style={{ flex: 1, minWidth: 300 }} gap={0.07}>
            <RevealItem
              as="h2"
              className="m-0 font-semibold"
              style={{ marginBottom: 24, fontSize: 28, letterSpacing: '-0.6px' }}
            >
              {t.why_us}
            </RevealItem>
            <ul className="m-0 flex list-none flex-col p-0" style={{ gap: 14 }}>
              {why.map((w) => (
                <RevealItem
                  as="li"
                  key={w}
                  className="flex text-ink"
                  style={{ gap: 11, fontSize: 16 }}
                >
                  <Check size={20} strokeWidth={2.6} className="mt-[2px]" />
                  {w}
                </RevealItem>
              ))}
            </ul>
          </RevealGroup>

          <RevealGroup style={{ flex: 1, minWidth: 300 }} gap={0.07}>
            <RevealItem
              as="h2"
              className="m-0 font-semibold"
              style={{ marginBottom: 24, fontSize: 28, letterSpacing: '-0.6px' }}
            >
              {t.how_works}
            </RevealItem>
            <div className="flex flex-col" style={{ gap: 16 }}>
              {how.map((s) => (
                <RevealItem key={s.t} className="text-ink" style={{ fontSize: 16 }}>
                  <strong className="font-semibold">{s.t}</strong>
                  <span className="text-muted"> — {s.d}</span>
                </RevealItem>
              ))}
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ---------- GALLERY ---------- */}
      <section
        className="bg-surface-alt"
        style={{ borderTop: '1px solid #EEEDEA', padding: '74px 30px' }}
        aria-labelledby="svc-gallery-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1000 }}>
          <MediaGallery
            images={images}
            videos={videos}
            variant="service"
            title={t.m_gallery_t}
          />
        </div>
      </section>

      <ProcessSteps />
      <FaqSection />
      <CtaSection />
    </div>
  );
}
