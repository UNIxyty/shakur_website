/**
 * i18n loader — the single source of truth for all public-site copy is
 * `src/i18n/strings.json` (nested by page/section; every leaf carries
 * { en, lv, ru }). The copy was transcribed verbatim from the design sources
 * (Shakur.dc.html, CtaSection.dc.html, FaqSection.dc.html, ProcessSteps.dc.html,
 * the v2/v3 page designs) — edit the JSON, not this file, to change wording.
 *
 * WHERE TO ADD NEW COPY
 * 1. Open src/i18n/strings.json and find the section for your page/feature
 *    ("home" → "hero", "modals" → "booking", …). Add a leaf there with ALL
 *    three languages:  "my_new_key": { "en": "…", "lv": "…", "ru": "…" }
 * 2. Use it in a component as `t.my_new_key` (via useLang()). Nothing else to
 *    wire up: the dictionaries below are built from the JSON at module load,
 *    and the `Dict` type is derived from the JSON leaves, so `tsc` fails on
 *    any typo'd or missing key.
 * 3. Rules: leaf key names must be unique across the whole file (the runtime
 *    dictionaries are flat), nesting is at most section → subsection → leaf,
 *    and sections exist only to keep the file browsable — they never appear
 *    in component code.
 */

import strings from './i18n/strings.json';

export const LANGS = ['en', 'lv', 'ru'] as const;
export type Lang = (typeof LANGS)[number];

export const STORAGE_KEY = 'shakur_lang';

/** A translation leaf in strings.json: `{ en, lv, ru }`. */
type Leaf = Record<Lang, string>;

/** Recursively collects every leaf key name from the nested JSON shape. */
type Leaves<T> = {
  [K in keyof T]: T[K] extends Leaf ? K : T[K] extends object ? Leaves<T[K]> : never;
}[keyof T];

type LeafKey = Extract<Leaves<typeof strings>, string>;

/** Every locale carries the same flat keys — components read `t.some_key`. */
export type Dict = Record<LeafKey, string>;

const dicts: Record<Lang, Record<string, string>> = { en: {}, lv: {}, ru: {} };

/** Deep-walks the JSON and flattens the leaves into per-language dictionaries. */
function collect(node: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(node)) {
    if (!value || typeof value !== 'object') continue;
    const obj = value as Record<string, unknown>;
    if (LANGS.some((l) => typeof obj[l] === 'string')) {
      // Leaf. Dev-only guards: duplicate leaf names and missing languages.
      if (import.meta.env.DEV && key in dicts.en) {
        console.warn(`[i18n] duplicate key "${key}" in strings.json — the later value wins`);
      }
      for (const l of LANGS) {
        const s = obj[l];
        if (typeof s === 'string') {
          dicts[l][key] = s;
        } else if (import.meta.env.DEV) {
          console.warn(`[i18n] key "${key}" in strings.json is missing its "${l}" translation`);
        }
      }
    } else {
      collect(obj);
    }
  }
}
collect(strings as unknown as Record<string, unknown>);

export const TR: Record<Lang, Dict> = dicts as Record<Lang, Dict>;

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}
