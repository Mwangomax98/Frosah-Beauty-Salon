import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type Dictionary } from "./en";
import { sw } from "./sw";

export type Lang = "en" | "sw";
const DICTS: Record<Lang, Dictionary> = { en, sw };
const KEY = "bs.lang";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dictionary;
}
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem(KEY);
      return v === "sw" ? "sw" : "en";
    } catch {
      return "en";
    }
  });
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: DICTS[lang] }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Small translation hook: `const { t, lang } = useT(); t.nav.cars` */
export function useT(): I18nCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT outside I18nProvider");
  return v;
}
