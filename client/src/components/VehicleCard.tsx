import { Link } from "react-router";
import type { RentalType, Vehicle } from "@bluesparks/shared";
import { vehicleRates } from "@bluesparks/shared";
import { useCurrency } from "@/lib/currency";
import { useSettings, FALLBACK_SETTINGS } from "@/lib/queries";
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
  /** Which booking option the visitor is looking at; that price is emphasised. */
  rentalType?: RentalType;
}

export function VehicleCard({ v, bookHref, compact, onChoose, chosen, rentalType }: Props) {
  const { fmt } = useCurrency();
  const { t } = useT();
  const { data } = useSettings();
  const settings = data ?? FALLBACK_SETTINGS;
  const self = vehicleRates(v, "self_drive", settings);
  const driven = vehicleRates(v, "with_driver", settings);
  const src = imgSrc(v.images, FALLBACK_CAR);
  const weekly = v.pricePerWeekTzs && v.pricePerWeekTzs < v.pricePerDayTzs * 7 ? Math.round(100 - (v.pricePerWeekTzs / (v.pricePerDayTzs * 7)) * 100) : 0;
  const href = (type: RentalType) => {
    const base = bookHref ?? `/book/car?vehicle=${v.slug}`;
    const [path, q = ""] = base.split("?");
    const p = new URLSearchParams(q);
    p.set("rentalType", type);
    return `${path}?${p}`;
  };
  return (
    <article className={`group flex flex-col border-2 bg-white ${chosen ? "border-spark shadow-hard-spark" : "border-brand"}`}>
      <Link to={`/cars/${v.slug}`} className="relative block aspect-[3/2] overflow-hidden bg-cream" tabIndex={onChoose ? -1 : 0} aria-hidden={onChoose ? true : undefined}>
        <img src={src} srcSet={srcSet(src)} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" alt={v.name} width="800" height="533" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
        <span className="absolute top-2 left-2 bg-brand px-2 py-0.5 text-[11px] font-bold tracking-wider text-paper uppercase">{v.category}</span>
        {weekly > 0 && <span className="absolute top-2 right-2 bg-spark px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase">Weekly −{weekly}%</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-2xl leading-none">
          <Link to={`/cars/${v.slug}`} className="hover:text-spark-deep">
            {v.name}
          </Link>
        </h3>
        {(v.model || v.year) && (
          <p className="mt-1 text-sm text-ink-soft">
            {[v.model, v.year].filter(Boolean).join(" · ")}
          </p>
        )}
        <dl className="mt-3 grid grid-cols-2 border-2 border-line text-center" aria-label="Prices per day">
          {(
            [
              ["self_drive", t.card.selfDrive, self.day],
              ["with_driver", t.card.withDriver, driven.day],
            ] as const
          ).map(([type, label, price]) => (
            <div key={type} className={`px-2 py-2 ${type === "with_driver" ? "border-l-2 border-line" : ""} ${rentalType === type ? "bg-cream" : ""}`}>
              <dt className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{label}</dt>
              <dd className="leading-tight whitespace-nowrap">
                <span className={`font-display text-xl ${rentalType && rentalType !== type ? "text-brand" : "text-spark"}`}>{fmt(price)}</span>
                <span className="block text-[11px] text-ink-soft">{t.common.perDay}</span>
              </dd>
            </div>
          ))}
        </dl>
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
        {!onChoose && (
          <Link to={`/cars/${v.slug}`} className="link-underline mt-3 self-start text-sm font-bold text-brand">
            {t.common.viewDetails} →
          </Link>
        )}
        <div className="mt-auto flex gap-2 pt-4">
          {onChoose ? (
            <button type="button" onClick={onChoose} className={`${chosen ? "btn-brand" : "btn-primary"} flex-1`} aria-pressed={chosen}>
              {chosen ? "Selected ✓" : "Choose this car"}
            </button>
          ) : (
            <>
              <Link to={href("self_drive")} aria-label={`Book ${v.name}, ${t.card.selfDrive}`} className={`${rentalType === "with_driver" ? "btn-ghost" : "btn-primary"} btn-sm flex-1`}>
                {t.card.selfDrive}
              </Link>
              <Link to={href("with_driver")} aria-label={`Book ${v.name}, ${t.card.withDriver}`} className={`${rentalType === "with_driver" ? "btn-primary" : "btn-ghost"} btn-sm flex-1`}>
                {t.card.withDriver}
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
