import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { addDays, COMPANY } from "@bluesparks/shared";
import { useVehicles } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { VehicleCard } from "@/components/VehicleCard";
import { DateField } from "@/components/ui/DateField";
import { Select, SegmentedRadio } from "@/components/ui/Input";
import { Skeleton, ErrorState, EmptyState } from "@/components/States";
import { KangaDivider } from "@/components/KangaDivider";
import { fmtDate, tomorrow } from "@/lib/format";
import { useT } from "@/i18n";

type Sort = "price_asc" | "price_desc" | "seats";

export default function Cars() {
  useSeo({ title: "Car hire in Dar es Salaam — Johnson Rentals", description: "Self-drive and chauffeur-driven car hire in Dar es Salaam: Land Cruiser Prado, RAV4, Noah, Hilux, Harrier. Airport pickup at JNIA, weekly and monthly rates." });
  const { t } = useT();
  const [sp, setSp] = useSearchParams();
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const rentalType = (sp.get("rentalType") === "with_driver" ? "with_driver" : "self_drive") as "self_drive" | "with_driver";
  const [sort, setSort] = useState<Sort>("price_asc");
  const [category, setCategory] = useState("");

  const datesOk = !!from && !!to && to >= from;
  const q = useVehicles(datesOk ? { from, to } : undefined);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    setSp(next, { replace: true });
  };

  const categories = useMemo(() => Array.from(new Set((q.data ?? []).map((v) => v.category))).sort(), [q.data]);
  const list = useMemo(() => {
    let arr = (q.data ?? []).filter((v) => !category || v.category === category);
    arr = [...arr].sort((a, b) => (sort === "price_asc" ? a.pricePerDayTzs - b.pricePerDayTzs : sort === "price_desc" ? b.pricePerDayTzs - a.pricePerDayTzs : b.seats - a.seats));
    return arr;
  }, [q.data, category, sort]);

  const bookQs = (slug: string) => {
    const p = new URLSearchParams({ vehicle: slug, rentalType });
    if (datesOk) {
      p.set("from", from);
      p.set("to", to);
    }
    return `/book/car?${p}`;
  };

  return (
    <>
      <section className="bg-cream">
        <div className="container-x grid gap-8 py-12 lg:grid-cols-12 lg:py-16">
          <div className="lg:col-span-5">
            <p className="eyebrow">{COMPANY.carsBrand}</p>
            <h1 className="mt-2 text-6xl sm:text-7xl">The fleet.</h1>
            <p className="mt-4 max-w-md text-ink-soft">All Toyota, because every mechanic from Kariakoo to Kigoma can fix one. Full tank out, full tank back. Prices per day in shillings; the dollar figure follows the day's rate.</p>
          </div>
          <form className="grid grid-cols-2 gap-3 self-end bg-white p-4 shadow-hard sm:grid-cols-4 lg:col-span-7" onSubmit={(e) => e.preventDefault()} aria-label="Filter by dates">
            <DateField label={t.card.pickup} value={from} onChange={(v) => update({ from: v, to: to && to >= v ? to : addDays(v || tomorrow(), 1) })} />
            <DateField label={t.card.return} value={to} onChange={(v) => update({ to: v })} min={from || undefined} />
            <SegmentedRadio
              className="col-span-2"
              label="Drive"
              name="rentalType"
              value={rentalType}
              onChange={(v) => update({ rentalType: v })}
              options={[
                { value: "self_drive", label: t.card.selfDrive },
                { value: "with_driver", label: t.card.withDriver },
              ]}
            />
          </form>
        </div>
        <KangaDivider />
      </section>

      <section className="container-x py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line pb-4">
          <p className="text-sm text-ink-soft" aria-live="polite">
            {q.isPending ? "Checking the yard…" : datesOk ? `${list.length} available ${fmtDate(from, { weekday: false, year: false })} → ${fmtDate(to, { weekday: false, year: false })}` : `${list.length} cars · pick dates to see what's free`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Select label={<span className="sr-only">Category</span>} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="All categories" options={categories.map((c) => ({ value: c, label: c }))} className="min-w-40" />
            <Select
              label={<span className="sr-only">Sort</span>}
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              options={[
                { value: "price_asc", label: "Price: low → high" },
                { value: "price_desc", label: "Price: high → low" },
                { value: "seats", label: "Most seats" },
              ]}
              className="min-w-44"
            />
          </div>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {q.isPending && [1, 2, 3, 4, 5, 6].map((k) => <Skeleton key={k} className="aspect-[3/4]" />)}
          {q.isError && (
            <div className="sm:col-span-2 lg:col-span-3">
              <ErrorState error={q.error} retry={() => q.refetch()} />
            </div>
          )}
          {list.map((v) => (
            <VehicleCard key={v.id} v={v} bookHref={bookQs(v.slug)} />
          ))}
          {q.data && list.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState title="Nothing free on those dates">Try shifting by a day, or WhatsApp us — sometimes a car comes back early.</EmptyState>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
