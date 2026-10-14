import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Currency } from "@bluesparks/shared";
import { formatMoney } from "@bluesparks/shared";
import { useSettings } from "./queries";

interface CurrencyCtx {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  toggle: () => void;
  rate: number;
  /** Format a TZS integer in the active currency. */
  fmt: (tzs: number) => string;
  /** Format in both, e.g. "TZS 120,000 (≈ $46)". */
  fmtBoth: (tzs: number) => string;
}

const Ctx = createContext<CurrencyCtx | null>(null);
const KEY = "bs.currency";
const DEFAULT_RATE = 2600;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const v = localStorage.getItem(KEY);
      return v === "USD" ? "USD" : "TZS";
    } catch {
      return "TZS";
    }
  });
  const { data: settings } = useSettings();
  const rate = settings?.usdRate && settings.usdRate > 0 ? settings.usdRate : DEFAULT_RATE;

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* private mode */
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.currency = currency;
  }, [currency]);

  const value = useMemo<CurrencyCtx>(
    () => ({
      currency,
      setCurrency,
      toggle: () => setCurrency(currency === "TZS" ? "USD" : "TZS"),
      rate,
      fmt: (tzs) => formatMoney(tzs, currency, rate),
      fmtBoth: (tzs) => (currency === "TZS" ? `${formatMoney(tzs, "TZS", rate)} (≈ ${formatMoney(tzs, "USD", rate)})` : `${formatMoney(tzs, "USD", rate)} (${formatMoney(tzs, "TZS", rate)})`),
    }),
    [currency, rate, setCurrency],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCurrency outside CurrencyProvider");
  return v;
}
