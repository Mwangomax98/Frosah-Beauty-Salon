import { Link } from "react-router";
import { vehicleRates } from "@bluesparks/shared";
import { useDeliveryZones, useExtras, useSettings, useVehicles, FALLBACK_SETTINGS } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { useCurrency } from "@/lib/currency";
import { KangaDivider } from "@/components/KangaDivider";
import { Skeleton, ErrorState } from "@/components/States";
import { carWhatsappLink } from "@/lib/whatsapp";

export default function Prices() {
  useSeo({
    title: "Car rental prices — Self Drive and With Driver",
    description: "Blue Spark car rental price list for Dar es Salaam. Every car has two prices: Self Drive (bila dereva) and With Driver (pamoja na dereva), per day, week and month.",
  });
  const q = useVehicles();
  const extras = useExtras("car");
  const zones = useDeliveryZones();
  const { data } = useSettings();
  const s = data ?? FALLBACK_SETTINGS;
  const { fmt, currency } = useCurrency();
  const cars = [...(q.data ?? [])].sort((a, b) => a.pricePerDayTzs - b.pricePerDayTzs);

  return (
    <>
      <section className="bg-cream">
        <div className="container-x py-12 lg:py-16">
          <p className="eyebrow">Bei za kukodisha</p>
          <h1 className="mt-2 text-6xl sm:text-7xl">Rental prices.</h1>
          <p className="mt-4 max-w-2xl text-lg">
            Every car can be booked two ways, and each way has its own price: <b>Self Drive</b> — you drive — and <b>With Driver</b> — car and driver together. Prices are in {currency === "USD" ? "US dollars at today's rate (charged in shillings)" : "Tanzanian shillings"}; switch currency at the top of the page.
          </p>
        </div>
        <KangaDivider />
      </section>

      <section className="container-x py-12" aria-labelledby="table-title">
        <h2 id="table-title" className="sr-only">
          Price list
        </h2>
        {q.isPending && <Skeleton className="h-72" />}
        {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}

        {/* Phones: one card per car */}
        <ul className="grid gap-4 md:hidden">
          {cars.map((v) => {
            const self = vehicleRates(v, "self_drive", s);
            const drv = vehicleRates(v, "with_driver", s);
            return (
              <li key={v.id} className="border-2 border-brand bg-white p-4">
                <Link to={`/cars/${v.slug}`} className="text-2xl font-display text-brand">
                  {v.name}
                </Link>
                <p className="text-sm text-ink-soft">{[v.model, v.year].filter(Boolean).join(" · ")}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {(
                    [
                      ["Self Drive", self, "self_drive"],
                      ["With Driver", drv, "with_driver"],
                    ] as const
                  ).map(([label, r, type]) => (
                    <div key={type} className="bg-cream p-3">
                      <dt className="text-xs font-bold tracking-wider text-ink-soft uppercase">{label}</dt>
                      <dd>
                        <span className="font-display text-2xl text-spark">{fmt(r.day)}</span> / day
                        {r.week && <span className="block text-xs">{fmt(r.week)} / week</span>}
                        {r.month && <span className="block text-xs">{fmt(r.month)} / month</span>}
                        <Link to={`/book/car?vehicle=${v.slug}&rentalType=${type}`} className="btn-primary btn-sm mt-2 w-full">
                          Book
                        </Link>
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>

        {/* Tablet and up: one table, both options side by side */}
        {q.data && (
          <div className="table-wrap hidden border-2 border-brand bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-brand text-paper">
                  <th rowSpan={2} className="p-3 align-bottom">
                    Car
                  </th>
                  <th rowSpan={2} className="p-3 align-bottom">
                    Year
                  </th>
                  <th colSpan={3} className="border-l border-paper/20 p-3 text-center">
                    Self Drive
                  </th>
                  <th colSpan={3} className="border-l border-paper/20 p-3 text-center">
                    With Driver
                  </th>
                </tr>
                <tr className="bg-brand-deep text-xs text-paper/80">
                  {["Day", "Week", "Month", "Day", "Week", "Month"].map((h, i) => (
                    <th key={i} className={`p-2 text-right ${i % 3 === 0 ? "border-l border-paper/20" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cars.map((v) => {
                  const self = vehicleRates(v, "self_drive", s);
                  const drv = vehicleRates(v, "with_driver", s);
                  const cell = (n: number | null, strong = false) => <td className={`p-2 text-right whitespace-nowrap ${strong ? "font-bold text-spark" : ""}`}>{n ? fmt(n) : "—"}</td>;
                  return (
                    <tr key={v.id}>
                      <td className="p-3">
                        <Link to={`/cars/${v.slug}`} className="font-bold text-brand hover:text-spark-deep">
                          {v.name}
                        </Link>
                        {v.model && <span className="block text-xs text-ink-soft">{v.model}</span>}
                      </td>
                      <td className="p-3">{v.year ?? "—"}</td>
                      {cell(self.day, true)}
                      {cell(self.week)}
                      {cell(self.month)}
                      {cell(drv.day, true)}
                      {cell(drv.week)}
                      {cell(drv.month)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-soft">Weekly and monthly rates apply automatically when cheaper. Festive-season dates may be priced higher; the booking form always shows the exact total before you pay.</p>
      </section>

      <section className="bg-cream py-12" aria-labelledby="more-title">
        <div className="container-x grid gap-8 lg:grid-cols-3">
          <div>
            <h2 id="more-title" className="text-3xl">
              With Driver — upcountry
            </h2>
            <p className="mt-2 text-ink-soft">For trips outside Dar es Salaam a daily allowance covers the driver's meals and lodging.</p>
            <p className="mt-3 font-display text-4xl text-spark">+{fmt(s.driverFeeUpcountryTzs)}</p>
            <p className="text-sm text-ink-soft">per day, on top of the with-driver price</p>
          </div>
          <div>
            <h2 className="text-3xl">Delivery zones</h2>
            <p className="mt-2 text-ink-soft">JNIA airport and our pick-up points are free. Delivery to a hotel or home is charged per leg.</p>
            <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
              {zones.data?.map((z) => (
                <li key={z.id} className="flex justify-between py-2">
                  <span>{z.name}</span>
                  <b>{fmt(z.feeTzs)}</b>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl">Extras</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
              {extras.data?.map((x) => (
                <li key={x.id} className="flex justify-between gap-3 py-2">
                  <span>{x.name}</span>
                  <b className="whitespace-nowrap">
                    {fmt(x.priceTzs)}
                    <span className="font-normal text-ink-soft">{x.pricing === "per_day" ? " / day" : ""}</span>
                  </b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-x py-12 text-center">
        <h2 className="text-4xl">Ready?</h2>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/book/car" className="btn-primary">
            Book online
          </Link>
          <a href={carWhatsappLink(s.businessWhatsapp, {})} target="_blank" rel="noopener" className="btn-ghost">
            Book on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
