import { Link } from "react-router";
import { todayIso, addDays } from "@bluesparks/shared";
import { useAdminBookings, useRevenue } from "../api";
import { PageHead, StatusBadge, PayBadge, BarChart } from "../components";
import { useCurrency } from "@/lib/currency";
import { ErrorState, Skeleton } from "@/components/States";
import { fmtDate } from "@/lib/format";

export default function Dashboard() {
  const today = todayIso();
  const { fmt } = useCurrency();
  const todayCars = useAdminBookings({ service: "car", from: today, to: today, status: "confirmed", pageSize: 50 });
  const todayStays = useAdminBookings({ service: "stay", from: today, to: today, status: "confirmed", pageSize: 50 });
  const pending = useAdminBookings({ status: "pending", pageSize: 10 });
  const revenue = useRevenue({ from: addDays(today, -365), to: today });

  const months = (revenue.data?.byMonth ?? []).map((m) => ({ label: m.month.slice(2).replace("-", "/"), a: m.carTzs ?? m.car ?? 0, b: m.stayTzs ?? m.stay ?? 0 }));

  return (
    <>
      <PageHead title="Dashboard">{fmtDate(today)}</PageHead>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Cars · revenue 12 mo" value={revenue.data ? fmt(revenue.data.car.totalTzs) : "…"} sub={revenue.data ? `${revenue.data.car.count} bookings · ${fmt(revenue.data.car.paidTzs)} paid` : ""} />
        <Stat label="Stays · revenue 12 mo" value={revenue.data ? fmt(revenue.data.stay.totalTzs) : "…"} sub={revenue.data ? `${revenue.data.stay.count} bookings · ${fmt(revenue.data.stay.paidTzs)} paid` : ""} />
        <Stat label="Pickups today" value={todayCars.data ? String(todayCars.data.items.filter((b) => b.startDate === today).length) : "…"} sub="confirmed car handovers" />
        <Stat label="Check-ins today" value={todayStays.data ? String(todayStays.data.items.filter((b) => b.startDate === today).length) : "…"} sub="confirmed stays arriving" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h2 className="text-2xl">Revenue by month</h2>
          <div className="mt-3 border-2 border-line bg-white p-4">
            {revenue.isPending && <Skeleton className="h-56" />}
            {revenue.isError && <ErrorState error={revenue.error} retry={() => revenue.refetch()} compact />}
            {revenue.data && (months.length ? <BarChart data={months} fmt={fmt} /> : <p className="text-sm text-ink-soft">No bookings in the last twelve months yet.</p>)}
          </div>
        </section>
        <section className="lg:col-span-5">
          <h2 className="text-2xl">Today</h2>
          <div className="mt-3 divide-y divide-line border-2 border-line bg-white">
            {(todayCars.isPending || todayStays.isPending) && <Skeleton className="h-24" />}
            {[...(todayCars.data?.items ?? []), ...(todayStays.data?.items ?? [])].filter((b) => b.startDate === today || b.endDate === today).length === 0 && todayCars.data && todayStays.data && <p className="p-4 text-sm text-ink-soft">Quiet day. Nothing in or out.</p>}
            {[...(todayCars.data?.items ?? []), ...(todayStays.data?.items ?? [])]
              .filter((b) => b.startDate === today || b.endDate === today)
              .map((b) => (
                <Link key={b.id} to={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-cream">
                  <span>
                    <b>{b.startDate === today ? (b.service === "car" ? "Pickup" : "Check-in") : b.service === "car" ? "Return" : "Check-out"}</b> · {b.itemName}
                    <span className="block text-xs text-ink-soft">
                      {b.customer.fullName} · {b.startTime ?? ""}
                    </span>
                  </span>
                  <span className="font-mono text-xs">{b.reference}</span>
                </Link>
              ))}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Pending bookings</h2>
          <Link to="/admin/bookings?status=pending" className="link-underline text-sm font-bold text-brand">
            All pending →
          </Link>
        </div>
        <div className="table-wrap mt-3 border-2 border-line bg-white">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Item</th>
                <th>Customer</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {pending.data?.items.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/admin/bookings/${b.id}`} className="font-mono font-bold text-brand">
                      {b.reference}
                    </Link>
                  </td>
                  <td>{b.itemName}</td>
                  <td>
                    {b.customer.fullName}
                    <span className="block text-xs text-ink-soft">{b.customer.phone}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    {fmtDate(b.startDate, { weekday: false, year: false })} → {fmtDate(b.endDate, { weekday: false, year: false })}
                  </td>
                  <td className="tabular">{fmt(b.totalTzs)}</td>
                  <td>
                    <StatusBadge s={b.status} />
                  </td>
                  <td>
                    <PayBadge s={b.paymentStatus} />
                  </td>
                </tr>
              ))}
              {pending.data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-ink-soft">
                    Nothing pending.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-2 border-brand bg-white p-4">
      <p className="text-xs font-bold tracking-wider text-ink-soft uppercase">{label}</p>
      <p className="mt-1 font-display text-3xl text-brand">{value}</p>
      {sub && <p className="text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}
