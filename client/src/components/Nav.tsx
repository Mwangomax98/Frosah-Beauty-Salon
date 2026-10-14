import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { Logo } from "./brand/Logo";
import { useT } from "@/i18n";
import { useCurrency } from "@/lib/currency";
import { useSettings } from "@/lib/queries";

export function Nav() {
  const { t, lang, setLang } = useT();
  const { currency, setCurrency } = useCurrency();
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { to: "/cars", label: t.nav.cars, sub: "Johnson Rentals" },
    { to: "/stays", label: t.nav.stays, sub: settings?.bnbBrandName ?? "Stays" },
    { to: "/about", label: t.nav.about },
    { to: "/contact", label: t.nav.contact },
  ];
  const linkCls = ({ isActive }: { isActive: boolean }) => `relative py-2 text-sm font-bold tracking-wide uppercase transition-colors ${isActive ? "text-spark" : "text-paper hover:text-spark"}`;

  return (
    <header className="sticky top-0 z-50 bg-brand text-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-spark focus:px-3 focus:py-2 focus:text-white">
        {t.nav.skip}
      </a>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo sub="Holdings · Dar" />
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Toggle ariaLabel={t.nav.currency} value={currency} options={["TZS", "USD"]} onChange={(v) => setCurrency(v as "TZS" | "USD")} />
          <Toggle ariaLabel={t.nav.language} value={lang.toUpperCase()} options={["EN", "SW"]} onChange={(v) => setLang(v.toLowerCase() as "en" | "sw")} />
          <NavLink to="/book/car" className="btn-primary btn-sm ml-1 hidden sm:inline-flex">
            {t.nav.bookNow}
          </NavLink>
          <button type="button" className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-sm border-2 border-paper/30 md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t.nav.close : t.nav.menu} onClick={() => setOpen((o) => !o)}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M4 4l14 14M18 4L4 18" /> : <path d="M3 6h16M3 11h16M3 16h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-paper/15 bg-brand md:hidden">
          <ul className="container-x flex flex-col py-3">
            {links.map((l) => (
              <li key={l.to} className="border-b border-paper/10 last:border-0">
                <NavLink to={l.to} className={({ isActive }) => `flex items-baseline justify-between py-3.5 font-display text-2xl uppercase ${isActive ? "text-spark" : "text-paper"}`}>
                  {l.label}
                  {l.sub && <span className="font-sans text-xs font-normal normal-case text-paper/60">{l.sub}</span>}
                </NavLink>
              </li>
            ))}
            <li className="pt-3">
              <NavLink to="/book/car" className="btn-primary w-full">
                {t.nav.bookNow}
              </NavLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function Toggle({ ariaLabel, value, options, onChange }: { ariaLabel: string; value: string; options: [string, string]; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex overflow-hidden rounded-sm border border-paper/30 text-[11px] font-bold">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)} className={`px-2 py-1.5 leading-none ${value === o ? "bg-paper text-brand" : "text-paper/80 hover:text-paper"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
