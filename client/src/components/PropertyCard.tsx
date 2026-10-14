import { useState } from "react";
import { Link } from "react-router";
import type { Property } from "@bluesparks/shared";
import { AMENITY_LABELS } from "@bluesparks/shared";
import { useCurrency } from "@/lib/currency";
import { useT } from "@/i18n";
import { srcSet } from "@/lib/format";
import { FALLBACK_STAY } from "@/content/images";

interface Props {
  p: Property;
  bookHref?: string;
  onChoose?: () => void;
  chosen?: boolean;
  compact?: boolean;
}

export function PropertyCard({ p, bookHref, onChoose, chosen, compact }: Props) {
  const { fmt } = useCurrency();
  const { t } = useT();
  const images = p.images.length ? p.images : [FALLBACK_STAY];
  const [i, setI] = useState(0);
  const src = images[i] ?? images[0]!;
  return (
    <article className={`group flex flex-col border-2 bg-white ${chosen ? "border-spark shadow-hard-spark" : "border-brand"}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        <Link to={`/stays/${p.slug}`} tabIndex={onChoose ? -1 : 0} aria-hidden={onChoose ? true : undefined}>
          <img src={src} srcSet={srcSet(src)} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" alt={`${p.name}, ${p.area}`} width="800" height="600" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </Link>
        <span className="absolute top-2 left-2 bg-brand px-2 py-0.5 text-[11px] font-bold tracking-wider text-paper uppercase">{p.area}</span>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" role="group" aria-label="Photos">
            {images.map((_, k) => (
              <button key={k} type="button" aria-label={`Photo ${k + 1} of ${images.length}`} aria-pressed={k === i} onClick={() => setI(k)} className={`h-2.5 w-2.5 rounded-full border border-brand ${k === i ? "bg-spark" : "bg-paper/90"}`} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-2xl leading-none">
            <Link to={`/stays/${p.slug}`} className="hover:text-spark-deep">
              {p.name}
            </Link>
          </h3>
          <p className="shrink-0 text-right leading-none whitespace-nowrap">
            <span className="font-display text-2xl text-spark">{fmt(p.pricePerNightTzs)}</span>
            <span className="block text-xs text-ink-soft">{t.common.perNight}</span>
          </p>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          <b className="text-ink">{p.bedrooms}</b> {t.common.bedrooms} · <b className="text-ink">{p.beds}</b> {t.common.beds} · <b className="text-ink">{p.bathrooms}</b> {t.common.bathrooms} · <b className="text-ink">{p.maxGuests}</b> {t.common.maxGuests}
        </p>
        {!compact && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Amenities">
            {p.amenities.slice(0, 6).map((a) => (
              <li key={a} className="chip">
                {AMENITY_LABELS[a] ?? a}
              </li>
            ))}
            {p.amenities.length > 6 && <li className="chip">+{p.amenities.length - 6}</li>}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink-soft">
          {t.common.minStay}: {p.minNights} {t.common.nights}
          {p.cleaningFeeTzs > 0 && <> · Cleaning {fmt(p.cleaningFeeTzs)}</>}
        </p>
        <div className="mt-auto flex gap-2 pt-4">
          {onChoose ? (
            <button type="button" onClick={onChoose} className={`${chosen ? "btn-brand" : "btn-primary"} flex-1`} aria-pressed={chosen}>
              {chosen ? "Selected ✓" : "Choose this stay"}
            </button>
          ) : (
            <>
              <Link to={bookHref ?? `/book/stay?property=${p.slug}`} className="btn-primary flex-1">
                {t.common.book}
              </Link>
              <Link to={`/stays/${p.slug}`} className="btn-ghost">
                {t.common.viewDetails}
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
