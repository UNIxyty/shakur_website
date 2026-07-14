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

/** Sample capability set for the mock path (approved capabilities extension). */
function aiMockCapabilities(): AiCapabilityItem[] {
  const mk = (
    number: string,
    title: L10n,
    description: L10n,
    bullets: L10n[]
  ): AiCapabilityItem => ({ number, title, description, bullets });
  return [
    mk(
      '01',
      { en: 'Survey & planning', lv: 'Apsekošana un plānošana', ru: 'Обследование и планирование' },
      {
        en: 'A site survey and a fixed, itemised quote before any work starts.',
        lv: 'Objekta apsekošana un fiksēta, detalizēta tāme pirms darbu sākuma.',
        ru: 'Обследование объекта и фиксированная детальная смета до начала работ.',
      },
      [
        { en: 'On-site measurements', lv: 'Mērījumi objektā', ru: 'Замеры на объекте' },
        { en: 'Itemised fixed quote', lv: 'Detalizēta fiksēta tāme', ru: 'Детальная фиксированная смета' },
        { en: 'Clear delivery schedule', lv: 'Skaidrs darbu grafiks', ru: 'Чёткий график работ' },
      ]
    ),
    mk(
      '02',
      { en: 'Structure & framing', lv: 'Konstrukcijas un karkass', ru: 'Конструкции и каркас' },
      {
        en: 'Framing, boarding, and structural works built to exact tolerances.',
        lv: 'Karkass, apšuvums un konstruktīvie darbi ar precīzām pielaidēm.',
        ru: 'Каркас, обшивка и конструктивные работы с точными допусками.',
      },
      [
        { en: 'Certified crews', lv: 'Sertificētas brigādes', ru: 'Сертифицированные бригады' },
        { en: 'Engineer-drawing compliance', lv: 'Atbilstība rasējumiem', ru: 'Соответствие чертежам' },
        { en: 'Stage-by-stage documentation', lv: 'Dokumentācija pa posmiem', ru: 'Поэтапная документация' },
      ]
    ),
    mk(
      '03',
      { en: 'Finishing', lv: 'Apdare', ru: 'Отделка' },
      {
        en: 'Jointing, surfaces, and detailing left paint-ready and tidy.',
        lv: 'Šuvošana, virsmas un detaļas — gatavas krāsošanai un sakoptas.',
        ru: 'Швы, поверхности и детали — под покраску и в полном порядке.',
      },
      [
        { en: 'Paint-ready finish', lv: 'Krāsošanai gatava apdare', ru: 'Отделка под покраску' },
        { en: 'Protected adjacent surfaces', lv: 'Aizsargātas blakus virsmas', ru: 'Защита смежных поверхностей' },
        { en: 'Daily site clean-up', lv: 'Ikdienas sakopšana', ru: 'Ежедневная уборка' },
      ]
    ),
    mk(
      '04',
      { en: 'Handover & aftercare', lv: 'Nodošana un garantija', ru: 'Сдача и гарантия' },
      {
        en: 'A documented handover, snag-free, with warranty-backed aftercare.',
        lv: 'Dokumentēta nodošana bez defektiem ar garantijas atbalstu.',
        ru: 'Документированная сдача без недоделок с гарантийной поддержкой.',
      },
      [
        { en: 'Snag-list walkthrough', lv: 'Defektu saraksta pārbaude', ru: 'Проверка по чек-листу' },
        { en: 'Building-control documents', lv: 'Būvvaldes dokumentācija', ru: 'Документы для стройнадзора' },
        { en: 'Workmanship warranty', lv: 'Darbu garantija', ru: 'Гарантия на работы' },
      ]
    ),
  ];
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

/** Capabilities/scope: resolves 4 items filled in all three languages. */
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
    await delay(1100);
    items = aiMockCapabilities();
  }
  return items.slice(0, 4).map((it, i) => ({
    number: it.number || String(i + 1).padStart(2, '0'),
    title: it.title,
    description: it.description,
    bullets: it.bullets.filter(isL10nShape),
  }));
}
