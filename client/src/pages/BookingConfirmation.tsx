import { Link, useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@bluesparks/shared";
import { COMPANY } from "@bluesparks/shared";
import { api } from "@/lib/api";
import { useSeo } from "@/lib/useSeo";
import { useSettings } from "@/lib/queries";
import { PageLoading, ErrorState } from "@/components/States";
import { QuoteTable } from "./book/shared";
import { fmtDateTime, waLink } from "@/lib/format";
import { KangaDivider } from "@/components/KangaDivider";

const STATUS: Record<Booking["status"], string> = { pending: "Pending confirmation", confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed" };
const PAY: Record<Booking["paymentStatus"], string> = { unpaid: "Not yet paid", paid: "Paid", deposit_paid: "Deposit paid", pay_on_arrival: "Pay on arrival" };

export default function BookingConfirmation() {
  const { reference = "" } = useParams();
  const [sp] = useSearchParams();
  const email = sp.get("email") ?? "";
  const addCar = sp.get("addCar") === "1";
  const { data: settings } = useSettings();
  useSeo({ title: `Booking ${reference}`, noindex: true });

  const q = useQuery({
    queryKey: ["booking", reference, email],
    queryFn: () => api.get<Booking & { whatsappLink?: string }>(`/bookings/${reference}`, { email }),
    enabled: !!reference && !!email,
  });

  if (!email)
    return (
      <div className="container-x py-16">
        <ErrorState error={new Error("Open this page from the link in your confirmation email.")} />
      </div>
    );
  if (q.isPending) return <PageLoading />;
  if (q.isError)
    return (
      <div className="container-x py-16">
        <ErrorState error={q.error} retry={() => q.refetch()} />
      </div>
    );
  const b = q.data;
  const isStay = b.service === "stay";
  const d = b.details as Record<string, string | undefined>;
  const wa = b.whatsappLink ?? waLink(settings?.businessWhatsapp ?? "", `Habari, this is ${b.customer.fullName} about booking ${b.reference}.`);
  const bundleHref = isStay ? `/book/car?from=${b.startDate}&to=${b.endDate}&bundleWith=${b.reference}` : `/book/stay?checkIn=${b.startDate}&checkOut=${b.endDate}&bundleWith=${b.reference}`;

  return (
    <article className="container-x py-10 lg:py-14">
      <p className="eyebrow">{b.status === "cancelled" ? "Cancelled" : "Asante — booking received"}</p>
      <h1 className="mt-2 text-6xl break-all sm:text-8xl">{b.reference}</h1>
      <p className="mt-3 max-w-xl text-lg">
        {b.status === "confirmed" ? "Confirmed. " : b.status === "pending" ? "We're checking it now and will confirm on WhatsApp and email shortly. " : ""}
        {isStay ? `Your stay at ${b.itemName}` : `Your ${b.itemName}`} is in the diary under <b>{b.customer.fullName}</b>.
      </p>

      {addCar && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-2 border-orange bg-white p-5 shadow-hard-orange">
          <div>
            <p className="eyebrow">Next</p>
            <p className="text-xl font-bold text-brand">Now let's get you a car for the same dates — {settings?.bundleDiscountPercent ?? 10}% off.</p>
          </div>
          <Link to={bundleHref} className="btn-primary">
            Add a car →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <dl className="grid grid-cols-2 gap-4 border-2 border-brand bg-white p-5 sm:grid-cols-3">
            <Item k={isStay ? "Check-in" : "Pick-up"} v={fmtDateTime(b.startDate, b.startTime)} />
            <Item k={isStay ? "Check-out" : "Return"} v={fmtDateTime(b.endDate, b.endTime)} />
            <Item k="Status" v={STATUS[b.status]} />
            <Item k="Payment" v={PAY[b.paymentStatus]} />
            <Item k="Guest" v={b.customer.fullName} />
            <Item k="Phone" v={b.customer.phone} />
            {!isStay && d.pickupLocation && <Item k="Pick-up at" v={String(d.pickupAddress || d.pickupLocation)} />}
            {!isStay && d.rentalType && <Item k="Type" v={d.rentalType === "with_driver" ? "With driver" : "Self-drive"} />}
            {!isStay && d.flightNumber && <Item k="Flight" v={String(d.flightNumber)} />}
            {isStay && d.guests && <Item k="Guests" v={String(d.guests)} />}
          </dl>
          <QuoteTable quote={b.quote} />
          {isStay && d.checkinInstructions && (
            <section className="border-l-4 border-orange bg-cream p-5">
              <h2 className="text-2xl">Check-in instructions</h2>
              <p className="mt-2 text-sm whitespace-pre-line">{String(d.checkinInstructions)}</p>
            </section>
          )}
          {b.customer.specialRequests && (
            <p className="text-sm text-ink-soft">
              <b>Your requests:</b> {b.customer.specialRequests}
            </p>
          )}
        </div>
        <aside className="space-y-4 lg:col-span-5">
          <div className="border-2 border-brand bg-brand p-5 text-paper">
            <h2 className="text-2xl text-paper">Questions? Just message.</h2>
            <p className="mt-2 text-sm text-paper/80">Quote {b.reference} and we'll know exactly which booking you mean.</p>
            <a href={wa} target="_blank" rel="noopener" className="btn-primary mt-4 w-full">
              WhatsApp {COMPANY.name}
            </a>
            <button type="button" onClick={() => window.print()} className="btn-paper no-print mt-3 w-full">
              Print / save as PDF
            </button>
          </div>
          <div className="no-print border-2 border-line bg-white p-5">
            <p className="eyebrow">Bundle & save {settings?.bundleDiscountPercent ?? 10}%</p>
            <h2 className="mt-1 text-2xl">{isStay ? "Add a car for these dates" : "Add a stay for these dates"}</h2>
            <p className="mt-2 text-sm text-ink-soft">{isStay ? "Parked in the compound before you arrive, or waiting at JNIA." : "A bed in Masaki, Oyster Bay or Kigamboni — the discount comes off automatically."}</p>
            <Link to={bundleHref} className="btn-brand mt-4 w-full">
              {isStay ? "Add a car" : "Add a stay"} →
            </Link>
          </div>
        </aside>
      </div>
      <KangaDivider className="mt-12" />
    </article>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wider text-ink-soft uppercase">{k}</dt>
      <dd className="font-bold text-brand">{v}</dd>
    </div>
  );
}
