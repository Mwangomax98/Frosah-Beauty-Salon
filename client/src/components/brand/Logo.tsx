import { Link } from "react-router";

/**
 * Logo placeholder.
 * TODO (owner): drop the real Bluesparks SVG logo here (e.g. import logo from "@/assets/bluesparks-logo.svg")
 * and render <img src={logo} alt="Bluesparks Holdings" width height /> in place of the wordmark below.
 * Also update --color-brand / --color-brand-deep in src/index.css to the colour sampled from the logo.
 */
export function Logo({ onDark = true, className = "", sub }: { onDark?: boolean; className?: string; sub?: string }) {
  return (
    <Link to="/" className={`inline-flex items-baseline gap-2 no-underline ${className}`} aria-label="Bluesparks Holdings — home">
      <span className={`font-display text-2xl leading-none tracking-[-0.02em] uppercase ${onDark ? "text-paper" : "text-brand"}`}>
        BLUESPARKS
        <span className="text-orange">.</span>
      </span>
      {sub && <span className={`hidden text-[10px] font-bold tracking-[0.2em] uppercase sm:inline ${onDark ? "text-paper/70" : "text-ink-soft"}`}>{sub}</span>}
    </Link>
  );
}
