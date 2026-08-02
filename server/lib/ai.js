import { readFileSync } from 'node:fs';
import { env } from './shared.js';

const FIELD_TYPES = ['title', 'summary', 'description', 'capabilities', 'facts'];

const L10N_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { en: { type: 'string' }, lv: { type: 'string' }, ru: { type: 'string' } },
  required: ['en', 'lv', 'ru'],
};

const TEXT_FORMAT = {
  type: 'json_schema',
  json_schema: { name: 'trilingual_text', strict: true, schema: L10N_SCHEMA },
};

const CAPABILITIES_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'capabilities',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          // v3: 1–6 cards — only as many as the brief genuinely needs.
          minItems: 1,
          maxItems: 6,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['number', 'title', 'description', 'bullets'],
            properties: {
              number: { type: 'string' },
              title: L10N_SCHEMA,
              description: L10N_SCHEMA,
              bullets: { type: 'array', minItems: 2, maxItems: 4, items: L10N_SCHEMA },
            },
          },
        },
      },
    },
  },
};

/**
 * The copywriter's system prompt lives in an editable file, NOT in code:
 * edit server/prompts/copywriter.system.txt, then `docker compose up -d
 * --build` to apply. Loaded once at startup. Fallback chain — active file →
 * committed default (copywriter.system.default.txt) → the built-in string
 * below — each miss logs a warning; the AI feature never crashes over a
 * missing prompt file.
 */
const BUILTIN_SYSTEM_PROMPT = [
  'You are the copywriter for SHAKUR, a Baltic construction and interior-finishing',
  'company (drywall, finishing, wood construction, masonry, flooring, emergency works).',
  'Brand voice: confident, professional, concise. Concrete construction terminology,',
  'no fluff, no exclamation marks, no emoji.',
  'Always produce all three languages: English (en), Latvian (lv), Russian (ru).',
  'Translate naturally and idiomatically — not word-for-word — using correct',
  'construction terminology in each language.',
  "The admin's note may be written in any language — detect it, understand it, and",
  'still return all three languages (en, lv, ru).',
  'Write ONLY about the work the note describes; never pad with unrelated trades',
  '(a drywall brief must not produce masonry copy).',
].join(' ');

function loadSystemPrompt() {
  const candidates = [
    ['prompts/copywriter.system.txt', new URL('../prompts/copywriter.system.txt', import.meta.url)],
    [
      'prompts/copywriter.system.default.txt',
      new URL('../prompts/copywriter.system.default.txt', import.meta.url),
    ],
  ];
  for (let i = 0; i < candidates.length; i++) {
    const [label, url] = candidates[i];
    try {
      const text = readFileSync(url, 'utf8').trim();
      if (text) {
        if (i > 0) {
          console.warn(
            `[ai] ${candidates[0][0]} missing or empty — using the committed default (${label})`,
          );
        }
        return text;
      }
      console.warn(`[ai] ${label} is empty — trying the next fallback`);
    } catch (err) {
      console.warn(`[ai] cannot read ${label} (${err.code || err.message}) — trying the next fallback`);
    }
  }
  console.warn('[ai] no prompt file readable — using the built-in system prompt');
  return BUILTIN_SYSTEM_PROMPT;
}

const SYSTEM_PROMPT = loadSystemPrompt();

/**
 * fieldType 'facts' (v8): extract the editor's SHARED (not per-language)
 * fields from the brief. Every property is string-or-null; null = the brief
 * does not state it. Enums mirror the editor's dropdowns exactly
 * (SERVICE_OPTIONS / STATUSES / service categories in src).
 */
const FACTS_SERVICE_OPTIONS = [
  'Drywall',
  'Interior Finishing',
  'Wood Construction',
  'Masonry',
  'Flooring',
  'Emergency',
];
const FACTS_STATUS_OPTIONS = ['In Progress', 'Completed', 'Paused'];
const FACTS_CATEGORY_OPTIONS = ['Construction', 'Finishing', 'Support'];

const nullable = (extra = {}) => ({ type: ['string', 'null'], ...extra });
const FACTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'start_date',
    'end_date',
    'country',
    'city',
    'client',
    'service',
    'status',
    'location',
    'url',
    'category',
  ],
  properties: {
    start_date: nullable({
      description: "Start of the works, only as precisely as stated: 'YYYY-MM-DD', 'YYYY-MM', 'YYYY-Qn' or 'YYYY'.",
    }),
    end_date: nullable({
      description: "End/handover of the works, only as precisely as stated: 'YYYY-MM-DD', 'YYYY-MM', 'YYYY-Qn' or 'YYYY'.",
    }),
    country: nullable({ description: 'Country name in English, e.g. Latvia.' }),
    city: nullable({ description: 'City with native spelling/diacritics, e.g. Rīga.' }),
    client: nullable({ description: 'Client exactly as the brief names it.' }),
    service: nullable({ enum: [...FACTS_SERVICE_OPTIONS, null], description: 'Project service type — closest match, else null.' }),
    status: nullable({ enum: [...FACTS_STATUS_OPTIONS, null], description: 'Project status; a delivered/handed-over project is Completed.' }),
    location: nullable({ description: 'District/address details beyond city, e.g. Teika, Brīvības iela 12.' }),
    url: nullable({ description: "The project's own official website URL, if the brief gives one." }),
    category: nullable({ enum: [...FACTS_CATEGORY_OPTIONS, null], description: 'Service category (services only).' }),
  },
};

