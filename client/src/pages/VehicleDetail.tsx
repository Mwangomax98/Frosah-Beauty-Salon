import { Link, useParams, useSearchParams } from "react-router";
import { useVehicle, useSettings } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { useCurrency } from "@/lib/currency";
import { Gallery } from "@/components/Gallery";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { PageLoading, ErrorState } from "@/components/States";
import { FALLBACK_CAR } from "@/content/images";
import NotFound from "./NotFound";
import { ApiError } from "@/lib/api";

export default function VehicleDetail() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const q = useVehicle(slug);
  const { fmt, fmtBoth } = useCurrency();
  const { data: settings } = useSettings();
  useSeo({ title: q.data ? `${q.data.name} — hire in Dar es Salaam` : "Vehicle", description: q.data?.description.slice(0, 150) });

  if (q.isPending) return <PageLoading />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.status === 404) return <NotFound />;
    return (
      <div className="container-x py-16">
        <ErrorState error={q.error} retry={() => q.refetch()} />
      </div>
    );
  }
  const v = q.data;
  const images = v.images.length ? v.images : [FALLBACK_CAR];
  const bookParams = new URLSearchParams({ vehicle: v.slug });
  for (const k of ["from", "to", "rentalType"]) if (sp.get(k)) bookParams.set(k, sp.get(k)!);

  return (
    <article className="container-x py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link to="/cars" className="link-underline">
          Fleet
        </Link>{" "}
        / {v.name}
      </nav>
      <div className="mt-4 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Gallery images={images} alt={v.name} />
          <h1 className="mt-8 text-5xl sm:text-6xl">{v.name}</h1>
          <p className="mt-1 text-sm font-bold tracking-wider text-ink-soft uppercase">
            {v.category} · {v.transmission} · {v.drive} · {v.fuel}
          </p>
          <p className="mt-6 max-w-2xl text-lg">{v.description}</p>

          <h2 className="mt-10 text-3xl">Specs</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t-2 border-line pt-4 sm:grid-cols-3">
            {[
              ["Seats", v.seats],
              ["Bags", v.bags],
              ["Transmission", v.transmission],
              ["Drive", v.drive],
              ["Fuel", v.fuel],
              ["Deposit", fmt(v.depositTzs)],
            ].map(([k, val]) => (
              <div key={String(k)}>
                <dt className="text-xs font-bold tracking-wider text-ink-soft uppercase">{k}</dt>
                <dd className="font-display text-2xl text-brand capitalize">{val}</dd>
              </div>
            ))}
          </dl>
          {v.features.length > 0 && (
            <>
              <h2 className="mt-10 text-3xl">What's in it</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {v.features.map((f) => (
                  <li key={f} className="chip text-sm">
                    {f}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2 className="mt-10 text-3xl">Mileage policy</h2>
          <p className="mt-3 max-w-2xl">{v.mileagePolicy}</p>
          <div className="mt-10">
            <AvailabilityCalendar blocked={v.blocked} />
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="sticky top-24 border-2 border-brand bg-white p-5 shadow-hard">
            <p className="eyebrow">Per day</p>
            <p className="font-display text-5xl text-orange">{fmt(v.pricePerDayTzs)}</p>
            <p className="text-sm text-ink-soft">{fmtBoth(v.pricePerDayTzs)}</p>
            <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
              {v.pricePerWeekTzs && (
                <div className="flex justify-between py-2">
                  <dt>Per week</dt>
                  <dd className="font-bold">{fmt(v.pricePerWeekTzs)}</dd>
                </div>
              )}
              {v.pricePerMonthTzs && (
                <div className="flex justify-between py-2">
                  <dt>Per month</dt>
                  <dd className="font-bold">{fmt(v.pricePerMonthTzs)}</dd>
                </div>
              )}
              <div className="flex justify-between py-2">
                <dt>Driver, within Dar</dt>
                <dd className="font-bold">+{fmt(settings?.driverFeeDarTzs ?? 0)} / day</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt>Driver, upcountry</dt>
                <dd className="font-bold">+{fmt(settings?.driverFeeUpcountryTzs ?? 0)} / day</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt>Refundable deposit</dt>
                <dd className="font-bold">{fmt(v.depositTzs)}</dd>
              </div>
            </dl>
            <Link to={`/book/car?${bookParams}`} className="btn-primary mt-5 w-full text-lg">
              Start booking →
            </Link>
            <p className="mt-3 text-xs text-ink-soft">No charge until you confirm. Airport delivery to JNIA included; other addresses by zone.</p>
          </div>
        </aside>
      </div>
    </article>
  );
}
