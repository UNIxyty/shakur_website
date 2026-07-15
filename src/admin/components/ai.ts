import type { Capability, L10n } from '../../lib/db';

/**
 * "Write with AI" client. POSTs to the server API; when the endpoint is
 * missing/failing it falls back to the design's sample copy (_aiMock ported
 * verbatim, incl. the 1100 ms fake delay) so the flow still demos.
 */

export type AiTextField = 'title' | 'summary' | 'description';
export type AiFieldType = AiTextField | 'capabilities';
export type AiState = 'idle' | 'gen' | 'done' | 'err';

export type AiCapabilityItem = {
  number: string;
  title: L10n;
  description: L10n;
  bullets: L10n[];
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const tidy = (t: string): string =>
  t ? t.trim().replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '';

/** Design _aiMock — sample copy per field, note-aware where the design is. */
function aiMockText(field: AiTextField, note: string): L10n {
  const D: Record<AiTextField, L10n> = {
    title: {
      en: tidy(note) || 'Drywall & Partition Systems',
      lv: 'Ģipškartona un starpsienu sistēmas',
      ru: 'Системы гипсокартона и перегородок',
    },
    summary: {
      en: tidy(note) || 'Precision drywall, partitions, and ceilings for clean, paint-ready interiors.',
      lv: 'Precīzs ģipškartons, starpsienas un griesti tīram, krāsošanai gatavam interjeram.',
      ru: 'Точный гипсокартон, перегородки и потолки для чистых интерьеров под покраску.',
    },
    description: {
      en: 'Our crews build partitions, ceilings, and acoustic walls to exact tolerances — framing, boarding, jointing, and a paint-ready finish, coordinated with every other trade on site.',
      lv: 'Mūsu komanda būvē starpsienas, griestus un akustiskās sienas ar precīzām pielaidēm — karkass, apšuvums, šuvošana un krāsošanai gatava apdare, saskaņojot ar visiem darbu veicējiem.',
      ru: 'Наши бригады возводят перегородки, потолки и акустические стены с точными допусками — каркас, обшивка, шпаклёвка и отделка под покраску с учётом всех смежных работ.',
    },
  };
  return D[field];
}

/**
 * Sample capability pool for the mock path — the design's _capMock pool ported
 * verbatim (EN) and translated LV/RU in the style of src/i18n.ts. The design
 * derives a variable card count (1–6) from the brief's length.
 */
const CAP_MOCK_POOL: Omit<AiCapabilityItem, 'number'>[] = [
  {
    title: { en: 'Framing & Structure', lv: 'Karkass un konstrukcija', ru: 'Каркас и конструкция' },
    description: {
      en: 'Precise metal-stud framing set out to your layout and levelled to tight tolerances.',
      lv: 'Precīzs metāla profilu karkass, izlikts pēc jūsu plānojuma un izlīmeņots ar stingrām pielaidēm.',
      ru: 'Точный каркас из металлопрофиля, размеченный по вашей планировке и выровненный с жёсткими допусками.',
    },
    bullets: [
      { en: 'Set-out to architect drawings', lv: 'Izlikšana pēc arhitekta rasējumiem', ru: 'Разметка по чертежам архитектора' },
      { en: 'Laser-levelled studwork', lv: 'Ar lāzeri līmeņots karkass', ru: 'Лазерное выравнивание каркаса' },
      { en: 'Openings and service voids formed', lv: 'Izveidotas ailas un komunikāciju šahtas', ru: 'Проёмы и ниши для коммуникаций' },
    ],
  },
  {
    title: { en: 'Boarding & Jointing', lv: 'Apšuvums un šuvošana', ru: 'Обшивка и швы' },
    description: {
      en: 'Plasterboard fixed, taped and jointed to a clean, paint-ready standard.',
      lv: 'Ģipškartons piestiprināts, šuvots un špaktelēts līdz tīram, krāsošanai gatavam standartam.',
      ru: 'Гипсокартон закреплён, швы проклеены и зашпаклёваны до чистого стандарта под покраску.',
    },
    bullets: [
      { en: 'Level-4 taping and jointing', lv: '4. līmeņa šuvošana un špaktelēšana', ru: 'Шпаклёвка и швы 4-го уровня' },
      { en: 'Corner beads and stopping', lv: 'Stūru profili un apdare', ru: 'Угловые профили и заделка' },
      { en: 'Dust-controlled sanding', lv: 'Slīpēšana ar putekļu kontroli', ru: 'Шлифовка с пылеудалением' },
    ],
  },
  {
    title: {
      en: 'Acoustic & Fire Systems',
      lv: 'Akustiskās un ugunsdrošās sistēmas',
      ru: 'Акустические и противопожарные системы',
    },
    description: {
      en: 'Rated partition build-ups installed to specification and certified.',
      lv: 'Sertificētas starpsienu sistēmas, uzstādītas atbilstoši specifikācijai.',
      ru: 'Сертифицированные перегородки, смонтированные по спецификации.',
    },
    bullets: [
      { en: 'Acoustic insulation infill', lv: 'Akustiskās izolācijas pildījums', ru: 'Акустическая изоляция' },
      { en: 'Fire-rated board systems', lv: 'Ugunsdrošas plākšņu sistēmas', ru: 'Огнестойкие плитные системы' },
      { en: 'Compliance documentation', lv: 'Atbilstības dokumentācija', ru: 'Документация о соответствии' },
    ],
  },
  {
    title: { en: 'Finishing & Handover', lv: 'Apdare un nodošana', ru: 'Отделка и сдача' },
    description: {
      en: 'Surfaces primed and inspected, site cleaned and handed over on schedule.',
      lv: 'Virsmas gruntētas un pārbaudītas, objekts sakopts un nodots laikā.',
      ru: 'Поверхности загрунтованы и проверены, объект убран и сдан в срок.',
    },
    bullets: [
      { en: 'Priming and snag review', lv: 'Gruntēšana un defektu pārbaude', ru: 'Грунтовка и проверка недоделок' },
      { en: 'Coordination with other trades', lv: 'Saskaņošana ar citiem darbu veicējiem', ru: 'Координация со смежниками' },
      { en: 'On-time, clean handover', lv: 'Savlaicīga, tīra nodošana', ru: 'Своевременная чистая сдача' },
    ],
  },
  {
    title: { en: 'Site Management', lv: 'Būvdarbu vadība', ru: 'Управление объектом' },
    description: {
      en: 'Supervision and full journal completion across the works package.',
      lv: 'Uzraudzība un pilnīga būvdarbu žurnāla aizpildīšana visā darbu apjomā.',
      ru: 'Надзор и полное ведение журнала работ по всему пакету.',
    },
    bullets: [
      { en: 'Daily site supervision', lv: 'Ikdienas objekta uzraudzība', ru: 'Ежедневный контроль на объекте' },
      { en: '98% project-journal completion', lv: '98% projektu žurnāla aizpildīšana', ru: '98% заполнение журнала работ' },
      { en: 'Health & safety compliance', lv: 'Darba drošības atbilstība', ru: 'Соблюдение охраны труда' },
    ],
  },
  {
    title: { en: 'Materials & Sourcing', lv: 'Materiāli un piegāde', ru: 'Материалы и снабжение' },
    description: {
      en: 'Quality-graded materials sourced and delivered to programme.',
      lv: 'Kvalitatīvi materiāli, sagādāti un piegādāti atbilstoši grafikam.',
      ru: 'Качественные материалы, закупленные и поставленные по графику.',
    },
    bullets: [
      { en: 'Certified board and framing', lv: 'Sertificētas plāksnes un profili', ru: 'Сертифицированные плиты и профили' },
      { en: 'Just-in-time delivery', lv: 'Piegāde īstajā brīdī', ru: 'Поставка точно в срок' },
      { en: 'Waste sorted and minimised', lv: 'Šķiroti un samazināti atkritumi', ru: 'Сортировка и минимизация отходов' },
    ],
  },
];

/** Design _capMock: 1–6 cards, count derived from the brief's word count. */
function aiMockCapabilities(note: string): AiCapabilityItem[] {
  const words = (note || '').split(/\s+/).filter(Boolean).length;
  const n = Math.min(6, Math.max(1, Math.round(words / 7) || 3));
  return JSON.parse(
    JSON.stringify(
      CAP_MOCK_POOL.slice(0, n).map((c, i) => ({
        ...c,
        number: String(i + 1).padStart(2, '0'),
      }))
    )
  ) as AiCapabilityItem[];
}

function isL10nShape(v: unknown): v is L10n {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.en === 'string' && typeof o.lv === 'string' && typeof o.ru === 'string';
}

function isCapabilityItems(v: unknown): v is { items: AiCapabilityItem[] } {
  if (!v || typeof v !== 'object') return false;
  const items = (v as { items?: unknown }).items;
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (it) =>
        it &&
        typeof it === 'object' &&
        isL10nShape((it as AiCapabilityItem).title) &&
        isL10nShape((it as AiCapabilityItem).description) &&
        Array.isArray((it as AiCapabilityItem).bullets)
    )
  );
}