const FACTS_FORMAT = {
  type: 'json_schema',
  json_schema: { name: 'shared_fields', strict: true, schema: FACTS_SCHEMA },
};

const isFactsShape = (v) =>
  v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.keys(FACTS_SCHEMA.properties).every(
    (k) => v[k] === null || typeof v[k] === 'string',
  );

const isL10n = (v) =>
  v &&
  typeof v === 'object' &&
  typeof v.en === 'string' &&
  typeof v.lv === 'string' &&
  typeof v.ru === 'string' &&
  (v.en.trim() || v.lv.trim() || v.ru.trim());

function validateCapabilities(parsed) {
  if (!parsed || !Array.isArray(parsed.items)) return false;
  if (parsed.items.length < 1 || parsed.items.length > 6) return false;
  return parsed.items.every(
    (item, i) =>
      item &&
      typeof item.number === 'string' &&
      isL10n(item.title) &&
      isL10n(item.description) &&
      Array.isArray(item.bullets) &&
      item.bullets.length >= 2 &&
      item.bullets.length <= 4 &&
      item.bullets.every(isL10n) &&
      // normalise numbering as a side effect of validation
      (item.number = String(i + 1).padStart(2, '0')),
  );
}

let openaiClient = null;
async function getOpenAI() {
  if (!openaiClient) {
    const { default: OpenAI } = await import('openai');
    openaiClient = new OpenAI({ apiKey: env.openaiKey });
  }
  return openaiClient;
}

/** POST /api/ai/write — { note, fieldType, existing?, targetLanguages } */
export async function handleAiWrite(req, res) {
  if (!env.openaiKey) return res.status(503).json({ error: 'OpenAI is not configured' });

  const { note, fieldType, existing } = req.body || {};
  if (typeof note !== 'string' || !note.trim() || note.length > 2000) {
    return res.status(400).json({ error: 'note must be a non-empty string (max 2000 chars)' });
  }
  if (!FIELD_TYPES.includes(fieldType)) {
    return res.status(400).json({ error: `fieldType must be one of ${FIELD_TYPES.join(', ')}` });
  }
  if (existing != null && (typeof existing !== 'string' || existing.length > 4000)) {
    return res.status(400).json({ error: 'existing must be a string (max 4000 chars)' });
  }

  const isCaps = fieldType === 'capabilities';
  const isFacts = fieldType === 'facts';
  // v3: describe-driven — the copy is generated FROM the brief, not rewritten
  // from the field's current contents (`existing` is context only).
  const guidance = {
    title:
      'Write the Title. The admin marks whether it is a name or a phrase — never guess: ' +
      'a brief line "Title: X" (or "Name: X") means X is a proper name — output X verbatim, ' +
      'byte-identical in en, lv and ru, diacritics preserved, nothing added, nothing translated. ' +
      'A line "Title (translate): X" means X is descriptive — translate it idiomatically per ' +
      'language, keeping embedded proper nouns verbatim. With neither marker, use the shortest ' +
      'proper name found in the brief, kept verbatim in all three languages; never build a ' +
      'descriptive title from the work performed. Titles of 1–2 words are valid for real names. ' +
      'No trailing punctuation. This rule overrides the general translate-idiomatically instruction.',
    summary: 'Write a one-sentence card summary (max ~20 words) drawn from the brief below.',
    description:
      'Write body copy of 2–3 short paragraphs drawn from the brief below, ' +
      'separated by a blank line (\\n\\n).',
    capabilities:
      'Write 1 to 6 capability cards — only as many as the content genuinely needs — ' +
      'numbered "01", "02", … Each has a short title (2–4 words), a one-line ' +
      'description, and 2–4 short bullet points.',
    facts:
      'Do NOT write copy. Extract the shared editor fields from the brief below. ' +
      'Fill a field ONLY when the brief actually states it — never infer or invent a ' +
      'date, country, city, client, URL or status that is not written there; use null ' +
      'for everything not stated. Dates only as precisely as given: YYYY-MM-DD, ' +
      'YYYY-MM, YYYY-Qn or YYYY. These fields are shared across languages — plain ' +
      'strings, no translation.',
  }[fieldType];

  const user = [
    `Field: ${fieldType}. ${guidance}`,
    existing ? `Current copy, for context only — the brief drives the result:\n${existing}` : '',
    `Describe brief from the admin:\n${note}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const openai = await getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: isCaps ? CAPABILITIES_FORMAT : isFacts ? FACTS_FORMAT : TEXT_FORMAT,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
    });

    let parsed;
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? '');
    } catch {
      return res.status(502).json({ error: 'Model returned malformed JSON' });
    }

    if (isCaps) {
      if (!validateCapabilities(parsed)) {
        return res.status(502).json({ error: 'Model returned an unexpected shape' });
      }
      return res.json({ items: parsed.items });
    }
    if (isFacts) {
      if (!isFactsShape(parsed)) {
        return res.status(502).json({ error: 'Model returned an unexpected shape' });
      }
      return res.json({ facts: parsed });
    }
    if (!isL10n(parsed)) {
      return res.status(502).json({ error: 'Model returned an unexpected shape' });
    }
    res.json({ en: parsed.en, lv: parsed.lv, ru: parsed.ru });
  } catch (err) {
    console.error('[ai]', err.message);
    res.status(502).json({ error: 'AI generation failed' });
  }
}
