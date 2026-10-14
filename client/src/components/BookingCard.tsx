import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { STAY_AREAS, addDays } from "@bluesparks/shared";
import { Tabs } from "./ui/Tabs";
import { DateField } from "./ui/DateField";
import { Select } from "./ui/Input";
import { useT } from "@/i18n";
import { today, tomorrow } from "@/lib/format";

type Tab = "car" | "stay";

/** Boarding-pass style booking card for the hero. Brand-coloured stub + perforated edge. */
export function BookingCard({ className = "", initialTab = "car" }: { className?: string; initialTab?: Tab }) {
  const { t } = useT();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [from, setFrom] = useState(tomorrow());
  const [to, setTo] = useState(addDays(tomorrow(), 3));
  const [rentalType, setRentalType] = useState<"self_drive" | "with_driver">("self_drive");
  const [checkIn, setCheckIn] = useState(tomorrow());
  const [checkOut, setCheckOut] = useState(addDays(tomorrow(), 2));
  const [guests, setGuests] = useState("2");
  const [area, setArea] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (tab === "car") {
      sp.set("from", from);
      sp.set("to", to < from ? from : to);
      sp.set("rentalType", rentalType);
      nav(`/cars?${sp}`);
    } else {
      sp.set("checkIn", checkIn);
      sp.set("checkOut", checkOut <= checkIn ? addDays(checkIn, 1) : checkOut);
      sp.set("guests", guests);
      if (area) sp.set("area", area);
      nav(`/stays?${sp}`);
    }
  };

  return (
    <form onSubmit={submit} className={`flex w-full max-w-md overflow-hidden rounded-sm bg-white shadow-hard ${className}`} aria-label="Quick booking">
      {/* Brand stub with perforated edge */}
      <div className="relative hidden w-14 shrink-0 bg-brand xs:block" aria-hidden="true">
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 font-display text-lg whitespace-nowrap text-paper/90 uppercase">{t.card.stub}</span>
        <span className="absolute top-3 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-spark" />
        <span className="absolute bottom-3 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-spark" />
        <span className="ticket-edge absolute top-0 right-0 h-full w-3 [--ticket-bg:var(--color-brand)]" style={{ backgroundColor: "white" }} />
      </div>
      <div className="min-w-0 flex-1">
        <Tabs
          variant="ticket"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "car", label: t.card.rentCar },
            { id: "stay", label: t.card.bookStay },
          ]}
        />
        <div className="p-4 sm:p-5">
          {tab === "car" ? (
            <div role="tabpanel" className="grid grid-cols-2 gap-3">
              <DateField label={t.card.pickup} value={from} onChange={(v) => { setFrom(v); if (to < v) setTo(addDays(v, 1)); }} />
              <DateField label={t.card.return} value={to} onChange={setTo} min={from || today()} />
              <fieldset className="col-span-2">
                <legend className="label">Drive</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["self_drive", "with_driver"] as const).map((v) => (
                    <label key={v} className={`cursor-pointer rounded-sm border-2 px-3 py-2 text-center text-sm font-bold focus-within:outline-2 focus-within:outline-spark focus-within:outline-offset-2 ${rentalType === v ? "border-brand bg-brand text-paper" : "border-line text-brand hover:border-brand"}`}>
                      <input type="radio" name="rentalType" value={v} className="sr-only" checked={rentalType === v} onChange={() => setRentalType(v)} />
                      {v === "self_drive" ? t.card.selfDrive : t.card.withDriver}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="submit" className="btn-primary col-span-2 mt-1 w-full text-lg">
                {t.card.findCars} →
              </button>
            </div>
          ) : (
            <div role="tabpanel" className="grid grid-cols-2 gap-3">
              <DateField label={t.card.checkIn} value={checkIn} onChange={(v) => { setCheckIn(v); if (checkOut <= v) setCheckOut(addDays(v, 1)); }} />
              <DateField label={t.card.checkOut} value={checkOut} onChange={setCheckOut} min={checkIn ? addDays(checkIn, 1) : tomorrow()} />
              <Select label={t.card.guests} value={guests} onChange={(e) => setGuests(e.target.value)} options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: String(n) }))} />
              <Select label={t.card.area} value={area} onChange={(e) => setArea(e.target.value)} placeholder={t.card.anyArea} options={STAY_AREAS.map((a) => ({ value: a, label: a }))} />
              <button type="submit" className="btn-primary col-span-2 mt-1 w-full text-lg">
                {t.card.findStays} →
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
