import { Link } from "react-router";
import { COMPANY } from "@bluesparks/shared";

/**
 * Blue Spark logo. Files in client/public/brand/ are cut from the supplied logo:
 *  - mark.webp          the "BS" emblem for light backgrounds
 *  - mark-on-dark.webp  the same emblem with the navy parts knocked out to white, for navy backgrounds
 *  - logo-full.webp / logo-full-on-dark.webp  the complete lock-up with wordmark and tagline
 */
export function Logo({ onDark = true, className = "", sub }: { onDark?: boolean; className?: string; sub?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 no-underline ${className}`} aria-label={`${COMPANY.name} — home`}>
      <img src={onDark ? "/brand/mark-on-dark.webp" : "/brand/mark.webp"} alt="" width="44" height="36" decoding="async" className="h-9 w-auto" />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.35rem] leading-none tracking-[-0.02em] uppercase whitespace-nowrap ${onDark ? "text-paper" : "text-brand"}`}>
          BLUE <span className={onDark ? "text-sky" : "text-spark"}>SPARK</span>
        </span>
        {sub && <span className={`mt-1 hidden sm:block text-[9px] font-bold tracking-[0.22em] uppercase ${onDark ? "text-paper/70" : "text-ink-soft"}`}>{sub}</span>}
      </span>
    </Link>
  );
}

/** The full logo lock-up for About, Contact and the staff login page. */
export function LogoFull({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  return <img src={onDark ? "/brand/logo-full-on-dark.webp" : "/brand/logo-full.webp"} alt={COMPANY.legalName} width="900" height="900" loading="lazy" decoding="async" className={className} />;
}
