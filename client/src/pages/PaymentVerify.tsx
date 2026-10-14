import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@bluesparks/shared";
import { api } from "@/lib/api";
import { useSeo } from "@/lib/useSeo";
import { PageLoading, ErrorState } from "@/components/States";

/** Landing page after the payment gateway. The server verifies and we forward to the confirmation. */
export default function PaymentVerify() {
  useSeo({ title: "Verifying payment", noindex: true });
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const txRef = sp.get("tx_ref") ?? "";
  const q = useQuery({
    queryKey: ["verify", txRef, sp.toString()],
    queryFn: () => api.get<{ status: string; booking: Booking }>("/payments/verify", Object.fromEntries(sp.entries())),
    enabled: !!txRef,
    retry: 2,
  });
  useEffect(() => {
    if (q.data?.booking) nav(`/booking/${q.data.booking.reference}?email=${encodeURIComponent(q.data.booking.customer.email)}`, { replace: true });
  }, [q.data, nav]);

  if (!txRef)
    return (
      <div className="container-x py-16">
        <ErrorState error={new Error("Missing payment reference.")} />
      </div>
    );
  if (q.isError)
    return (
      <div className="container-x py-16">
        <ErrorState error={q.error} retry={() => q.refetch()} />
        <p className="mt-4 text-sm text-ink-soft">
          If money left your account, don't pay again — <Link to="/contact" className="link-underline">contact us</Link> with the reference {txRef}.
        </p>
      </div>
    );
  return <PageLoading />;
}
