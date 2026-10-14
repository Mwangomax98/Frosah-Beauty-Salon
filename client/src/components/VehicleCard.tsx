import { Link } from "react-router";
import type { Vehicle } from "@bluesparks/shared";
import { useCurrency } from "@/lib/currency";
import { useT } from "@/i18n";
import { imgSrc, srcSet } from "@/lib/format";
import { FALLBACK_CAR } from "@/content/images";

interface Props {
  v: Vehicle;
  bookHref?: string;
  compact?: boolean;
  /** when set, renders a "Choose" button instead of links (booking flow) */
  onChoose?: () => void;
  chosen?: boolean;
}

export function VehicleCard({ v, bookHref, compact, onChoose, chosen }: Props) {
  const { fmt } = useCurrency();
  const { t } = useT();
  const src = imgSrc(v.images, FALLBACK_CAR);
  const weekly = v.pricePerWeekTzs && v.pricePerWeekTzs < v.pricePerDayTzs * 7 ? Math.round(100 - (v.pricePerWeekTzs / (v.pricePerDayTzs * 7)) * 100) : 0;
  return (
    <article className={`group flex flex-col border-2 bg-white ${chosen ? "border-spark shadow-hard-spark" : "border-brand"}`}>
      <Link to={`/cars/${v.slug}`} className="relative block aspect-[3/2] overflow-hidden bg-cream" tabIndex={onChoose ? -1 : 0} aria-hidden={onChoose ? true : undefined}>
        <img src={src} srcSet={srcSet(src)} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" alt={v.name} width="800" height="533" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
        <span className="absolute top-2 left-2 bg-brand px-2 py-0.5 text-[11px] font-bold tracking-wider text-paper uppercase">{v.category}</span>
        {weekly > 0 && <span className="absolute top-2 right-2 bg-spark px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase">Weekly −{weekly}%</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-2xl leading-none">
            <Link to={`/cars/${v.slug}`} className="hover:text-spark-deep">
              {v.name}
            </Link>
          </h3>
          <p className="shrink-0 text-right leading-none whitespace-nowrap">
            <span className="font-display text-2xl text-spark">{fmt(v.pricePerDayTzs)}</span>
            <span className="block text-xs text-ink-soft">{t.common.perDay}</span>
          </p>
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <Spec label={t.common.seats} value={v.seats} />
          <Spec label={t.common.bags} value={v.bags} />
          <Spec label="" value={v.transmission === "automatic" ? "Automatic" : "Manual"} />
          <Spec label="" value={v.drive} />
          <Spec label="" value={v.fuel} />
        </dl>
        {!compact && v.features.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Features">
            {v.features.slice(0, 5).map((f) => (
              <li key={f} className="chip">
                {f}
              </li>
            ))}
            {v.features.length > 5 && <li className="chip">+{v.features.length - 5}</li>}
          </ul>
        )}
        <div className="mt-auto flex gap-2 pt-4">
          {onChoose ? (
            <button type="button" onClick={onChoose} className={`${chosen ? "btn-brand" : "btn-primary"} flex-1`} aria-pressed={chosen}>
              {chosen ? "Selected ✓" : "Choose this car"}
            </button>
          ) : (
            <>
              <Link to={bookHref ?? `/book/car?vehicle=${v.slug}`} className="btn-primary flex-1">
                {t.common.book}
              </Link>
              <Link to={`/cars/${v.slug}`} className="btn-ghost">
                {t.common.viewDetails}
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1">
      <dd className="font-bold text-ink">{value}</dd>
      {label && <dt>{label}</dt>}
    </div>
  );
}
