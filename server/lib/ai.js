import { env } from './shared.js';

const FIELD_TYPES = ['title', 'summary', 'description', 'capabilities'];

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

const SYSTEM_PROMPT = [
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
  // v3: describe-driven — the copy is generated FROM the brief, not rewritten
  // from the field's current contents (`existing` is context only).
  const guidance = {
    title:
      'Write a short page/card title (3–6 words) drawn from the brief below. ' +
      'No trailing punctuation.',
    summary: 'Write a one-sentence card summary (max ~20 words) drawn from the brief below.',
    description:
      'Write body copy of 2–3 short paragraphs drawn from the brief below, ' +
      'separated by a blank line (\\n\\n).',
    capabilities:
      'Write 1 to 6 capability cards — only as many as the content genuinely needs — ' +
      'numbered "01", "02", … Each has a short title (2–4 words), a one-line ' +
      'description, and 2–4 short bullet points.',
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
      response_format: isCaps ? CAPABILITIES_FORMAT : TEXT_FORMAT,
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
    if (!isL10n(parsed)) {
      return res.status(502).json({ error: 'Model returned an unexpected shape' });
    }
    res.json({ en: parsed.en, lv: parsed.lv, ru: parsed.ru });
  } catch (err) {
    console.error('[ai]', err.message);
    res.status(502).json({ error: 'AI generation failed' });
  }
}
