import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type {
  HomeImageSection,
  HomePartnerItem,
  HomeSectionKey,
  HomeSectionRow,
  HomeSectionsContent,
  HomeText,
  L10n,
  Lang,
} from '../../lib/db';
import { emptyL10n } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { assetUrl } from '../../lib/assets';
import { useAdminShell } from '../components/context';
import { ListError } from '../components/RecordCards';
import { FONT, Spinner, focusHandlers } from '../components/ui';

/**
 * "Home page" CMS view from ShakurAdminPanel.dc.html (v3): a four-section rail
 * (Hero / Partner block / CTA banner / Text & translations) with per-section
 * published/draft pills, a 360px editor card (preset image grid + real upload
 * via POST /api/media, or the EN/LV/RU text editor) and a live, render-accurate
 * preview of the real home sections beside it (stacked below ~1120px).
 *
 * Persistence: the four rows of `home_sections` — edits go against `draft`;
 * "Save draft" upserts draft + status='draft', "Publish section" copies
 * draft → published + status='published'.
 */

const LANGS: Lang[] = ['en', 'lv', 'ru'];
const LANG_LABELS: Record<Lang, string> = { en: 'EN', lv: 'LV', ru: 'RU' };

type ImageSectionKey = 'hero' | 'partner' | 'cta';
type SectionStatus = 'draft' | 'published';

const SECTIONS: {
  key: HomeSectionKey;
  label: string;
  kind: 'Image' | 'Text';
  hint: string;
  imgLabel?: string;
}[] = [
  {
    key: 'hero',
    label: 'Hero',
    kind: 'Image',
    hint: 'Full-width intro with the lead form',
    imgLabel: 'Hero background image',
  },
  {
    key: 'partner',
    label: 'Partner block',
    kind: 'Image',
    hint: 'Value-props block with photo',
    imgLabel: 'Partner block photo',
  },
  {
    key: 'cta',
    label: 'CTA banner',
    kind: 'Image',
    hint: 'Closing call-to-action banner',
    imgLabel: 'CTA background image',
  },
  {
    key: 'text',
    label: 'Text & translations',
    kind: 'Text',
    hint: 'All copy for these sections, per language',
  },
];

/** Design HOME_IMAGES — all present in this repo's public/images/. */
const HOME_IMAGES = [
  'images/home-hero.jpg',
  'images/home-interior.png',
  'images/cta-meeting.jpg',
  'images/svc-1.png',
  'images/img-9c88.png',
  'images/img-be98.png',
  'images/proj-rimi.png',
  'images/proj-kepler.png',
  'images/proj-moho.png',
  'images/img-97b7.png',
];

const HOME_LOGOS1 = [
  'images/logo-trust-1.png',
  'images/logo-trust-2.png',
  'images/logo-trust-3.png',
  'images/logo-trust-4.png',
  'images/logo-trust-5.png',
  'images/logo-trust-6.png',
];
const HOME_LOGOS2 = [
  'images/logo-def-1.png',
  'images/logo-def-2.png',
  'images/logo-def-3.png',
  'images/logo-def-4.png',
  'images/logo-def-5.png',
];

/** Design homeCms defaults (the contract's STATIC_HOME shape) — used when the
 * table is empty; the first save upserts them into home_sections. */
