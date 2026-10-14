import { Link } from "react-router";
import { COMPANY } from "@bluesparks/shared";
import { Hero } from "@/components/Hero";
import { KangaDivider } from "@/components/KangaDivider";
import { VehicleCard } from "@/components/VehicleCard";
import { PropertyCard } from "@/components/PropertyCard";
import { Skeleton, ErrorState, EmptyState } from "@/components/States";
import { useProperties, useSettings, useVehicles } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { IMAGES } from "@/content/images";
import { AREAS, FAQ } from "@/content/site";
import { img800, srcSet } from "@/lib/format";

export default function Home() {
  useSeo({
    title: "Blue Spark Holdings — Car hire & short stays in Dar es Salaam",
    description: "Johnson Rentals car hire (self-drive or with driver) and short-stay apartments in Dar es Salaam. Airport pickup at JNIA, stays in Masaki, Oyster Bay, Mikocheni and Kigamboni.",
  });
  const { data: settings } = useSettings();
  const vehicles = useVehicles();
  const properties = useProperties();
  const bnb = settings?.bnbBrandName ?? COMPANY.staysBrand;
  const firstStay = properties.data?.[0];

  return (
    <>
      <Hero stayName={firstStay?.name} stayHref={firstStay ? `/stays/${firstStay.slug}` : "/stays"} />

      {/* Two companies, one phone number */}
      <section className="bg-cream" aria-labelledby="two-title">
        <KangaDivider />
        <div className="container-x grid gap-10 py-16 lg:grid-cols-12 lg:gap-8 lg:py-24">
          <div className="lg:col-span-5">
            <p className="eyebrow">Who you're dealing with</p>
            <h2 id="two-title" className="mt-2 text-5xl sm:text-6xl">
              Two companies,
              <br />
              one phone number.
            </h2>
            <p className="mt-6 max-w-md text-lg">
              <b className="text-brand">{COMPANY.carsBrand}</b> hires out the cars. <b className="text-brand">{bnb}</b> keeps the apartments. Both sit under {COMPANY.name}, both answer the same WhatsApp, and the person who hands you the keys at JNIA is usually the same one who sends you the Wi-Fi password in Masaki.
            </p>
            <p className="mt-4 max-w-md text-ink-soft">We are not a franchise and not a platform. We own the cars, we furnish the flats, and we live here. Pole pole with the paperwork, haraka with the phone.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/cars" className="btn-brand">
                See the fleet
              </Link>
              <Link to="/stays" className="btn-ghost">
                See the stays
              </Link>
            </div>
          </div>
          <div className="relative lg:col-span-7">
            <div className="grid grid-cols-12 gap-3">
              <figure className="col-span-8">
                <img src={IMAGES.airport} srcSet={srcSet(IMAGES.airport)} sizes="(min-width:1024px) 40vw, 66vw" alt="Arrivals hall at Julius Nyerere International Airport" width="1600" height="1000" loading="lazy" decoding="async" className="aspect-[4/3] w-full border-2 border-brand object-cover" />
                <figcaption className="mt-1 text-xs text-ink-soft">JNIA arrivals. We wait here, not in the car park.</figcaption>
              </figure>
              <figure className="col-span-4 mt-12">
                <img src={img800(IMAGES.stays[1]!)} alt="Bedroom in an Oyster Bay apartment" width="800" height="533" loading="lazy" decoding="async" className="aspect-[3/4] w-full border-2 border-brand object-cover" />
              </figure>
              <div className="col-span-5 col-start-2 -mt-10 bg-brand p-5 text-paper shadow-hard-spark">
                <p className="font-display text-5xl text-spark">6</p>
                <p className="text-sm">cars, all Toyota, all serviced by the same garage in Mikocheni.</p>
              </div>
              <div className="col-span-5 col-start-8 -mt-4 bg-paper p-5 shadow-hard">
                <p className="font-display text-5xl text-brand">5</p>
                <p className="text-sm">apartments and houses in {AREAS.length} neighbourhoods, all with backup power.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet teaser */}
      <section className="container-x py-16 lg:py-24" aria-labelledby="fleet-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{COMPANY.carsBrand}</p>
            <h2 id="fleet-title" className="mt-2 text-5xl sm:text-6xl">
              The fleet.
            </h2>
          </div>
          <Link to="/cars" className="link-underline font-bold text-brand">
            All cars →
          </Link>
        </div>
        <p className="mt-4 max-w-xl text-ink-soft">Self-drive if you know the roundabout at Mwenge. With a driver if you'd rather not. Every car comes with a full tank, a spare, a jack that works, and our number on the dashboard.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.isPending && [1, 2, 3].map((k) => <Skeleton key={k} className="aspect-[3/4]" />)}
          {vehicles.isError && (
            <div className="sm:col-span-2 lg:col-span-3">
              <ErrorState error={vehicles.error} retry={() => vehicles.refetch()} compact />
            </div>
          )}
          {vehicles.data?.slice(0, 3).map((v) => <VehicleCard key={v.id} v={v} />)}
          {vehicles.data && vehicles.data.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState title="The fleet is being updated">Check back shortly or WhatsApp us.</EmptyState>
            </div>
          )}
        </div>
      </section>

      {/* Stays teaser — alternating cream background */}
      <section className="bg-cream py-16 lg:py-24" aria-labelledby="stays-title">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow">{bnb}</p>
              <h2 id="stays-title" className="mt-2 text-5xl sm:text-6xl">
                Somewhere to put the bags down.
              </h2>
              <p className="mt-4 text-ink-soft">Whole apartments and houses, never a shared room. Sheets we would sleep in ourselves. A generator for when TANESCO has other plans.</p>
              <Link to="/stays" className="btn-brand mt-6">
                All stays →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-2">
              {properties.isPending && [1, 2].map((k) => <Skeleton key={k} className="aspect-[3/4]" />)}
              {properties.isError && (
                <div className="sm:col-span-2">
                  <ErrorState error={properties.error} retry={() => properties.refetch()} compact />
                </div>
              )}
              {properties.data?.slice(0, 2).map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          </div>
          {properties.data && properties.data[2] && (
            <div className="mt-6 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4 lg:col-start-9">
                <PropertyCard p={properties.data[2]} compact />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works — big numerals */}
      <section className="container-x py-16 lg:py-24" aria-labelledby="how-title">
        <p className="eyebrow">How it works</p>
        <h2 id="how-title" className="mt-2 text-5xl sm:text-6xl">
          Three steps. No app to download.
        </h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3">
          {[
            ["Pick your dates", "Choose a car, a stay, or both. The price you see is the price, in shillings, with the day's dollar rate next to it."],
            ["Tell us how you arrive", "Flight number, hotel, or 'I'll be at Posta at ten'. We bring the car to you. Stays get a check-in note with the gate code and the askari's name."],
            ["Pay how you like", "M-Pesa, Tigo Pesa, Airtel Money, Halopesa or a card online. Or reserve now and pay when you collect. The confirmation lands on WhatsApp and email."],
          ].map(([h, p], i) => (
            <li key={h} className="relative border-t-4 border-brand pt-4">
              <span className="font-display text-7xl leading-none text-spark" aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className="mt-2 text-2xl">{h}</h3>
              <p className="mt-2 text-ink-soft">{p}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Cross-sell band */}
      <section className="bg-brand text-paper" aria-labelledby="bundle-title">
        <div className="container-x grid gap-8 py-14 md:grid-cols-2 md:gap-12">
          <div>
            <p className="eyebrow">Bundle</p>
            <h2 id="bundle-title" className="mt-2 text-4xl text-paper sm:text-5xl">
              Add a car to your stay.
            </h2>
            <p className="mt-3 text-paper/80">Booked a flat in Mikocheni? Add a RAV4 for the same dates and we take {settings?.bundleDiscountPercent ?? 10}% off the car. It is waiting in the compound when you arrive.</p>
            <Link to="/stays" className="btn-primary mt-5">
              Start with a stay
            </Link>
          </div>
          <div className="border-t border-paper/20 pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-12">
            <p className="eyebrow">Bundle</p>
            <h2 className="mt-2 text-4xl text-paper sm:text-5xl">Add a stay to your trip.</h2>
            <p className="mt-3 text-paper/80">Driving to Mikumi on Friday? Sleep in Oyster Bay on Thursday night and leave early. Same {settings?.bundleDiscountPercent ?? 10}% off, applied on the confirmation page.</p>
            <Link to="/cars" className="btn-paper mt-5">
              Start with a car
            </Link>
          </div>
        </div>
      </section>

      {/* Areas */}
      <section className="container-x py-16 lg:py-24" aria-labelledby="areas-title">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">Dar es Salaam</p>
            <h2 id="areas-title" className="mt-2 text-5xl sm:text-6xl">
              Where we are.
            </h2>
            <p className="mt-4 text-ink-soft">The city runs along the coast from Mbezi Beach in the north to Kigamboni in the south. Our stays sit in the neighbourhoods we would choose ourselves; our cars go anywhere with a road, and a few places without.</p>
            <figure className="mt-8">
              <img src={IMAGES.street} srcSet={srcSet(IMAGES.street)} sizes="(min-width:1024px) 40vw, 100vw" alt="Street scene in Kariakoo market, Dar es Salaam" width="1600" height="1000" loading="lazy" decoding="async" className="aspect-[16/10] w-full border-2 border-brand object-cover" />
              <figcaption className="mt-1 text-xs text-ink-soft">Kariakoo on a Saturday. Go early, take the driver.</figcaption>
            </figure>
          </div>
          <div className="lg:col-span-7">
            <ul className="divide-y-2 divide-line border-y-2 border-line">
              {AREAS.map((a, i) => (
                <li key={a.name} className="grid grid-cols-12 items-baseline gap-3 py-4">
                  <span className="col-span-2 font-display text-3xl text-spark sm:col-span-1" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link to={`/stays?area=${encodeURIComponent(a.name)}`} className="col-span-10 font-display text-2xl text-brand uppercase hover:text-spark-deep sm:col-span-4">
                    {a.name}
                  </Link>
                  <span className="col-span-10 col-start-3 text-sm text-ink-soft sm:col-span-7 sm:col-start-6">{a.note}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink-soft">Airport runs to JNIA, Terminal 2 and 3, any hour. Upcountry hires to Morogoro, Dodoma, Arusha, Mbeya and the Southern Circuit parks with a driver who knows the road.</p>
          </div>
        </div>
      </section>

      <KangaDivider />

      {/* FAQ */}
      <section className="bg-cream py-16 lg:py-24" aria-labelledby="faq-title">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Questions</p>
            <h2 id="faq-title" className="mt-2 text-5xl sm:text-6xl">
              Asked often.
            </h2>
            <p className="mt-4 text-ink-soft">Anything else, WhatsApp us. A real person answers between 07:00 and 22:00, and a sleepy one after that.</p>
          </div>
          <div className="lg:col-span-8">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b-2 border-line py-4">
                <summary className="flex items-center justify-between gap-4 font-display text-xl text-brand uppercase">
                  {f.q}
                  <span className="shrink-0 text-2xl text-spark transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
