import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import type { RentalType } from "@bluesparks/shared";
import { addDays, vehicleRates } from "@bluesparks/shared";
import { useSettings, useVehicle, FALLBACK_SETTINGS } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { useCurrency } from "@/lib/currency";
import { Gallery } from "@/components/Gallery";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { RentalOptions } from "@/components/RentalOptions";
import { DateField, TimeField } from "@/components/ui/DateField";
import { SegmentedRadio } from "@/components/ui/Input";
import { PageLoading } from "@/components/States";
import { KangaDivider } from "@/components/KangaDivider";
import { FALLBACK_CAR } from "@/content/images";
import { carWhatsappLink } from "@/lib/whatsapp";
import { carJsonLd } from "@/lib/seoData";
import { tomorrow } from "@/lib/format";

export const ALPHARD_SLUG = "toyota-alphard";

const OCCASIONS: [string, string][] = [
  ["VIP airport pickup", "Your guest walks out of JNIA arrivals and into a lounge seat. The driver handles the bags."],
  ["Weddings & events", "Arrive in style for the send-off, the church and the reception. Decorations welcome."],
  ["Executive transfers", "Quiet cabin for calls between meetings in Posta, Masaki and the embassies."],
  ["Family trips", "Seven seats, luggage space and reclining seats for Bagamoyo, Morogoro or the long drive north."],
];

