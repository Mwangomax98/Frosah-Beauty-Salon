import { Link } from "react-router";
import { IMAGES } from "@/content/images";
import { img800 } from "@/lib/format";

/**
 * Inline SVG route line from JNIA to a BnB pin. The stroke draws on with scroll via the `--p`
 * custom property set on an ancestor (see useScrollProgress). Under reduced motion `--p` is 1.
 * The final pin "opens" into a small property preview card.
 */
const STOPS = [
  { x: 60, y: 150, label: "JNIA", sub: "Arrivals" },
  { x: 330, y: 70, label: "Masaki", sub: "Peninsula" },
  { x: 560, y: 120, label: "City Centre", sub: "Posta" },
  { x: 790, y: 60, label: "Kigamboni", sub: "Over the bridge" },
];
const END = { x: 960, y: 140 };
// Path length is roughly 1,150 units; we set dasharray to a safe upper bound.
const LEN = 1400;
const PATH = `M${STOPS[0]!.x} ${STOPS[0]!.y} C 160 150, 220 70, ${STOPS[1]!.x} ${STOPS[1]!.y} S 500 120, ${STOPS[2]!.x} ${STOPS[2]!.y} S 700 60, ${STOPS[3]!.x} ${STOPS[3]!.y} S 920 140, ${END.x} ${END.y}`;

export function RouteMap({ className = "", stayName = "Masaki sea-view apartment", stayHref = "/stays" }: { className?: string; stayName?: string; stayHref?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="false">
      <svg viewBox="0 0 1000 200" className="block h-auto w-full overflow-visible" role="img" aria-label="Route from JNIA airport through Masaki, City Centre and Kigamboni to your stay">
        {/* faint full route underneath */}
        <path d={PATH} fill="none" stroke="var(--color-brand)" strokeOpacity="0.18" strokeWidth="2" strokeDasharray="4 8" />
        {/* drawn-on route */}
        <path
          d={PATH}
          fill="none"
          stroke="var(--color-orange)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={LEN}
          style={{ strokeDashoffset: `calc(${LEN} * (1 - clamp(0, (var(--p, 1) - 0.12) / 0.7, 1)))` }}
        />
        {STOPS.map((s, i) => {
          const appearAt = 0.12 + i * 0.17;
          return (
            <g key={s.label} style={{ opacity: `clamp(0, (var(--p, 1) - ${appearAt}) / 0.08, 1)` }}>
              <circle cx={s.x} cy={s.y} r="11" fill="var(--color-paper)" stroke="var(--color-brand)" strokeWidth="4" />
              <circle cx={s.x} cy={s.y} r="4" fill="var(--color-orange)" />
              <text x={s.x} y={s.y + (i % 2 === 0 ? 34 : -22)} textAnchor="middle" fontFamily="var(--font-display)" fontSize="22" fill="var(--color-brand)" letterSpacing="0.5">
                {s.label.toUpperCase()}
              </text>
              <text x={s.x} y={s.y + (i % 2 === 0 ? 52 : -40)} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="12" fill="var(--color-ink-soft)">
                {s.sub}
              </text>
            </g>
          );
        })}
        {/* end pin: house marker that scales open */}
        <g style={{ opacity: "clamp(0, (var(--p, 1) - 0.78) / 0.1, 1)", transform: "translate(960px, 140px) scale(clamp(0.2, (var(--p, 1) - 0.78) / 0.15, 1))", transformOrigin: "0 0" }}>
          <path d="M-18 4 L0 -16 L18 4 V22 H-18 Z" fill="var(--color-orange)" stroke="var(--color-paper)" strokeWidth="3" />
          <rect x="-5" y="8" width="10" height="14" fill="var(--color-paper)" />
        </g>
      </svg>
      {/* Property preview card that "opens" from the last pin */}
      <Link
        to={stayHref}
        className="absolute right-0 bottom-full mb-2 flex w-56 origin-bottom-right items-stretch gap-0 border-2 border-brand bg-paper text-left shadow-hard no-underline hover:bg-cream sm:w-64"
        style={{ opacity: "clamp(0, (var(--p, 1) - 0.86) / 0.12, 1)", transform: "scale(clamp(0.6, 0.6 + (var(--p, 1) - 0.86) / 0.12 * 0.4, 1))" }}
      >
        <img src={img800(IMAGES.stays[0])} alt="" width="96" height="96" loading="lazy" className="h-24 w-24 shrink-0 object-cover" />
        <span className="flex flex-col justify-center px-3 py-2">
          <span className="eyebrow">Your bed tonight</span>
          <span className="font-display text-lg leading-tight text-brand uppercase">{stayName}</span>
          <span className="text-xs text-ink-soft">Masaki · 2 min from Slipway</span>
        </span>
      </Link>
    </div>
  );
}
