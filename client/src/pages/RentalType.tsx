import { Link } from "react-router";
import type { RentalType } from "@bluesparks/shared";
import { vehicleRates } from "@bluesparks/shared";
import { useSettings, useVehicles, FALLBACK_SETTINGS } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { useCurrency } from "@/lib/currency";
import { VehicleCard } from "@/components/VehicleCard";
import { KangaDivider } from "@/components/KangaDivider";
import { RENTAL_COPY } from "@/components/RentalOptions";
import { Skeleton, ErrorState, EmptyState } from "@/components/States";
import { carWhatsappLink } from "@/lib/whatsapp";
import { faqJsonLd } from "@/lib/seoData";

const PAGE: Record<RentalType, { seoTitle: string; seoDesc: string; headline: string; intro: string; steps: [string, string][]; faq: { q: string; a: string }[]; other: { to: string; label: string } }> = {
  self_drive: {
    seoTitle: "Self drive car hire in Dar es Salaam",
    seoDesc: "Rent a car without a driver in Dar es Salaam. Self drive prices per day, week and month for every car. Airport pickup at JNIA, unlimited km in Dar. Book online or on WhatsApp 0625 102 051.",
    headline: "Self Drive.",
    intro: "Kukodisha gari bila dereva. Take the keys at the airport or your hotel and drive yourself. Every car below shows its own self-drive price.",
    steps: [
      ["Choose a car and dates", "Pick the car, the pick-up and the return date. The price updates as you go."],
      ["Upload licence + ID", "A photo of your driving licence and passport or national ID. Takes a minute."],
      ["Collect and drive", "We hand over the keys at JNIA, your hotel or our office. Full tank, spare wheel, our number on the dash."],
    ],
    faq: [
      { q: "What do I need to rent a car without a driver?", a: "A valid driving licence (Tanzanian, EAC, or foreign in English for up to 90 days), a passport or national ID, and a refundable deposit. The driver must be 23 or older with two years on the licence." },
      { q: "Is the deposit refundable?", a: "Yes, in full within three working days of the car coming back in the same condition it left." },
      { q: "Can I drive outside Dar es Salaam?", a: "Yes. Tell us where you are going when you book. Upcountry mileage limits are shown on each car's page." },
    ],
    other: { to: "/with-driver", label: "Rather not drive? See With Driver prices →" },
  },
  with_driver: {
    seoTitle: "Car hire with driver in Dar es Salaam",
    seoDesc: "Rent a car with a professional driver in Dar es Salaam. With-driver prices per day for every car, including the Toyota Alphard. Airport transfers, weddings, business and upcountry trips.",
    headline: "With Driver.",
    intro: "Kukodisha gari pamoja na dereva. Sit back while one of our drivers handles Dar traffic. Every car below shows its own with-driver price — car and driver together.",
    steps: [
      ["Choose a car and dates", "Pick the car and the days you need it. Within Dar or upcountry."],
      ["Tell us the plan", "Flight number, hotel, meetings, the wedding venue — whatever helps the driver plan the day."],
      ["Get picked up", "Your driver meets you at JNIA arrivals or your door, on time, in a clean car."],
    ],
    faq: [
      { q: "What is included in the with-driver price?", a: "The car and a licensed, English and Swahili speaking driver for up to 12 hours a day within Dar es Salaam. Fuel is paid by the customer. No licence or deposit is needed." },
      { q: "Can the driver take us upcountry?", a: "Yes. Choose \"Upcountry\" when booking; a daily allowance for the driver's meals and lodging is added to the price." },
      { q: "Do you do airport transfers and weddings?", a: "Yes — airport pickups, weddings, corporate guests and family tours are most of our with-driver bookings. The Toyota Alphard is the favourite for VIP guests." },
    ],
    other: { to: "/self-drive", label: "Prefer to drive yourself? See Self Drive prices →" },
  },
};

