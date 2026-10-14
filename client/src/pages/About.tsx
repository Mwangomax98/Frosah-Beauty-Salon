import { Link } from "react-router";
import { COMPANY } from "@bluesparks/shared";
import { useSeo } from "@/lib/useSeo";
import { useSettings } from "@/lib/queries";
import { IMAGES } from "@/content/images";
import { srcSet, img800 } from "@/lib/format";
import { LogoFull } from "@/components/brand/Logo";
import { KangaDivider } from "@/components/KangaDivider";

export default function About() {
  useSeo({ title: "About Blue Spark Holdings", description: "Who runs Johnson Rentals and our short-stay apartments in Dar es Salaam, why we do it, and what we promise every guest." });
  const { data: s } = useSettings();
  const bnb = s?.bnbBrandName ?? COMPANY.staysBrand;
  return (
    <article>
      <section className="container-x grid gap-10 py-14 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-6">
          <p className="eyebrow">About</p>
          <h1 className="mt-2 text-6xl sm:text-7xl lg:text-8xl">
            We live here.
            <br />
            That's the pitch.
          </h1>
          <p className="mt-6 max-w-lg text-lg">
            {COMPANY.name} is a family company in Dar es Salaam. It started with one Prado and a cousin at the airport. It is now six cars under <b className="text-brand">{COMPANY.carsBrand}</b> and five furnished places under <b className="text-brand">{bnb}</b>, still with the same cousin at the airport.
          </p>
        </div>
        <div className="relative lg:col-span-6">
          <img src={IMAGES.about1} srcSet={srcSet(IMAGES.about1)} sizes="(min-width:1024px) 50vw, 100vw" alt="Handing over the keys to a hire car in Dar es Salaam" width="1600" height="1000" loading="eager" decoding="async" className="aspect-[4/3] w-full border-2 border-brand object-cover" />
          <LogoFull className="absolute -top-8 -right-4 hidden w-1/3 bg-white p-3 border-2 border-brand shadow-hard sm:block" />
          <img src={img800(IMAGES.about2)} alt="Coco Beach, Oyster Bay, at dusk" width="800" height="500" loading="lazy" decoding="async" className="absolute -bottom-8 -left-4 hidden w-1/2 border-2 border-brand object-cover shadow-hard-spark sm:block" />
        </div>
      </section>

      <KangaDivider />
      <section className="bg-cream py-16 lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="text-5xl">Two brands, one kitchen table.</h2>
          </div>
          <div className="prose-site max-w-2xl lg:col-span-8">
            <h3>{COMPANY.carsBrand}</h3>
            <p>Named after the grandfather who taught half the family to drive on the old Bagamoyo road. Every car is a Toyota because parts are in every town and every fundi knows them. We service at one garage in Mikocheni and we keep the receipts; ask and we will show you the book for the car you are hiring.</p>
            <h3>{bnb}</h3>
            <p>Apartments and houses we furnished ourselves, in neighbourhoods we would send our own relatives to: Masaki and Oyster Bay for the sea and the restaurants, Mikocheni for families, City Centre for work, Kigamboni for a slow weekend. Each has a generator or inverter, because the lights do go out, and a caretaker who lives close enough to come at night.</p>
            <h3>Why Dar</h3>
            <p>Because it is home, and because it is a better city than its reputation. The seafood at Coco Beach on a Sunday, the dhows off Slipway, the Kigamboni bridge at sunset, the early market at Kariakoo. We want you to see the Dar we see, with a car that starts and a bed that is made.</p>
          </div>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24">
        <p className="eyebrow">Our promise</p>
        <h2 className="mt-2 text-5xl sm:text-6xl">Five things we will always do.</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {[
            ["Meet the plane", "Flight number in, we are at arrivals, however late it lands."],
            ["Tell the truth about the price", "Shillings, itemised, before you pay. No airport fee invented at the counter."],
            ["Answer the phone", "One WhatsApp number for both companies, answered by a human."],
            ["Keep the power on", "Every stay has backup power. Every car has a charger that fits your phone."],
            ["Fix it, don't argue", "Something wrong? Say so. We would rather lose a day's rent than a guest."],
          ].map(([h, p], i) => (
            <li key={h} className="border-t-4 border-brand pt-4">
              <span className="font-display text-6xl text-spark" aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className="mt-1 text-xl">{h}</h3>
              <p className="mt-2 text-sm text-ink-soft">{p}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/cars" className="btn-primary">
            See the cars
          </Link>
          <Link to="/stays" className="btn-ghost">
            See the stays
          </Link>
          <Link to="/contact" className="btn-ghost">
            Say hello
          </Link>
        </div>
      </section>
    </article>
  );
}