export default function ToyotaAlphard() {
  const q = useVehicle(ALPHARD_SLUG);
  const { data } = useSettings();
  const s = data ?? FALLBACK_SETTINGS;
  const { fmt } = useCurrency();
  const nav = useNavigate();
  const v = q.data;
  useSeo({
    title: "Toyota Alphard hire in Dar es Salaam — with driver or self drive",
    description: "Hire the Toyota Alphard luxury MPV in Dar es Salaam for VIP airport pickups, weddings and executive transfers. Self drive or with driver, book online or on WhatsApp 0625 102 051.",
    image: v?.images[0],
    jsonLd: v ? carJsonLd(v, vehicleRates(v, "with_driver", s).day) : undefined,
  });

  const [from, setFrom] = useState(tomorrow());
  const [to, setTo] = useState(addDays(tomorrow(), 1));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [type, setType] = useState<RentalType>("with_driver");
  const book = (e: FormEvent) => {
    e.preventDefault();
    nav(`/book/car?${new URLSearchParams({ vehicle: ALPHARD_SLUG, rentalType: type, from, to, pickupTime, returnTime })}`);
  };

  if (q.isPending) return <PageLoading />;

  // Car not in the fleet yet (or switched off in admin): keep the page useful with a WhatsApp booking.
  if (!v) {
    return (
      <section className="container-x py-16">
        <p className="eyebrow">Luxury MPV</p>
        <h1 className="mt-2 text-6xl sm:text-7xl">Toyota Alphard</h1>
        <p className="mt-4 max-w-xl text-lg">Online booking for the Alphard is being set up. WhatsApp us your dates and we'll confirm availability and price straight away.</p>
        <a href={carWhatsappLink(s.businessWhatsapp, { vehicle: { name: "Toyota Alphard", model: "", year: null } })} target="_blank" rel="noopener" className="btn-primary mt-6">
          Book the Alphard on WhatsApp
        </a>
      </section>
    );
  }

  const self = vehicleRates(v, "self_drive", s);
  const drv = vehicleRates(v, "with_driver", s);
  const images = v.images.length ? v.images : [FALLBACK_CAR];

  return (
    <>
      <section className="bg-brand text-paper">
        <div className="container-x grid gap-10 py-12 lg:grid-cols-12 lg:py-16">
          <div className="lg:col-span-7">
            <p className="eyebrow text-sky">Blue Spark flagship · {v.category}</p>
            <h1 className="mt-2 text-6xl text-paper sm:text-8xl">Toyota Alphard</h1>
            <p className="mt-2 text-lg text-paper/80">{[v.model, v.year && `Model year ${v.year}`].filter(Boolean).join(" · ")}</p>
            <p className="mt-6 max-w-xl text-lg text-paper/90">{v.description}</p>
            <dl className="mt-8 grid max-w-md grid-cols-2 gap-4">
              <div className="border-2 border-paper/30 p-4">
                <dt className="text-xs font-bold tracking-wider text-paper/70 uppercase">With Driver</dt>
                <dd className="font-display text-3xl text-sky">{fmt(drv.day)}</dd>
                <dd className="text-xs text-paper/70">per day</dd>
              </div>
              <div className="border-2 border-paper/30 p-4">
                <dt className="text-xs font-bold tracking-wider text-paper/70 uppercase">Self Drive</dt>
                <dd className="font-display text-3xl text-sky">{fmt(self.day)}</dd>
                <dd className="text-xs text-paper/70">per day</dd>
              </div>
            </dl>
          </div>

          <form onSubmit={book} aria-label="Book the Toyota Alphard" className="self-end border-2 border-spark bg-white p-5 text-ink shadow-hard-spark lg:col-span-5">
            <h2 className="text-3xl">Book the Alphard</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <DateField label="Pick-up date" required value={from} onChange={(d) => { setFrom(d); if (to <= d) setTo(addDays(d, 1)); }} />
              <TimeField label="Time" value={pickupTime} onChange={setPickupTime} />
              <DateField label="Return date" required value={to} min={from} onChange={setTo} />
              <TimeField label="Time" value={returnTime} onChange={setReturnTime} />
              <SegmentedRadio
                className="col-span-2"
                label="Option"
                name="alphardType"
                value={type}
                onChange={setType}
                options={[
                  { value: "with_driver", label: "With Driver", hint: `${fmt(drv.day)}/day` },
                  { value: "self_drive", label: "Self Drive", hint: `${fmt(self.day)}/day` },
                ]}
              />
            </div>
            <button type="submit" className="btn-primary mt-4 w-full text-lg">
              Check price & book →
            </button>
            <a
              href={carWhatsappLink(s.businessWhatsapp, { vehicle: v, rentalType: type, from, to, pickupTime, returnTime, priceText: `${fmt(type === "with_driver" ? drv.day : self.day)} per day` })}
              target="_blank"
              rel="noopener"
              className="btn-ghost mt-2 w-full"
            >
              Book on WhatsApp
            </a>
          </form>
        </div>
      </section>

      <section className="container-x py-12">
        <Gallery images={images} alt={`Toyota Alphard ${v.year ?? ""}`.trim()} />
      </section>

      <section className="bg-cream py-12" aria-labelledby="occ-title">
        <KangaDivider />
        <div className="container-x pt-8">
          <h2 id="occ-title" className="text-4xl sm:text-5xl">
            Made for
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {OCCASIONS.map(([t, b]) => (
              <li key={t} className="border-t-4 border-spark pt-3">
                <h3 className="text-2xl">{t}</h3>
                <p className="mt-1 text-ink-soft">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-x grid gap-10 py-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h2 className="text-4xl">Specs</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t-2 border-line pt-4 sm:grid-cols-3">
            {[
              ["Model", v.model || "—"],
              ["Year", v.year ?? "—"],
              ["Seats", v.seats],
              ["Bags", v.bags],
              ["Gearbox", v.transmission],
              ["Fuel", v.fuel],
            ].map(([k, val]) => (
              <div key={String(k)}>
                <dt className="text-xs font-bold tracking-wider text-ink-soft uppercase">{k}</dt>
                <dd className="font-display text-2xl text-brand capitalize">{val}</dd>
              </div>
            ))}
          </dl>
          {v.features.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {v.features.map((f) => (
                <li key={f} className="chip text-sm">
                  {f}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-8 text-2xl">Mileage</h3>
          <p className="mt-1">{v.mileagePolicy}</p>
          <div className="mt-8">
            <AvailabilityCalendar blocked={v.blocked} />
          </div>
        </div>
        <div className="lg:col-span-6">
          <h2 className="mb-4 text-4xl">Prices</h2>
          <RentalOptions vehicle={v} highlight="with_driver" />
          <p className="mt-4 text-sm">
            <Link to="/prices" className="link-underline font-bold text-brand">
              Compare with the rest of the fleet →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
