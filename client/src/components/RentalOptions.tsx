import { Link } from "react-router";
import type { RentalType, Vehicle } from "@bluesparks/shared";
import { vehicleRates } from "@bluesparks/shared";
import { useCurrency } from "@/lib/currency";
import { useSettings, FALLBACK_SETTINGS } from "@/lib/queries";
import { carWhatsappLink } from "@/lib/whatsapp";

export const RENTAL_COPY: Record<RentalType, { title: string; sw: string; blurb: string; includes: string[] }> = {
  self_drive: {
    title: "Self Drive",
    sw: "Bila dereva",
    blurb: "You take the keys and drive yourself.",
    includes: ["Full tank out, full tank back", "Unlimited km within Dar", "24/7 roadside support", "Licence + ID required, refundable deposit"],
  },
  with_driver: {
    title: "With Driver",
    sw: "Pamoja na dereva",
    blurb: "One of our professional drivers takes you around.",
    includes: ["Licensed, English & Swahili speaking driver", "Up to 12 hours a day within Dar", "No licence or deposit needed", "Upcountry trips: daily allowance added"],
  },
};

interface Props {
  vehicle: Vehicle;
  /** Extra query string (from/to) carried into the booking link. */
  params?: URLSearchParams;
  /** Highlight one option (e.g. coming from the With Driver page). */
  highlight?: RentalType;
  layout?: "stack" | "row";
}

/** The two ways to book any car, each with its own price, a booking link and a WhatsApp button. */
export function RentalOptions({ vehicle, params, highlight, layout = "stack" }: Props) {
  const { fmt, fmtBoth } = useCurrency();
  const { data } = useSettings();
  const s = data ?? FALLBACK_SETTINGS;
  const from = params?.get("from") ?? undefined;
  const to = params?.get("to") ?? undefined;

  return (
    <div className={layout === "row" ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
      {(["self_drive", "with_driver"] as const).map((type) => {
        const r = vehicleRates(vehicle, type, s);
        const copy = RENTAL_COPY[type];
        const book = new URLSearchParams(params);
        book.set("vehicle", vehicle.slug);
        book.set("rentalType", type);
        const on = highlight === type;
        return (
          <section key={type} aria-label={`${copy.title} price`} className={`flex flex-col border-2 bg-white p-5 ${on ? "border-spark shadow-hard-spark" : "border-brand shadow-hard"}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-3xl">{copy.title}</h3>
              <span className="text-xs font-bold tracking-wider text-ink-soft uppercase">{copy.sw}</span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{copy.blurb}</p>
            <p className="mt-4 leading-none">
              <span className="font-display text-5xl text-spark">{fmt(r.day)}</span>
              <span className="ml-1 text-sm text-ink-soft">/ day</span>
            </p>
            <p className="mt-1 text-xs text-ink-soft">{fmtBoth(r.day)}</p>
            {(r.week || r.month) && (
              <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
                {r.week && (
                  <div className="flex justify-between py-1.5">
                    <dt>Per week</dt>
                    <dd className="font-bold">{fmt(r.week)}</dd>
                  </div>
                )}
                {r.month && (
                  <div className="flex justify-between py-1.5">
                    <dt>Per month</dt>
                    <dd className="font-bold">{fmt(r.month)}</dd>
                  </div>
                )}
                {type === "with_driver" && s.driverFeeUpcountryTzs > 0 && (
                  <div className="flex justify-between py-1.5">
                    <dt>Upcountry allowance</dt>
                    <dd className="font-bold">+{fmt(s.driverFeeUpcountryTzs)} / day</dd>
                  </div>
                )}
                {type === "self_drive" && vehicle.depositTzs > 0 && (
                  <div className="flex justify-between py-1.5">
                    <dt>Refundable deposit</dt>
                    <dd className="font-bold">{fmt(vehicle.depositTzs)}</dd>
                  </div>
                )}
              </dl>
            )}
            <ul className="mt-3 space-y-1 text-sm">
              {copy.includes.map((i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="text-spark">✓</span>
                  {i}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
              <Link to={`/book/car?${book}`} className="btn-primary flex-1">
                Book {copy.title} →
              </Link>
              <a
                href={carWhatsappLink(s.businessWhatsapp, { vehicle, rentalType: type, from, to, priceText: `${fmt(r.day)} per day` })}
                target="_blank"
                rel="noopener"
                className="btn-ghost flex-1"
              >
                WhatsApp
              </a>
            </div>
          </section>
        );
      })}
    </div>
  );
}