/** Text fields: resolves { en, lv, ru } for all three languages at once. */
export async function aiWriteText(
  field: AiTextField,
  note: string,
  existing: string
): Promise<L10n> {
  try {
    const res = await fetch('/api/ai/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note,
        fieldType: field,
        existing,
        targetLanguages: ['en', 'lv', 'ru'],
      }),
    });
    if (!res.ok) throw new Error(`ai/write ${res.status}`);
    const out: unknown = await res.json();
    if (!isL10nShape(out)) throw new Error('ai/write bad shape');
    return out;
  } catch {
    await delay(1100);
    return aiMockText(field, note);
  }
}

/**
 * Capabilities/scope: resolves 1–6 cards filled in all three languages
 * (v3 describe-driven contract; `note` is the "Scope of work" brief).
 * Numbering is re-normalised 01..NN client-side; bullets are capped at 4.
 */
export async function aiWriteCapabilities(note: string): Promise<Capability[]> {
  let items: AiCapabilityItem[];
  try {
    const res = await fetch('/api/ai/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note,
        fieldType: 'capabilities',
        targetLanguages: ['en', 'lv', 'ru'],
      }),
    });
    if (!res.ok) throw new Error(`ai/write ${res.status}`);
    const out: unknown = await res.json();
    if (!isCapabilityItems(out)) throw new Error('ai/write bad shape');
    items = out.items;
  } catch {
    await delay(1300);
    items = aiMockCapabilities(note);
  }
  return items.slice(0, 6).map((it, i) => ({
    number: String(i + 1).padStart(2, '0'),
    title: it.title,
    description: it.description,
    bullets: it.bullets.filter(isL10nShape).slice(0, 4),
  }));
}