const DEFAULT_HOME: HomeSectionsContent = {
  hero: { image: 'images/home-hero.jpg' },
  partner: { image: 'images/home-interior.png' },
  cta: { image: 'images/cta-meeting.jpg' },
  text: {
    heroTitle: {
      en: 'Interior Finish Experts',
      lv: 'Iekšdarbu apdares eksperti',
      ru: 'Эксперты по внутренней отделке',
    },
    heroSub: {
      en: 'From drywall installation to tiling and painting — we deliver high-quality interior finishing with clear pricing, on-time completion, and a 5-year warranty.',
      lv: 'No ģipškartona montāžas līdz flīzēšanai un krāsošanai — augstas kvalitātes apdare ar skaidrām cenām un 5 gadu garantiju.',
      ru: 'От монтажа гипсокартона до плитки и покраски — качественная отделка с прозрачными ценами и 5-летней гарантией.',
    },
    partnerTitle: {
      en: 'Your Partner in Quality Interior Finishing',
      lv: 'Jūsu partneris kvalitatīvā apdarē',
      ru: 'Ваш партнёр в качественной отделке',
    },
    partnerItems: [
      {
        a: {
          en: 'Premium Interior Installation',
          lv: 'Augstākā līmeņa montāža',
          ru: 'Премиальная отделка',
        },
        b: {
          en: 'Our skilled team delivers flawless drywall, tiling, and finishing work with lasting quality.',
          lv: 'Mūsu komanda veic nevainojamu ģipškartona un apdares darbu ar noturīgu kvalitāti.',
          ru: 'Наша команда выполняет безупречную отделку с долговечным качеством.',
        },
      },
      {
        a: {
          en: '98% Journal Completion',
          lv: '98% žurnāla aizpildīšana',
          ru: '98% заполнение журнала',
        },
        b: {
          en: 'We maintain a 98% project-journal completion rate — full documentation, permits, and compliance records.',
          lv: 'Uzturam 98% projektu žurnāla aizpildīšanu — pilna dokumentācija un atbilstība.',
          ru: 'Поддерживаем 98% заполнение журнала — полная документация и соответствие.',
        },
      },
      {
        a: {
          en: 'Fast and Reliable Repairs',
          lv: 'Ātri un uzticami remonti',
          ru: 'Быстрый и надёжный ремонт',
        },
        b: {
          en: 'From minor fixes to major work — we restore interiors quickly, cleanly, and precisely.',
          lv: 'No maziem labojumiem līdz lieliem darbiem — ātri, tīri un precīzi.',
          ru: 'От мелкого ремонта до крупных работ — быстро, чисто и точно.',
        },
      },
      {
        a: {
          en: 'Stress-Free Interior Construction',
          lv: 'Bezrūpīga būvniecība',
          ru: 'Отделка без забот',
        },
        b: {
          en: 'From concept to delivery, we manage the whole process with precision and care.',
          lv: 'No idejas līdz nodošanai vadām visu procesu ar rūpību.',
          ru: 'От идеи до сдачи ведём весь процесс с вниманием.',
        },
      },
    ],
    ctaTitle: {
      en: 'Are you ready to discuss your renovation?',
      lv: 'Vai esat gatavs pārrunāt savu renovāciju?',
      ru: 'Готовы обсудить ваш ремонт?',
    },
    ctaSub: {
      en: 'Protect and transform your home with high-quality finishing and drywall services. From small repairs to complete renovations — we handle it all professionally. Get your free consultation today!',
      lv: 'Aizsargājiet un pārveidojiet savu māju ar augstas kvalitātes apdari. No maziem remontiem līdz pilnīgām renovācijām — darām visu profesionāli. Saņemiet bezmaksas konsultāciju!',
      ru: 'Защитите и преобразите свой дом с помощью качественной отделки. От мелкого ремонта до полной реновации — делаем всё профессионально. Получите бесплатную консультацию!',
    },
    ctaBtn: {
      en: 'Request a Consultation',
      lv: 'Pieteikt konsultāciju',
      ru: 'Заказать консультацию',
    },
  },
};