export default function RentalTypePage({ type }: { type: RentalType }) {
  const page = PAGE[type];
  const copy = RENTAL_COPY[type];
  useSeo({ title: page.seoTitle, description: page.seoDesc, jsonLd: faqJsonLd(page.faq) });
  const q = useVehicles();
  const { data } = useSettings();
  const s = data ?? FALLBACK_SETTINGS;
  const { fmt } = useCurrency();
  const sorted = [...(q.data ?? [])].sort((a, b) => vehicleRates(a, type, s).day - vehicleRates(b, type, s).day);
  const from = sorted[0] ? vehicleRates(sorted[0], type, s).day : null;

  return (
    <>
      <section className="bg-cream">
        <div className="container-x grid gap-8 py-12 lg:grid-cols-12 lg:py-16">
          <div className="lg:col-span-7">
            <p className="eyebrow">{copy.sw}</p>
            <h1 className="mt-2 text-6xl sm:text-7xl">{page.headline}</h1>
            <p className="mt-4 max-w-xl text-lg">{page.intro}</p>
            {from !== null && (
              <p className="mt-4 text-ink-soft">
                From <span className="font-display text-3xl text-spark">{fmt(from)}</span> / day
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`/book/car?rentalType=${type}`} className="btn-primary">
                Book {copy.title}
              </Link>
              <a href={carWhatsappLink(s.businessWhatsapp, { rentalType: type })} target="_blank" rel="noopener" className="btn-ghost">
                Book on WhatsApp
              </a>
            </div>
          </div>
          <div className="self-end border-2 border-brand bg-white p-5 shadow-hard lg:col-span-5">
            <h2 className="text-2xl">What's included</h2>
            <ul className="mt-3 space-y-2">
              {copy.includes.map((i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="text-spark">✓</span>
                  {i}
                </li>
              ))}
            </ul>
            <Link to={page.other.to} className="link-underline mt-4 inline-block text-sm font-bold text-brand">
              {page.other.label}
            </Link>
          </div>
        </div>
        <KangaDivider />
      </section>

      <section className="container-x py-12" aria-labelledby="prices-title">
        <h2 id="prices-title" className="text-4xl sm:text-5xl">
          {copy.title} prices
        </h2>
        <p className="mt-2 text-ink-soft">Per day, week and month for every car. Weekly and monthly rates apply automatically when they are cheaper.</p>
        {q.isPending && <Skeleton className="mt-6 h-64" />}
        {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
        {q.data && (
          <div className="table-wrap mt-6 border-2 border-brand bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand text-paper">
                <tr>
                  <th className="p-3">Car</th>
                  <th className="p-3">Year</th>
                  <th className="p-3 text-right">Per day</th>
                  <th className="hidden p-3 text-right sm:table-cell">Per week</th>
                  <th className="hidden p-3 text-right sm:table-cell">Per month</th>
                  <th className="p-3">
                    <span className="sr-only">Book</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.map((v) => {
                  const r = vehicleRates(v, type, s);
                  return (
                    <tr key={v.id}>
                      <td className="p-3">
                        <Link to={`/cars/${v.slug}?rentalType=${type}`} className="font-bold text-brand hover:text-spark-deep">
                          {v.name}
                        </Link>
                        {v.model && <span className="block text-xs text-ink-soft">{v.model}</span>}
                      </td>
                      <td className="p-3">{v.year ?? "—"}</td>
                      <td className="p-3 text-right font-bold whitespace-nowrap text-spark">{fmt(r.day)}</td>
                      <td className="hidden p-3 text-right whitespace-nowrap sm:table-cell">{r.week ? fmt(r.week) : "—"}</td>
                      <td className="hidden p-3 text-right whitespace-nowrap sm:table-cell">{r.month ? fmt(r.month) : "—"}</td>
                      <td className="p-3 text-right">
                        <Link to={`/book/car?vehicle=${v.slug}&rentalType=${type}`} className="btn-primary btn-sm">
                          Book
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-cream py-12" aria-labelledby="how-title">
        <div className="container-x">
          <h2 id="how-title" className="text-4xl sm:text-5xl">
            How it works
          </h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {page.steps.map(([title, body], i) => (
              <li key={title} className="border-t-4 border-spark pt-4">
                <span className="font-display text-5xl text-brand">{i + 1}</span>
                <h3 className="mt-2 text-2xl">{title}</h3>
                <p className="mt-1 text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-x py-12" aria-labelledby="fleet-title">
        <h2 id="fleet-title" className="text-4xl sm:text-5xl">
          Choose your car
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {q.isPending && [1, 2, 3].map((k) => <Skeleton key={k} className="aspect-[3/4]" />)}
          {sorted.map((v) => (
            <VehicleCard key={v.id} v={v} rentalType={type} />
          ))}
          {q.data?.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState title="The fleet is being updated">WhatsApp us and we'll tell you what's free.</EmptyState>
            </div>
          )}
        </div>
      </section>

      <section className="container-x pb-16" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-4xl">
          Questions
        </h2>
        <dl className="mt-4 divide-y-2 divide-line border-y-2 border-line">
          {page.faq.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="font-bold text-brand">{f.q}</dt>
              <dd className="mt-1 text-ink-soft">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm">
          Full rules: <Link to="/terms" className="link-underline font-bold text-brand">Terms &amp; Conditions</Link>
        </p>
      </section>
    </>
  );
}
