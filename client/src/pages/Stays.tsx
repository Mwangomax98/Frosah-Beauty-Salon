import { useSearchParams } from "react-router";
import { STAY_AREAS, addDays, COMPANY } from "@bluesparks/shared";
import { useProperties, useSettings } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { PropertyCard } from "@/components/PropertyCard";
import { DateField } from "@/components/ui/DateField";
import { Select } from "@/components/ui/Input";
import { Skeleton, ErrorState, EmptyState } from "@/components/States";
import { KangaDivider } from "@/components/KangaDivider";
import { fmtDate, tomorrow } from "@/lib/format";
import { useT } from "@/i18n";

export default function Stays() {
  const { data: settings } = useSettings();
  const bnb = settings?.bnbBrandName ?? COMPANY.staysBrand;
  useSeo({ title: `Short-stay apartments in Dar es Salaam — ${bnb}`, description: "Furnished apartments and houses for short stays in Masaki, Oyster Bay, Mikocheni, Mbezi Beach, City Centre and Kigamboni. Backup power, Wi-Fi, airport pickup." });
  const { t } = useT();
  const [sp, setSp] = useSearchParams();
  const checkIn = sp.get("checkIn") ?? "";
  const checkOut = sp.get("checkOut") ?? "";
  const guests = sp.get("guests") ?? "";
  const area = sp.get("area") ?? "";
  const datesOk = !!checkIn && !!checkOut && checkOut > checkIn;

  const q = useProperties({ ...(datesOk ? { checkIn, checkOut } : {}), guests: guests ? Number(guests) : undefined, area: area || undefined });

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    setSp(next, { replace: true });
  };
  const bookQs = (slug: string) => {
    const p = new URLSearchParams({ property: slug });
    if (datesOk) {
      p.set("checkIn", checkIn);
      p.set("checkOut", checkOut);
    }
    if (guests) p.set("guests", guests);
    return `/book/stay?${p}`;
  };

  return (
    <>
      <section className="bg-cream">
        <div className="container-x grid gap-8 py-12 lg:grid-cols-12 lg:py-16">
          <div className="lg:col-span-5">
            <p className="eyebrow">{bnb}</p>
            <h1 className="mt-2 text-6xl sm:text-7xl">The stays.</h1>
            <p className="mt-4 max-w-md text-ink-soft">Whole places, furnished the way we would furnish our own: a proper kettle, a mosquito net that closes, a generator that starts. Minimum stays and cleaning fees are shown on each one; no surprises at checkout.</p>
          </div>
          <form className="grid grid-cols-2 gap-3 self-end bg-white p-4 shadow-hard sm:grid-cols-4 lg:col-span-7" onSubmit={(e) => e.preventDefault()} aria-label="Search stays">
            <DateField label={t.card.checkIn} value={checkIn} onChange={(v) => update({ checkIn: v, checkOut: checkOut && checkOut > v ? checkOut : addDays(v || tomorrow(), 1) })} />
            <DateField label={t.card.checkOut} value={checkOut} onChange={(v) => update({ checkOut: v })} min={checkIn ? addDays(checkIn, 1) : undefined} />
            <Select label={t.card.guests} value={guests} onChange={(e) => update({ guests: e.target.value })} placeholder="Any" options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: String(n) }))} />
            <Select label={t.card.area} value={area} onChange={(e) => update({ area: e.target.value })} placeholder={t.card.anyArea} options={STAY_AREAS.map((a) => ({ value: a, label: a }))} />
          </form>
        </div>
        <KangaDivider />
      </section>

      <section className="container-x py-10">
        <p className="border-b-2 border-line pb-4 text-sm text-ink-soft" aria-live="polite">
          {q.isPending ? "Checking the calendars…" : datesOk ? `${q.data?.length ?? 0} available ${fmtDate(checkIn, { weekday: false, year: false })} → ${fmtDate(checkOut, { weekday: false, year: false })}${area ? ` in ${area}` : ""}` : `${q.data?.length ?? 0} places${area ? ` in ${area}` : ""} · add dates to check availability`}
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {q.isPending && [1, 2, 3, 4, 5, 6].map((k) => <Skeleton key={k} className="aspect-[3/4]" />)}
          {q.isError && (
            <div className="sm:col-span-2 lg:col-span-3">
              <ErrorState error={q.error} retry={() => q.refetch()} />
            </div>
          )}
          {q.data?.map((p) => <PropertyCard key={p.id} p={p} bookHref={bookQs(p.slug)} />)}
          {q.data && q.data.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState title="Nothing free for those dates">Try a neighbouring area or shift a night. Or WhatsApp us; we sometimes have a place not yet listed.</EmptyState>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
