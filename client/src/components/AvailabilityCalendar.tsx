import { useState } from "react";
import { todayIso, addDays, isDateInRange } from "@bluesparks/shared";
import type { Blocked } from "@/lib/queries";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Read-only month calendar showing blocked ranges from the API (inclusive end dates). */
export function AvailabilityCalendar({ blocked, months = 2 }: { blocked: Blocked[]; months?: number }) {
  const today = todayIso();
  const [offset, setOffset] = useState(0);
  const [y0, m0] = today.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y0, m0 - 1 + offset, 1));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOffset((o) => Math.max(0, o - months))} disabled={offset === 0} aria-label="Previous months">
          ←
        </button>
        <span className="text-xs font-bold tracking-wider text-ink-soft uppercase">Availability · next 180 days</span>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOffset((o) => Math.min(4, o + months))} disabled={offset >= 4} aria-label="Next months">
          →
        </button>
      </div>
      <div className={`grid gap-6 ${months > 1 ? "sm:grid-cols-2" : ""}`}>
        {Array.from({ length: months }, (_, k) => {
          const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + k, 1));
          return <Month key={k} year={d.getUTCFullYear()} month={d.getUTCMonth()} blocked={blocked} today={today} />;
        })}
      </div>
      <p className="mt-3 flex gap-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-3 w-3 bg-white ring-1 ring-line" /> Available
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-3 w-3 bg-[repeating-linear-gradient(45deg,var(--color-brand)_0_2px,transparent_2px_5px)]" /> Booked / blocked
        </span>
      </p>
    </div>
  );
}

function Month({ year, month, blocked, today }: { year: number; month: number; blocked: Blocked[]; today: string }) {
  const firstIso = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Monday=0
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => addDays(firstIso, i))];
  return (
    <table className="w-full border-collapse text-center text-sm" aria-label={`${MONTHS[month]} ${year}`}>
      <caption className="mb-2 text-left font-display text-lg text-brand uppercase">
        {MONTHS[month]} {year}
      </caption>
      <thead>
        <tr>
          {DOW.map((d) => (
            <th key={d} scope="col" className="pb-1 text-[11px] font-bold text-ink-soft">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => (
          <tr key={r}>
            {cells.slice(r * 7, r * 7 + 7).map((iso, c) => {
              if (!iso) return <td key={c} />;
              const past = iso < today;
              const isBlocked = blocked.some((b) => isDateInRange(iso, b.start, b.end));
              return (
                <td key={c} className="p-0.5">
                  <span aria-label={`${iso}${isBlocked ? ", unavailable" : past ? ", past" : ", available"}`} className={`block py-1.5 tabular ${past ? "text-line" : isBlocked ? "bg-[repeating-linear-gradient(45deg,var(--color-brand)_0_2px,transparent_2px_5px)] text-brand" : "bg-white ring-1 ring-line"} ${iso === today ? "font-bold text-spark" : ""}`}>
                    {Number(iso.slice(-2))}
                  </span>
                </td>
              );
            })}
            {Array.from({ length: 7 - cells.slice(r * 7, r * 7 + 7).length }, (_, k) => (
              <td key={`e${k}`} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
