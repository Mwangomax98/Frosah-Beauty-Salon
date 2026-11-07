import { Link, useParams, useSearchParams } from "react-router";
import { useVehicle } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { useCurrency } from "@/lib/currency";
import { Gallery } from "@/components/Gallery";
import { RentalOptions } from "@/components/RentalOptions";
import { carJsonLd } from "@/lib/seoData";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { PageLoading, ErrorState } from "@/components/States";
import { FALLBACK_CAR } from "@/content/images";
import NotFound from "./NotFound";
import { ApiError } from "@/lib/api";

export default function VehicleDetail() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const q = useVehicle(slug);
  const { fmt } = useCurrency();
  useSeo({
    title: q.data ? `${q.data.name}${q.data.year ? ` ${q.data.year}` : ""} — self drive or with driver, Dar es Salaam` : "Vehicle",
    description: q.data?.description.slice(0, 150),
    jsonLd: q.data ? carJsonLd(q.data) : undefined,
  });

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
  const bookParams = new URLSearchParams();
  for (const k of ["from", "to"]) if (sp.get(k)) bookParams.set(k, sp.get(k)!);
  const highlight = sp.get("rentalType") === "with_driver" ? "with_driver" : sp.get("rentalType") === "self_drive" ? "self_drive" : undefined;

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
          {(v.model || v.year) && <p className="mt-2 text-lg text-brand">{[v.model, v.year && `Model year ${v.year}`].filter(Boolean).join(" · ")}</p>}
          {v.slug === "toyota-alphard" && (
            <Link to="/toyota-alphard" className="link-underline mt-2 inline-block font-bold text-spark-deep">
              See the full Toyota Alphard page →
            </Link>
          )}
          <p className="mt-1 text-sm font-bold tracking-wider text-ink-soft uppercase">
            {v.category} · {v.transmission} · {v.drive} · {v.fuel}
          </p>
          <p className="mt-6 max-w-2xl text-lg">{v.description}</p>

          <h2 className="mt-10 text-3xl">Specs</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t-2 border-line pt-4 sm:grid-cols-3">
            {[
              ["Model", v.model || "—"],
              ["Year", v.year ?? "—"],
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
          <div className="sticky top-24">
            <p className="eyebrow">Choose how you want to rent</p>
            <h2 className="mt-1 mb-4 text-3xl">Two options, two prices</h2>
            <RentalOptions vehicle={v} params={bookParams} highlight={highlight} />
            <p className="mt-3 text-xs text-ink-soft">No charge until you confirm. Airport delivery to JNIA included; other addresses by zone.</p>
          </div>
        </aside>
      </div>
    </article>
  );
}
