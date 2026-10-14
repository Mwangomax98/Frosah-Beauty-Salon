import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { AMENITY_LABELS, addDays, daysBetween } from "@bluesparks/shared";
import { useProperty } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { useCurrency } from "@/lib/currency";
import { Gallery } from "@/components/Gallery";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { DateField } from "@/components/ui/DateField";
import { Select } from "@/components/ui/Input";
import { PageLoading, ErrorState } from "@/components/States";
import { FALLBACK_STAY } from "@/content/images";
import { tomorrow } from "@/lib/format";
import { ApiError } from "@/lib/api";
import NotFound from "./NotFound";

export default function PropertyDetail() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const q = useProperty(slug);
  const { fmt, fmtBoth } = useCurrency();
  const [checkIn, setCheckIn] = useState(sp.get("checkIn") ?? tomorrow());
  const [checkOut, setCheckOut] = useState(sp.get("checkOut") ?? addDays(tomorrow(), 2));
  const [guests, setGuests] = useState(sp.get("guests") ?? "2");
  useSeo({ title: q.data ? `${q.data.name}, ${q.data.area} — short stay` : "Stay", description: q.data?.description.slice(0, 150) });

  if (q.isPending) return <PageLoading />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 404) return <NotFound />;
    return (
      <div className="container-x py-16">
        <ErrorState error={q.error} retry={() => q.refetch()} />
      </div>
    );
  }
  const p = q.data;
  const images = p.images.length ? p.images : [FALLBACK_STAY];
  const nights = daysBetween(checkIn, checkOut);
  const estimate = nights > 0 ? nights * p.pricePerNightTzs + p.cleaningFeeTzs : 0;
  const bookParams = new URLSearchParams({ property: p.slug, checkIn, checkOut, guests });
  const mapSrc = p.lat != null && p.lng != null ? `https://www.openstreetmap.org/export/embed.html?bbox=${p.lng - 0.012},${p.lat - 0.008},${p.lng + 0.012},${p.lat + 0.008}&layer=mapnik&marker=${p.lat},${p.lng}` : null;

  return (
    <article className="container-x py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link to="/stays" className="link-underline">
          Stays
        </Link>{" "}
        / {p.area} / {p.name}
      </nav>
      <div className="mt-4 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Gallery images={images} alt={p.name} />
          <p className="eyebrow mt-8">{p.area}</p>
          <h1 className="mt-1 text-5xl sm:text-6xl">{p.name}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            <b className="text-ink">{p.bedrooms}</b> bedrooms · <b className="text-ink">{p.beds}</b> beds · <b className="text-ink">{p.bathrooms}</b> bathrooms · up to <b className="text-ink">{p.maxGuests}</b> guests
          </p>
          <p className="mt-6 max-w-2xl text-lg whitespace-pre-line">{p.description}</p>

          <h2 className="mt-10 text-3xl">Amenities</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {p.amenities.map((a) => (
              <li key={a} className="border-l-4 border-spark pl-3 text-sm">
                {AMENITY_LABELS[a] ?? a}
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-3xl">House rules</h2>
          <p className="mt-3 max-w-2xl whitespace-pre-line">{p.houseRules}</p>

          <h2 className="mt-10 text-3xl">Pricing</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t-2 border-line pt-4 sm:grid-cols-3">
            <Row k="Per night" v={fmt(p.pricePerNightTzs)} />
            {p.pricePerWeekTzs && <Row k="Per week" v={fmt(p.pricePerWeekTzs)} />}
            {p.pricePerMonthTzs && <Row k="Per month" v={fmt(p.pricePerMonthTzs)} />}
            <Row k="Cleaning fee" v={p.cleaningFeeTzs ? fmt(p.cleaningFeeTzs) : "None"} />
            <Row k="Minimum stay" v={`${p.minNights} night${p.minNights > 1 ? "s" : ""}`} />
            <Row k="Payment" v={p.paymentMode === "deposit" ? `${p.depositPercent}% deposit` : p.paymentMode === "on_arrival" ? "On arrival" : "Full online"} />
          </dl>
          <p className="mt-3 text-sm text-ink-soft">Seasonal rates (Christmas, Easter, Sabasaba week) may apply to some dates; the booking review shows the exact night-by-night price. Weekly and monthly rates are applied automatically when they are cheaper.</p>

          <div className="mt-10">
            <AvailabilityCalendar blocked={p.blocked} />
          </div>

          {mapSrc && (
            <>
              <h2 className="mt-10 text-3xl">Where it is</h2>
              <p className="mt-2 text-sm text-ink-soft">{p.address}</p>
              <iframe title={`Map of ${p.name}`} src={mapSrc} className="mt-3 aspect-[16/9] w-full border-2 border-brand" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="sticky top-24 border-2 border-brand bg-white p-5 shadow-hard">
            <p className="eyebrow">Per night</p>
            <p className="font-display text-5xl text-spark">{fmt(p.pricePerNightTzs)}</p>
            <p className="text-sm text-ink-soft">{fmtBoth(p.pricePerNightTzs)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <DateField label="Check-in" value={checkIn} onChange={(v) => { setCheckIn(v); if (checkOut <= v) setCheckOut(addDays(v, p.minNights)); }} />
              <DateField label="Check-out" value={checkOut} onChange={setCheckOut} min={addDays(checkIn, 1)} />
              <Select className="col-span-2" label="Guests" value={guests} onChange={(e) => setGuests(e.target.value)} options={Array.from({ length: p.maxGuests }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
            </div>
            {nights > 0 && (
              <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
                <div className="flex justify-between py-2">
                  <dt>
                    {nights} night{nights > 1 ? "s" : ""} × {fmt(p.pricePerNightTzs)}
                  </dt>
                  <dd className="font-bold">{fmt(nights * p.pricePerNightTzs)}</dd>
                </div>
                {p.cleaningFeeTzs > 0 && (
                  <div className="flex justify-between py-2">
                    <dt>Cleaning</dt>
                    <dd className="font-bold">{fmt(p.cleaningFeeTzs)}</dd>
                  </div>
                )}
                <div className="flex justify-between py-2 text-base">
                  <dt className="font-bold">Estimate</dt>
                  <dd className="font-display text-xl text-spark">{fmt(estimate)}</dd>
                </div>
              </dl>
            )}
            {nights > 0 && nights < p.minNights && <p className="mt-2 text-xs font-bold text-danger">Minimum stay here is {p.minNights} nights.</p>}
            <Link to={`/book/stay?${bookParams}`} className="btn-primary mt-5 w-full text-lg" aria-disabled={nights < p.minNights}>
              Book this stay →
            </Link>
            <p className="mt-3 text-xs text-ink-soft">Exact total, including any seasonal rates and extras, is confirmed on the review step before you pay.</p>
          </div>
        </aside>
      </div>
    </article>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wider text-ink-soft uppercase">{k}</dt>
      <dd className="font-display text-2xl text-brand">{v}</dd>
    </div>
  );
}
