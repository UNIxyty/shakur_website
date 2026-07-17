import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { TR, STORAGE_KEY, isLang, type Dict, type Lang } from './i18n';
import { useSiteTexts } from './lib/useSiteTexts';

type LangCtx = { lang: Lang; t: Dict; setLang: (l: Lang) => void };

const Ctx = createContext<LangCtx | null>(null);

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLang(v)) return v;
  } catch {
    /* private mode / storage disabled — fall through to the default */
  }
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  // v5: published overrides from site_texts_public (cache-first, so there is
  // no flash of default copy; any error silently keeps the file defaults).
  const overrides = useSiteTexts();

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* non-fatal: the choice just won't persist across reloads */
    }
    setLangState(l);
  }, []);

  // Keep the document language in sync for screen readers and font shaping.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const base = TR[lang];
    const keys = Object.keys(overrides);
    if (keys.length === 0) return { lang, t: base, setLang };
    // Merge published overrides over the file defaults. Unknown keys are
    // ignored (strings.json is the catalog); empty values fall back to the
    // default so a half-translated override never blanks the site.
    const dict: Record<string, string> = { ...base };
    for (const key of keys) {
      if (!(key in base)) continue;
      const v = overrides[key]?.[lang];
      if (typeof v === 'string' && v.trim()) dict[key] = v;
    }
    return { lang, t: dict as Dict, setLang };
  }, [lang, setLang, overrides]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * A fixed-dictionary provider for the admin "Website text" live preview: the
 * previewed public components read exactly the dict they are given (file
 * defaults + saved overrides + current unsaved edits) at a pinned language.
 * setLang is a no-op — the preview's language is driven by its own pills.
 */
export function StaticLangProvider({
  lang,
  dict,
  children,
}: {
  lang: Lang;
  dict: Dict;
  children: ReactNode;
}) {
  const value = useMemo<LangCtx>(() => ({ lang, t: dict, setLang: () => {} }), [lang, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}
