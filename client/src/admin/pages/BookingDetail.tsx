import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Booking, BookingStatus, PaymentStatus } from "@bluesparks/shared";
import { useAdminBooking } from "../api";
import { PageHead, StatusBadge, PayBadge, ConfirmButton } from "../components";
import { api, errorMessage, getAdminToken } from "@/lib/api";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, PageLoading } from "@/components/States";
import { useCurrency } from "@/lib/currency";
import { QuoteTable } from "@/pages/book/shared";
import { fmtTimestamp, waLink } from "@/lib/format";

type Patch = { status?: BookingStatus; paymentStatus?: PaymentStatus; adminNotes?: string; startDate?: string; endDate?: string; startTime?: string | null; endTime?: string | null; customer?: Booking["customer"] };

export default function BookingDetail() {
  const { id } = useParams();
  const q = useAdminBooking(id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { fmt } = useCurrency();
  const [edit, setEdit] = useState<Patch>({});
  useEffect(() => {
    if (q.data) setEdit({ startDate: q.data.startDate, endDate: q.data.endDate, startTime: q.data.startTime ?? "", endTime: q.data.endTime ?? "", adminNotes: q.data.adminNotes, customer: { ...q.data.customer }, paymentStatus: q.data.paymentStatus });
  }, [q.data]);

  const save = useMutation({
    mutationFn: (body: Patch) => api.patch<Booking>(`/admin/bookings/${id}`, body),
    onSuccess: (b) => {
      qc.setQueryData(["admin-booking", id], b);
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast("Saved", "ok");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  if (q.isPending) return <PageLoading />;
  if (q.isError) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const b = q.data;
  const token = getAdminToken();
  const docUrl = (path: string) => `/api/admin/documents/${encodeURIComponent(path)}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  return (
    <>
      <PageHead
        title={b.reference}
        actions={
          <>
            <a href={waLink(b.customer.phone, `Habari ${b.customer.fullName.split(" ")[0]}, this is Bluesparks about booking ${b.reference}.`)} target="_blank" rel="noopener" className="btn-ghost btn-sm">
              WhatsApp customer
            </a>
            {b.status === "pending" && <ConfirmButton label="Confirm booking" variant="primary" title="Confirm this booking?" body="The customer gets a confirmation email and WhatsApp." onConfirm={() => save.mutate({ status: "confirmed" })} />}
            {b.status === "confirmed" && <ConfirmButton label="Mark completed" variant="primary" title="Mark as completed?" onConfirm={() => save.mutate({ status: "completed" })} />}
            {b.status !== "cancelled" && b.status !== "completed" && <ConfirmButton label="Cancel booking" title="Cancel this booking?" body="This frees the dates. Refunds are handled separately." onConfirm={() => save.mutate({ status: "cancelled" })} />}
          </>
        }
      >
        <span className="uppercase">{b.service}</span> · {b.itemName} · created {fmtTimestamp(b.createdAt)} · <StatusBadge s={b.status} /> <PayBadge s={b.paymentStatus} />
      </PageHead>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <form
            className="space-y-4 border-2 border-line bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ ...edit, startTime: edit.startTime || null, endTime: edit.endTime || null });
            }}
          >
            <h2 className="text-xl">Dates & customer</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input label="Start" type="date" value={edit.startDate ?? ""} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} />
              <Input label="Start time" type="time" value={edit.startTime ?? ""} onChange={(e) => setEdit({ ...edit, startTime: e.target.value })} />
              <Input label="End" type="date" value={edit.endDate ?? ""} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} />
              <Input label="End time" type="time" value={edit.endTime ?? ""} onChange={(e) => setEdit({ ...edit, endTime: e.target.value })} />
            </div>
            <p className="text-xs text-ink-soft">Date changes are re-checked against availability on save.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Full name" value={edit.customer?.fullName ?? ""} onChange={(e) => setEdit({ ...edit, customer: { ...edit.customer!, fullName: e.target.value } })} />
              <Input label="Phone" value={edit.customer?.phone ?? ""} onChange={(e) => setEdit({ ...edit, customer: { ...edit.customer!, phone: e.target.value } })} />
              <Input label="Email" type="email" value={edit.customer?.email ?? ""} onChange={(e) => setEdit({ ...edit, customer: { ...edit.customer!, email: e.target.value } })} />
              <Input label="Country" value={edit.customer?.country ?? ""} onChange={(e) => setEdit({ ...edit, customer: { ...edit.customer!, country: e.target.value } })} />
            </div>
            <Select label="Payment status" value={edit.paymentStatus ?? b.paymentStatus} onChange={(e) => setEdit({ ...edit, paymentStatus: e.target.value as PaymentStatus })} options={["unpaid", "paid", "deposit_paid", "pay_on_arrival"].map((s) => ({ value: s, label: s.replace(/_/g, " ") }))} />
            <Textarea label="Admin notes" value={edit.adminNotes ?? ""} onChange={(e) => setEdit({ ...edit, adminNotes: e.target.value })} hint="Internal only. Never shown to the customer." />
            <Button type="submit" loading={save.isPending}>
              Save changes
            </Button>
          </form>

          <QuoteTable quote={b.quote} title={`Price · ${fmt(b.totalTzs)}`} />
        </div>

        <aside className="space-y-6 lg:col-span-5">
          <section className="border-2 border-line bg-white p-4">
            <h2 className="text-xl">Details</h2>
            <dl className="mt-2 divide-y divide-line text-sm">
              {Object.entries(b.details).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-1.5">
                  <dt className="text-ink-soft">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</dt>
                  <dd className="text-right font-medium break-all">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}</dd>
                </div>
              ))}
              {b.customer.specialRequests && (
                <div className="py-1.5">
                  <dt className="text-ink-soft">special requests</dt>
                  <dd className="mt-0.5">{b.customer.specialRequests}</dd>
                </div>
              )}
              {b.promoCode && (
                <div className="flex justify-between py-1.5">
                  <dt className="text-ink-soft">promo</dt>
                  <dd className="font-mono">{b.promoCode}</dd>
                </div>
              )}
              {b.bundleWithBookingId && (
                <div className="flex justify-between py-1.5">
                  <dt className="text-ink-soft">bundled with</dt>
                  <dd>
                    <Link to={`/admin/bookings/${b.bundleWithBookingId}`} className="link-underline">
                      #{b.bundleWithBookingId}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>
          <section className="border-2 border-line bg-white p-4">
            <h2 className="text-xl">Documents</h2>
            {b.documents.length === 0 && <p className="mt-2 text-sm text-ink-soft">None uploaded.</p>}
            <ul className="mt-2 space-y-1 text-sm">
              {b.documents.map((d) => (
                <li key={d.path}>
                  <a href={docUrl(d.path)} target="_blank" rel="noopener" className="link-underline">
                    {d.kind}: {d.originalName}
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section className="border-2 border-line bg-white p-4">
            <h2 className="text-xl">Extras</h2>
            {b.extras.length === 0 && <p className="mt-2 text-sm text-ink-soft">None.</p>}
            <ul className="mt-2 text-sm">
              {b.extras.map((x) => (
                <li key={x.extraId} className="flex justify-between py-1">
                  <span>
                    {x.name} × {x.qty}
                  </span>
                  <span className="tabular">{fmt(x.totalTzs)}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
