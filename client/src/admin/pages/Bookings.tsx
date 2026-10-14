import { Link, useSearchParams } from "react-router";
import { useAdminBookings, csvUrl } from "../api";
import { PageHead, StatusBadge, PayBadge } from "../components";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/States";
import { useCurrency } from "@/lib/currency";
import { fmtDate, fmtTimestamp } from "@/lib/format";

const PAGE = 25;

export default function Bookings() {
  const [sp, setSp] = useSearchParams();
  const { fmt } = useCurrency();
  const f = {
    service: sp.get("service") ?? "",
    status: sp.get("status") ?? "",
    paymentStatus: sp.get("paymentStatus") ?? "",
    from: sp.get("from") ?? "",
    to: sp.get("to") ?? "",
    q: sp.get("q") ?? "",
    page: Number(sp.get("page") ?? "1"),
    pageSize: PAGE,
  };
  const q = useAdminBookings(f);
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    if (k !== "page") n.delete("page");
    setSp(n, { replace: true });
  };
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE));

  return (
    <>
      <PageHead
        title="Bookings"
        actions={
          <a href={csvUrl(f)} className="btn-ghost btn-sm" download>
            Export CSV
          </a>
        }
      >
        {q.data ? `${q.data.total} matching` : "…"}
      </PageHead>
      <form className="grid grid-cols-2 gap-3 md:grid-cols-6" onSubmit={(e) => e.preventDefault()} aria-label="Filters">
        <Select label="Service" value={f.service} onChange={(e) => set("service", e.target.value)} placeholder="All" options={[{ value: "car", label: "Cars" }, { value: "stay", label: "Stays" }]} />
        <Select label="Status" value={f.status} onChange={(e) => set("status", e.target.value)} placeholder="All" options={["pending", "confirmed", "cancelled", "completed"].map((s) => ({ value: s, label: s }))} />
        <Select label="Payment" value={f.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)} placeholder="All" options={["unpaid", "paid", "deposit_paid", "pay_on_arrival"].map((s) => ({ value: s, label: s.replace(/_/g, " ") }))} />
        <Input label="From" type="date" value={f.from} onChange={(e) => set("from", e.target.value)} />
        <Input label="To" type="date" value={f.to} onChange={(e) => set("to", e.target.value)} />
        <Input label="Search" type="search" placeholder="Ref, name, email, phone" value={f.q} onChange={(e) => set("q", e.target.value)} />
      </form>

      <div className="table-wrap mt-4 border-2 border-line bg-white">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Service</th>
              <th>Item</th>
              <th>Customer</th>
              <th>Dates</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {q.isPending && (
              <tr>
                <td colSpan={9}>
                  <Skeleton className="h-10" />
                </td>
              </tr>
            )}
            {q.isError && (
              <tr>
                <td colSpan={9}>
                  <ErrorState error={q.error} retry={() => q.refetch()} compact />
                </td>
              </tr>
            )}
            {q.data?.items.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link to={`/admin/bookings/${b.id}`} className="font-mono font-bold text-brand hover:text-orange-deep">
                    {b.reference}
                  </Link>
                </td>
                <td className="uppercase">{b.service}</td>
                <td>{b.itemName}</td>
                <td>
                  {b.customer.fullName}
                  <span className="block text-xs text-ink-soft">{b.customer.phone}</span>
                </td>
                <td className="whitespace-nowrap">
                  {fmtDate(b.startDate, { weekday: false, year: false })} → {fmtDate(b.endDate, { weekday: false })}
                </td>
                <td className="tabular">{fmt(b.totalTzs)}</td>
                <td>
                  <StatusBadge s={b.status} />
                </td>
                <td>
                  <PayBadge s={b.paymentStatus} />
                </td>
                <td className="text-xs whitespace-nowrap text-ink-soft">{fmtTimestamp(b.createdAt)}</td>
              </tr>
            ))}
            {q.data?.items.length === 0 && (
              <tr>
                <td colSpan={9} className="text-ink-soft">
                  No bookings match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="mt-3 flex items-center justify-between text-sm" aria-label="Pagination">
        <Button variant="ghost" size="sm" onClick={() => set("page", String(f.page - 1))} disabled={f.page <= 1}>
          ← Prev
        </Button>
        <span>
          Page {f.page} of {pages}
        </span>
        <Button variant="ghost" size="sm" onClick={() => set("page", String(f.page + 1))} disabled={f.page >= pages}>
          Next →
        </Button>
      </nav>
    </>
  );
}