const STYLE = `
  @media (max-width: 1120px) {
    .cms-split2 { grid-template-columns: 1fr !important; }
    .cms-rail2 { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/* ---------------- normalisation of DB jsonb into the contract shapes ------ */

function normL10n(v: unknown): L10n {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Record<Lang, string>>;
  return {
    en: typeof o.en === 'string' ? o.en : '',
    lv: typeof o.lv === 'string' ? o.lv : '',
    ru: typeof o.ru === 'string' ? o.ru : '',
  };
}

function normImage(raw: unknown, fb: HomeImageSection): HomeImageSection {
  const img =
    raw && typeof raw === 'object' ? (raw as { image?: unknown }).image : undefined;
  return { image: typeof img === 'string' && img ? img : fb.image };
}

function normText(raw: unknown, fb: HomeText): HomeText {
  if (!raw || typeof raw !== 'object') return clone(fb);
  const t = raw as Partial<HomeText>;
  const items: HomePartnerItem[] = Array.isArray(t.partnerItems)
    ? t.partnerItems.map((it) => ({
        a: normL10n((it as Partial<HomePartnerItem> | null)?.a),
        b: normL10n((it as Partial<HomePartnerItem> | null)?.b),
      }))
    : clone(fb.partnerItems);
  return {
    heroTitle: t.heroTitle ? normL10n(t.heroTitle) : clone(fb.heroTitle),
    heroSub: t.heroSub ? normL10n(t.heroSub) : clone(fb.heroSub),
    partnerTitle: t.partnerTitle ? normL10n(t.partnerTitle) : clone(fb.partnerTitle),
    partnerItems: items,
    ctaTitle: t.ctaTitle ? normL10n(t.ctaTitle) : clone(fb.ctaTitle),
    ctaSub: t.ctaSub ? normL10n(t.ctaSub) : clone(fb.ctaSub),
    ctaBtn: t.ctaBtn ? normL10n(t.ctaBtn) : clone(fb.ctaBtn),
  };
}

/* ---------------- small shared bits --------------------------------------- */

/** Uploaded Home-CMS images render their local /media/ path and swap to the
 * Supabase replica URL if the local file is missing (contract render rule). */
function SmartImg({
  src,
  fallbacks,
  style,
  alt = '',
}: {
  src: string;
  fallbacks: Record<string, string>;
  style?: CSSProperties;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const resolved = failed && fallbacks[src] ? fallbacks[src] : assetUrl(src);
  return <img src={resolved} alt={alt} onError={() => setFailed(true)} style={style} />;
}

const IconCheckSmall = () => (
  <svg
    width={11}
    height={11}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#160C00"
    strokeWidth={3.4}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconUploadSmall = () => (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#C96A00"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, marginTop: 1 }}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconXSmall = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconPlusTiny = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CheckOrange = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FB8500"
    strokeWidth={2.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const tInput: CSSProperties = {
  border: '1px solid #E7E5E4',
  borderRadius: 9,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  fontFamily: FONT,
  color: '#160C00',
  width: '100%',
};

const tArea: CSSProperties = {
  ...tInput,
  fontSize: 13.5,
  color: '#54504D',
  resize: 'vertical',
};

const groupLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#A8A29E',
};

/* ---------------- live previews (design markup, verbatim proportions) ----- */

type PvData = {
  heroImage: string;
  partnerImage: string;
  ctaImage: string;
  heroTitle: string;
  heroSub: string;
  partnerTitle: string;
  partnerItems: { a: string; b: string }[];
  ctaTitle: string;
  ctaSub: string;
  ctaBtn: string;
};

function HeroPreview({ pv, fallbacks }: { pv: PvData; fallbacks: Record<string, string> }) {
  return (
    <>
      <div style={{ background: '#160C00' }}>
        <div
          style={{
            background: '#FCCC2C',
            color: '#160C00',
            textAlign: 'center',
            padding: 7,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Call us to get a free estimate: +371 2687 2727
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '15px 26px',
          }}
        >
          <img
            src="/images/shakur-logo.svg"
            alt="SHAKUR"
            style={{ height: 15, filter: 'brightness(0) invert(1)' }}
          />
          <div style={{ display: 'flex', gap: 20, color: '#fff', fontSize: 13 }}>
            <span>Home</span>
            <span>Projects</span>
            <span>Services</span>
            <span>Contact</span>
          </div>
          <span
            style={{
              background: '#FB8500',
              color: '#160C00',
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 13px',
              borderRadius: 9,
            }}
          >
            Request a Consultation
          </span>
        </div>
        <div
          style={{
            position: 'relative',
            minHeight: 440,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <SmartImg
              src={pv.heroImage}
              fallbacks={fallbacks}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: '50% 40%',
                display: 'block',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(252deg, rgba(0,0,0,0) 34%, rgba(0,0,0,0.88) 100%)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              padding: '34px 28px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 26,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 220,
                maxWidth: 430,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 46,
                  lineHeight: 0.98,
                  letterSpacing: -1,
                  color: '#fff',
                }}
              >
                {pv.heroTitle}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#EDEDED',
                  maxWidth: 390,
                }}
              >
                {pv.heroSub}
              </p>
            </div>
            <div
              style={{
                width: 296,
                maxWidth: '100%',
                background: '#fff',
                borderRadius: 14,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <img
                src="/images/shakur-logo.svg"
                alt="SHAKUR"
                style={{ height: 14, alignSelf: 'center', filter: 'brightness(0)' }}
              />
              <span style={{ fontSize: 12, fontWeight: 600 }}>E-Mail</span>
              <div
                style={{
                  border: '1px solid #E7E5E4',
                  borderRadius: 8,
                  padding: 9,
                  fontSize: 12,
                  color: '#A8A29E',
                  background: '#FAFAF9',
                }}
              >
                your@email.com
              </div>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Phone Number</span>
              <div
                style={{
                  border: '1px solid #E7E5E4',
                  borderRadius: 8,
                  padding: 9,
                  fontSize: 12,
                  color: '#A8A29E',
                  background: '#FAFAF9',
                }}
              >
                +371 20 000 000
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: '#FB8500',
                    color: '#160C00',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '9px 6px',
                    borderRadius: 8,
                  }}
                >
                  Request a Consultation
                </span>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: '#FCCC2C',
                    color: '#160C00',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '9px 6px',
                    borderRadius: 8,
                  }}
                >
                  Book an Appointment
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: '#fff', padding: '26px 24px 30px' }}>
        <p
          style={{
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#A8A29E',
            margin: '0 0 14px',
            fontWeight: 600,
          }}
        >
          Completed Their Projects At
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '22px 40px',
          }}
        >
          {HOME_LOGOS1.map((lg) => (
            <img
              key={lg}
              src={assetUrl(lg)}
              alt=""
              style={{ height: 34, width: 'auto', objectFit: 'contain' }}
            />
          ))}
        </div>
        <p
          style={{
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#A8A29E',
            margin: '20px 0 14px',
            fontWeight: 600,
          }}
        >
          Projects Took Place At
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '22px 40px',
          }}
        >
          {HOME_LOGOS2.map((lg) => (
            <img
              key={lg}
              src={assetUrl(lg)}
              alt=""
              style={{ height: 34, width: 'auto', objectFit: 'contain' }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function PartnerPreview({ pv, fallbacks }: { pv: PvData; fallbacks: Record<string, string> }) {
  return (
    <div style={{ background: '#fff', padding: '60px 30px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '4 / 3.2' }}>
            <SmartImg
              src={pv.partnerImage}
              fallbacks={fallbacks}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 240,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: 30,
              lineHeight: 1.08,
              letterSpacing: -1,
            }}
          >
            {pv.partnerTitle}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {pv.partnerItems.map((it, i) => (
              <div key={i} style={{ borderTop: '1px solid #EAEAE8', paddingTop: 12 }}>
                <h3
                  style={{
                    margin: '0 0 4px',
                    fontWeight: 600,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckOrange />
                  {it.a}
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: '#54504D' }}>
                  {it.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CtaPreview({ pv, fallbacks }: { pv: PvData; fallbacks: Record<string, string> }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#160C00',
        minHeight: 440,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <SmartImg
          src={pv.ctaImage}
          fallbacks={fallbacks}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '60% 50%',
            filter: 'grayscale(1)',
            opacity: 0.85,
            display: 'block',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(10,7,3,0.92) 0%, rgba(10,7,3,0.75) 34%, rgba(10,7,3,0.15) 72%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          padding: '88px 34px',
          maxWidth: 560,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1.02,
            letterSpacing: -0.5,
            color: '#fff',
          }}
        >
          {pv.ctaTitle}
        </h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)' }}>
          {pv.ctaSub}
        </p>
        <span
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#FB8500',
            color: '#160C00',
            fontWeight: 600,
            fontSize: 14,
            padding: '12px 20px',
            borderRadius: 10,
          }}
        >
          {pv.ctaBtn}
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#160C00"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/* ---------------- the view ------------------------------------------------ */

type UploadState =
  | { state: 'idle' }
  | { state: 'uploading'; pct: number; name: string }
  | { state: 'error'; msg: string };

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_UPLOAD = 15 * 1024 * 1024;

export default function HomeView() {
  const { toast } = useAdminShell();

  const [content, setContent] = useState<HomeSectionsContent | null>(null);
  const [status, setStatus] = useState<Record<HomeSectionKey, SectionStatus>>({
    hero: 'draft',
    partner: 'draft',
    cta: 'draft',
    text: 'draft',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<false | 'query' | 'schema'>(false);
  const [section, setSection] = useState<HomeSectionKey>('hero');
  const [lang, setLang] = useState<Lang>('en');
  const [saving, setSaving] = useState<false | 'draft' | 'publish'>(false);
  const [upload, setUpload] = useState<UploadState>({ state: 'idle' });
  const [fallbacks, setFallbacks] = useState<Record<string, string>>({});

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastFileRef = useRef<File | null>(null);

  useEffect(() => () => xhrRef.current?.abort(), []);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.from('home_sections').select('*');
    if (err) {
      const msg = err.message ?? '';
      const missingTable =
        err.code === '42P01' ||
        err.code === 'PGRST205' ||
        /does not exist|schema cache/i.test(msg);
      setError(missingTable ? 'schema' : 'query');
      setLoading(false);
      return;
    }
    const next = clone(DEFAULT_HOME);
    const st: Record<HomeSectionKey, SectionStatus> = {
      hero: 'draft',
      partner: 'draft',
      cta: 'draft',
      text: 'draft',
    };
    for (const row of (data ?? []) as HomeSectionRow[]) {
      if (row.section === 'text') next.text = normText(row.draft, DEFAULT_HOME.text);
      else if (row.section === 'hero' || row.section === 'partner' || row.section === 'cta') {
        next[row.section] = normImage(row.draft, DEFAULT_HOME[row.section]);
      } else {
        continue;
      }
      st[row.section] = row.status === 'published' ? 'published' : 'draft';
    }
    setContent(next);
    setStatus(st);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---- edits (always against the draft copy) ---- */

  const setImage = (sec: ImageSectionKey, src: string) =>
    setContent((c) => (c ? { ...c, [sec]: { image: src } } : c));

  const setText = (
    key: 'heroTitle' | 'heroSub' | 'partnerTitle' | 'ctaTitle' | 'ctaSub' | 'ctaBtn',
    val: string
  ) =>
    setContent((c) =>
      c ? { ...c, text: { ...c.text, [key]: { ...c.text[key], [lang]: val } } } : c
    );

  const setItem = (i: number, field: 'a' | 'b', val: string) =>
    setContent((c) => {
      if (!c) return c;
      const items = c.text.partnerItems.map((x) => ({ a: { ...x.a }, b: { ...x.b } }));
      items[i][field] = { ...items[i][field], [lang]: val };
      return { ...c, text: { ...c.text, partnerItems: items } };
    });

  const addItem = () =>
    setContent((c) =>
      c && c.text.partnerItems.length < 6
        ? {
            ...c,
            text: {
              ...c.text,
              partnerItems: [...c.text.partnerItems, { a: emptyL10n(), b: emptyL10n() }],
            },
          }
        : c
    );

  const delItem = (i: number) =>
    setContent((c) =>
      c
        ? {
            ...c,
            text: { ...c.text, partnerItems: c.text.partnerItems.filter((_, x) => x !== i) },
          }
        : c
    );

  /* ---- persistence: home_sections upsert ---- */

  const save = async (publish: boolean) => {
    if (!supabase || !content || saving) return;
    setSaving(publish ? 'publish' : 'draft');
    const value = section === 'text' ? content.text : content[section];
    const payload: {
      section: HomeSectionKey;
      draft: HomeText | HomeImageSection;
      published?: HomeText | HomeImageSection;
      status: SectionStatus;
      updated_at: string;
    } = {
      section,
      draft: value,
      status: publish ? 'published' : 'draft',
      updated_at: new Date().toISOString(),
    };
    if (publish) payload.published = value;
    const { error: err } = await supabase
      .from('home_sections')
      .upsert(payload, { onConflict: 'section' });
    setSaving(false);
    if (err) {
      toast("Couldn't save the section — try again");
      return;
    }
    setStatus((s) => ({ ...s, [section]: publish ? 'published' : 'draft' }));
    toast(publish ? 'Section published to the live site' : 'Saved as draft');
  };

  /* ---- media upload: POST /api/media (XHR for real progress) ---- */

  const uploadFile = (file: File, sec: ImageSectionKey) => {
    if (!supabase) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUpload({ state: 'error', msg: 'Only JPG, PNG, WebP, AVIF or GIF images are allowed.' });
      return;
    }
    if (file.size > MAX_UPLOAD) {
      setUpload({ state: 'error', msg: 'That image is over 15 MB — pick a smaller file.' });
      return;
    }
    lastFileRef.current = file;
    setUpload({ state: 'uploading', pct: 0, name: file.name });
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setUpload({ state: 'error', msg: 'Your session expired — sign in again.' });
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', '/api/media');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUpload({
            state: 'uploading',
            pct: Math.round((e.loaded / e.total) * 100),
            name: file.name,
          });
        }
      };
      xhr.onerror = () => setUpload({ state: 'error', msg: 'Upload failed — network error.' });
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const res = JSON.parse(xhr.responseText) as {
              id: string;
              path: string;
              supabaseUrl: string;
              replication: string;
            };
            if (res.supabaseUrl) setFallbacks((f) => ({ ...f, [res.path]: res.supabaseUrl }));
            setImage(sec, res.path);
            setUpload({ state: 'idle' });
            toast('Image uploaded');
          } catch {
            setUpload({ state: 'error', msg: 'Upload failed — unexpected server response.' });
          }
        } else if (xhr.status === 503) {
          setUpload({ state: 'error', msg: "The media service isn't configured on the server." });
        } else {
          setUpload({ state: 'error', msg: `Upload failed (${xhr.status}) — try again.` });
        }
      };
      xhr.send(fd);
    })();
  };

  /* ---- derived bits ---- */

  const meta = SECTIONS.find((s) => s.key === section)!;
  const pub = status[section] === 'published';
  const isImageSection = section !== 'text';

  const htv = (o: L10n): string => o[lang] || o.en || '';

  const pv: PvData | null = content
    ? {
        heroImage: content.hero.image,
        partnerImage: content.partner.image,
        ctaImage: content.cta.image,
        heroTitle: htv(content.text.heroTitle),
        heroSub: htv(content.text.heroSub),
        partnerTitle: htv(content.text.partnerTitle),
        partnerItems: content.text.partnerItems.map((it) => ({ a: htv(it.a), b: htv(it.b) })),
        ctaTitle: htv(content.text.ctaTitle),
        ctaSub: htv(content.text.ctaSub),
        ctaBtn: htv(content.text.ctaBtn),
      }
    : null;

  const langDot = (l: Lang): { dot: string; ring: string } => {
    if (!content) return { dot: '#D6D3D1', ring: 'none' };
    const t = content.text;
    const vals = [
      t.heroTitle[l],
      t.heroSub[l],
      t.partnerTitle[l],
      t.ctaTitle[l],
      t.ctaSub[l],
      t.ctaBtn[l],
      ...t.partnerItems.flatMap((it) => [it.a[l], it.b[l]]),
    ];
    if (vals.every((v) => Boolean(v && v.trim())))
      return { dot: '#1F8A5B', ring: '0 0 0 3px rgba(31,138,91,0.16)' };
    if (vals.some((v) => Boolean(v && v.trim())))
      return { dot: '#FB8500', ring: '0 0 0 3px rgba(251,133,0,0.16)' };
    return { dot: '#D6D3D1', ring: 'none' };
  };

  const currentImage = isImageSection && content ? content[section as ImageSectionKey].image : '';
  const uploadedExtra =
    isImageSection && currentImage && !HOME_IMAGES.includes(currentImage) ? currentImage : null;

  /* ---- render ---- */

  if (error) {
    return (
      <ListError
        noun="the home page content"
        detail={
          error === 'schema'
            ? "The database doesn't have the home_sections table yet — run supabase/migrate-v3.sql in the Supabase SQL editor, then try again."
            : undefined
        }
        onRetry={() => void load()}
      />
    );
  }

  if (loading || !content || !pv) {
    return (
      <>
        <style>{STYLE}</style>
        <div
          className="cms-rail2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginBottom: 18,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="adm-skel" style={{ height: 74, borderRadius: 13 }} />
          ))}
        </div>
        <div
          className="cms-split2"
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div className="adm-skel" style={{ height: 420, borderRadius: 16 }} />
          <div className="adm-skel" style={{ height: 420, borderRadius: 14 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{STYLE}</style>

      {/* section rail */}
      <div
        className="cms-rail2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 18,
        }}
      >
        {SECTIONS.map((s) => {
          const active = section === s.key;
          const sPub = status[s.key] === 'published';
          const statusColor = sPub ? '#1F8A5B' : '#A8862B';
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                border: `1.5px solid ${active ? '#FB8500' : '#EAEAE8'}`,
                background: active ? '#FFF3E4' : '#FFFFFF',
                borderRadius: 13,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                fontFamily: FONT,
                transition: 'border-color .15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FB8500';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = active ? '#FB8500' : '#EAEAE8';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: active ? '#C96A00' : '#A8A29E',
                  }}
                >
                  {s.kind}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: statusColor,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: statusColor,
                    }}
                  />
                  {sPub ? 'Published' : 'Draft'}
                </span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#160C00' }}>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* editor + preview */}
      <div
        className="cms-split2"
        style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {/* ---------- editor card ---------- */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #EAEAE8',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid #EEEDEA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{meta.label}</span>
              <span style={{ fontSize: 12, color: '#A8A29E' }}>{meta.hint}</span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 999,
                background: pub ? '#E6F4EC' : '#FBF3DE',
                color: pub ? '#1F8A5B' : '#A8862B',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: pub ? '#1F8A5B' : '#A8862B',
                }}
              />
              {pub ? 'Published' : 'Draft'}
            </span>
          </div>

          <div
            style={{
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 15,
            }}
          >
            {isImageSection && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{meta.imgLabel}</span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                  }}
                >
                  {(uploadedExtra ? [uploadedExtra, ...HOME_IMAGES] : HOME_IMAGES).map((src) => {
                    const active = currentImage === src;
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setImage(section as ImageSectionKey, src)}
                        style={{
                          position: 'relative',
                          aspectRatio: '1.4',
                          borderRadius: 9,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: `2px solid ${active ? '#FB8500' : 'transparent'}`,
                          padding: 0,
                          background: '#F5F5F4',
                        }}
                      >
                        <SmartImg
                          src={src}
                          fallbacks={fallbacks}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        {active && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: '#FB8500',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconCheckSmall />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* upload — real /api/media pipeline */}
                {upload.state === 'uploading' ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                      background: '#FFF9F1',
                      border: '1px solid #F0D8B8',
                      borderRadius: 10,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Spinner size={14} />
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#160C00',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {upload.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#FB8500' }}>
                        {upload.pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        borderRadius: 999,
                        background: '#EAEAE8',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${upload.pct}%`,
                          background: '#FB8500',
                          borderRadius: 999,
                          transition: 'width .25s ease',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      background: '#FFF9F1',
                      border: '1px solid #F0D8B8',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <IconUploadSmall />
                    <span style={{ fontSize: 12, color: '#8A6A2E', lineHeight: 1.5 }}>
                      Pick a preset, or{' '}
                      <span style={{ color: '#C96A00', fontWeight: 600 }}>upload a new photo</span>{' '}
                      — the preview updates live. JPG, PNG, WebP, AVIF or GIF · up to 15 MB.
                    </span>
                    <input
                      type="file"
                      accept={ACCEPTED_TYPES.join(',')}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f, section as ImageSectionKey);
                        e.target.value = '';
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
                {upload.state === 'error' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#FDF3F3',
                      border: '1px solid #F3D6D6',
                      borderRadius: 10,
                      padding: '9px 12px',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#D64545' }}>
                      {upload.msg}
                    </span>
                    {lastFileRef.current && (
                      <button
                        type="button"
                        onClick={() =>
                          lastFileRef.current &&
                          uploadFile(lastFileRef.current, section as ImageSectionKey)
                        }
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#FB8500',
                          fontWeight: 600,
                          fontSize: 12,
                          padding: 0,
                          fontFamily: FONT,
                        }}
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setUpload({ state: 'idle' })}
                      aria-label="Dismiss"
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#A8A29E',
                        display: 'flex',
                        padding: 0,
                      }}
                    >
                      <IconXSmall />
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isImageSection && (
              <>
                {/* language tabs with completion dots (EditorDrawer pattern) */}
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    background: '#F5F5F4',
                    padding: 5,
                    borderRadius: 11,
                  }}
                >
                  {LANGS.map((l) => {
                    const active = lang === l;
                    const d = langDot(l);
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 7,
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: FONT,
                          fontWeight: 600,
                          fontSize: 13,
                          padding: 9,
                          borderRadius: 8,
                          background: active ? '#FFFFFF' : 'transparent',
                          color: active ? '#160C00' : '#54504D',
                          boxShadow: active ? '0 1px 3px rgba(22,12,0,0.12)' : 'none',
                        }}
                      >
                        {LANG_LABELS[l]}
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: d.dot,
                            boxShadow: d.ring,
                          }}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* hero copy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={groupLabel}>Hero</span>
                  <input
                    type="text"
                    value={content.text.heroTitle[lang]}
                    onChange={(e) => setText('heroTitle', e.target.value)}
                    placeholder="Headline"
                    style={tInput}
                    {...focusHandlers()}
                  />
                  <textarea
                    value={content.text.heroSub[lang]}
                    onChange={(e) => setText('heroSub', e.target.value)}
                    rows={2}
                    placeholder="Sub-headline"
                    style={{ ...tArea, minHeight: 48 }}
                    {...focusHandlers()}
                  />
                </div>

                {/* partner block copy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={groupLabel}>Partner block</span>
                  <input
                    type="text"
                    value={content.text.partnerTitle[lang]}
                    onChange={(e) => setText('partnerTitle', e.target.value)}
                    placeholder="Section title"
                    style={tInput}
                    {...focusHandlers()}
                  />
                  {content.text.partnerItems.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        border: '1px solid #EEEDEA',
                        borderRadius: 11,
                        padding: 11,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        background: '#FCFBFA',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#A8A29E' }}>
                          POINT {String(i + 1).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={() => delItem(i)}
                          aria-label="Remove"
                          style={{
                            width: 24,
                            height: 24,
                            border: 'none',
                            background: '#F5F5F4',
                            borderRadius: 7,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#A8A29E',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FBE7E7';
                            e.currentTarget.style.color = '#D64545';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F5F5F4';
                            e.currentTarget.style.color = '#A8A29E';
                          }}
                        >
                          <IconXSmall />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={it.a[lang]}
                        onChange={(e) => setItem(i, 'a', e.target.value)}
                        placeholder="Heading"
                        style={{
                          ...tInput,
                          borderRadius: 8,
                          padding: '9px 11px',
                          fontSize: 13.5,
                          fontWeight: 600,
                        }}
                        {...focusHandlers()}
                      />
                      <textarea
                        value={it.b[lang]}
                        onChange={(e) => setItem(i, 'b', e.target.value)}
                        rows={2}
                        placeholder="Description"
                        style={{
                          ...tArea,
                          borderRadius: 8,
                          padding: '9px 11px',
                          fontSize: 13,
                          minHeight: 42,
                        }}
                        {...focusHandlers()}
                      />
                    </div>
                  ))}
                  {content.text.partnerItems.length < 6 && (
                    <button
                      type="button"
                      onClick={addItem}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        border: '1.5px dashed #DDD9D4',
                        background: '#fff',
                        color: '#54504D',
                        cursor: 'pointer',
                        fontFamily: FONT,
                        fontWeight: 600,
                        fontSize: 13,
                        padding: 10,
                        borderRadius: 9,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#FB8500';
                        e.currentTarget.style.color = '#FB8500';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#DDD9D4';
                        e.currentTarget.style.color = '#54504D';
                      }}
                    >
                      <IconPlusTiny />
                      Add value point
                    </button>
                  )}
                </div>

                {/* CTA copy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={groupLabel}>CTA banner</span>
                  <input
                    type="text"
                    value={content.text.ctaTitle[lang]}
                    onChange={(e) => setText('ctaTitle', e.target.value)}
                    placeholder="Heading"
                    style={tInput}
                    {...focusHandlers()}
                  />
                  <textarea
                    value={content.text.ctaSub[lang]}
                    onChange={(e) => setText('ctaSub', e.target.value)}
                    rows={3}
                    placeholder="Supporting text"
                    style={{ ...tArea, minHeight: 62 }}
                    {...focusHandlers()}
                  />
                  <input
                    type="text"
                    value={content.text.ctaBtn[lang]}
                    onChange={(e) => setText('ctaBtn', e.target.value)}
                    placeholder="Button label"
                    style={tInput}
                    {...focusHandlers()}
                  />
                </div>
              </>
            )}
          </div>

          {/* footer */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '16px 18px',
              borderTop: '1px solid #EEEDEA',
            }}
          >
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={Boolean(saving)}
              style={{
                flex: 1,
                cursor: saving ? 'default' : 'pointer',
                background: '#F5F5F4',
                color: '#160C00',
                border: '1.5px solid transparent',
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 14,
                padding: 12,
                borderRadius: 10,
                opacity: saving ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.background = '#EAEAE8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5F5F4';
              }}
            >
              {saving === 'draft' ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={() => void save(true)}
              disabled={Boolean(saving)}
              style={{
                flex: 1.4,
                border: 'none',
                cursor: saving ? 'default' : 'pointer',
                background: '#FB8500',
                color: '#160C00',
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 14,
                padding: 12,
                borderRadius: 10,
                opacity: saving ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.background = '#FFB703';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FB8500';
              }}
            >
              {saving === 'publish' ? 'Publishing…' : 'Publish section'}
            </button>
          </div>
        </div>

        {/* ---------- live preview ---------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#54504D',
              }}
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FB8500"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Live preview{' '}
              <span style={{ color: '#A8A29E', fontWeight: 500 }}>
                · {LANG_LABELS[lang]} · full size
              </span>
            </span>
            <span style={{ fontSize: 12, color: '#A8A29E' }}>{meta.label}</span>
          </div>
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #EAEAE8',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 14px',
                background: '#FAFAF9',
                borderBottom: '1px solid #EEEDEA',
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#E0DEDB',
                  }}
                />
              ))}
              <span style={{ marginLeft: 8, fontSize: 12, color: '#A8A29E' }}>shakur.lv</span>
            </div>
            <div style={{ overflow: 'hidden' }}>
              {(section === 'hero' || section === 'text') && (
                <HeroPreview pv={pv} fallbacks={fallbacks} />
              )}
              {(section === 'partner' || section === 'text') && (
                <PartnerPreview pv={pv} fallbacks={fallbacks} />
              )}
              {(section === 'cta' || section === 'text') && (
                <CtaPreview pv={pv} fallbacks={fallbacks} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
