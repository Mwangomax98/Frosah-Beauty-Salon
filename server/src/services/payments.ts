import type { Booking } from "@bluesparks/shared";
import { config } from "../config.ts";
import { execute, pool, query, queryOne, rowToBooking, rowToPayment, toJson, withTransaction, type Queryable } from "../db.ts";
import { ApiError, notFound } from "../middleware/errors.ts";

/**
 * Payment gateways. Card details never touch this server: we only create a hosted checkout and verify
 * the result by reference afterwards.
 */
export interface CheckoutResult {
  redirectUrl: string;
}

export interface VerifyResult {
  status: "successful" | "failed" | "cancelled" | "pending";
  gatewayRef: string | null;
  amountTzs: number | null;
  raw: unknown;
}

export interface PaymentGateway {
  name: string;
  createCheckout(booking: Booking, amountTzs: number, txRef: string): Promise<CheckoutResult>;
  /** `query` is whatever the gateway appended to the redirect URL (or the webhook payload). */
  verify(txRef: string, query: Record<string, unknown>): Promise<VerifyResult>;
}

export const verifyUrl = (txRef: string) => `${config.apiPublicUrl}/api/payments/verify?tx_ref=${encodeURIComponent(txRef)}`;

// ---------- Mock gateway (local development) ----------

const mockGateway: PaymentGateway = {
  name: "mock",
  async createCheckout(_booking, _amount, txRef) {
    return { redirectUrl: `${config.apiPublicUrl}/api/payments/mock-checkout?tx_ref=${encodeURIComponent(txRef)}` };
  },
  async verify(txRef, q) {
    const outcome = String(q.mock ?? "success");
    const payment = await getPaymentByTxRef(txRef);
    return {
      status: outcome === "success" ? "successful" : outcome === "cancelled" ? "cancelled" : "failed",
      gatewayRef: `mock-${txRef}`,
      amountTzs: payment?.amountTzs ?? null,
      raw: { mock: outcome },
    };
  },
};

// ---------- Flutterwave Standard v3 ----------

interface FlwVerifyResponse {
  status: string;
  message?: string;
  data?: { id: number; tx_ref: string; status: string; amount: number; currency: string; flw_ref?: string };
}

async function flwRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.flutterwave.com/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.payments.flutterwave.secretKey}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Flutterwave ${path} failed (${res.status}): ${json.message ?? "unknown error"}`);
  return json;
}

const flutterwaveGateway: PaymentGateway = {
  name: "flutterwave",
  async createCheckout(booking, amountTzs, txRef) {
    if (!config.payments.flutterwave.secretKey) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");
    const json = await flwRequest<{ status: string; data?: { link: string } }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amountTzs,
        currency: "TZS",
        payment_options: "card,mobilemoneytanzania",
        redirect_url: verifyUrl(txRef),
        customer: { email: booking.customer.email, phonenumber: booking.customer.phone, name: booking.customer.fullName },
        customizations: {
          title: "Bluesparks Holdings",
          description: `Booking ${booking.reference} — ${booking.itemName}`,
        },
        meta: { booking_reference: booking.reference, service: booking.service },
      }),
    });
    if (json.status !== "success" || !json.data?.link) throw new Error("Flutterwave did not return a checkout link");
    return { redirectUrl: json.data.link };
  },
  async verify(txRef, q) {
    // Customer cancelled on the hosted page: Flutterwave redirects with status=cancelled and no transaction.
    if (String(q.status ?? "") === "cancelled") return { status: "cancelled", gatewayRef: null, amountTzs: null, raw: q };
    const json = await flwRequest<FlwVerifyResponse>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
    const d = json.data;
    if (!d) return { status: "pending", gatewayRef: null, amountTzs: null, raw: json };
    const ok = d.status === "successful" && d.currency === "TZS";
    return { status: ok ? "successful" : d.status === "pending" ? "pending" : "failed", gatewayRef: String(d.id), amountTzs: Number(d.amount), raw: json };
  },
};

export function getGateway(): PaymentGateway {
  return config.payments.gateway === "flutterwave" ? flutterwaveGateway : mockGateway;
}

// ---------- Persistence ----------

export async function getPaymentByTxRef(txRef: string, conn: Queryable = pool) {
  const row = await queryOne("SELECT * FROM payments WHERE tx_ref = ?", [txRef], conn);
  return row ? rowToPayment(row) : null;
}

/** Create the payments row and the hosted checkout for a booking. `amountTzs` is the deposit or full total. */
export async function initiatePayment(booking: Booking, amountTzs: number): Promise<{ redirectUrl: string; txRef: string }> {
  const gateway = getGateway();
  const [{ n }] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM payments WHERE booking_id = ?", [booking.id]);
  const txRef = `${booking.reference}-${Number(n) + 1}`;
  await execute("INSERT INTO payments (booking_id, gateway, tx_ref, amount_tzs, status) VALUES (?,?,?,?,'initiated')", [booking.id, gateway.name, txRef, amountTzs]);
  try {
    const { redirectUrl } = await gateway.createCheckout(booking, amountTzs, txRef);
    return { redirectUrl, txRef };
  } catch (err) {
    await execute("UPDATE payments SET status = 'failed', raw = ? WHERE tx_ref = ?", [toJson({ error: err instanceof Error ? err.message : String(err) }), txRef]);
    throw err;
  }
}

/**
 * Verify a transaction with the gateway and update the payment + booking.
 * Idempotent: re-verifying a successful payment changes nothing.
 */
export async function verifyAndApply(txRef: string, q: Record<string, unknown>): Promise<{ status: string; booking: Booking }> {
  const payment = await getPaymentByTxRef(txRef);
  if (!payment) throw notFound("Payment");
  const bookingRow = await queryOne("SELECT * FROM bookings WHERE id = ?", [payment.bookingId]);
  if (!bookingRow) throw notFound("Booking");

  if (payment.status === "successful") return { status: "successful", booking: rowToBooking(bookingRow) };

  const gateway = getGateway();
  if (payment.gateway !== gateway.name) throw new ApiError(400, "gateway_mismatch", "This payment was created with a different gateway");
  const result = await gateway.verify(txRef, q);

  const booking = await withTransaction(async (conn) => {
    if (result.status === "successful") {
      // Guard against tampering: the gateway must report at least the amount we asked for.
      if (result.amountTzs !== null && result.amountTzs + 0.5 < payment.amountTzs) {
        await execute("UPDATE payments SET status='failed', gateway_ref=?, raw=? WHERE id=?", [result.gatewayRef, toJson({ ...((result.raw as object) ?? {}), reason: "amount_mismatch" }), payment.id], conn);
        return rowToBooking((await queryOne("SELECT * FROM bookings WHERE id = ?", [payment.bookingId], conn))!);
      }
      await execute("UPDATE payments SET status='successful', gateway_ref=?, raw=? WHERE id=?", [result.gatewayRef, toJson(result.raw), payment.id], conn);
      const total = Number(bookingRow.total_tzs);
      const paymentStatus = payment.amountTzs < total ? "deposit_paid" : "paid";
      await execute(
        "UPDATE bookings SET payment_status = ?, status = IF(status = 'pending', 'confirmed', status) WHERE id = ?",
        [paymentStatus, payment.bookingId],
        conn,
      );
    } else if (result.status === "pending") {
      await execute("UPDATE payments SET raw=? WHERE id=?", [toJson(result.raw), payment.id], conn);
    } else {
      await execute("UPDATE payments SET status=?, gateway_ref=?, raw=? WHERE id=?", [result.status, result.gatewayRef, toJson(result.raw), payment.id], conn);
    }
    const row = await queryOne("SELECT * FROM bookings WHERE id = ?", [payment.bookingId], conn);
    return rowToBooking(row!);
  });
  return { status: result.status, booking };
}

/** Minimal hosted page for the mock gateway. */
export function mockCheckoutHtml(txRef: string, amountTzs: number, reference: string): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const base = verifyUrl(txRef);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Mock checkout</title>
<style>body{font-family:system-ui,sans-serif;background:#FAF6EF;color:#1E1A16;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#fff;padding:32px;border-radius:12px;max-width:420px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{font-size:20px;margin:0 0 8px}p{margin:0 0 20px;color:#6B6259}a{display:block;text-align:center;padding:12px;border-radius:8px;text-decoration:none;margin-bottom:10px;font-weight:600}
.pay{background:#F26B1D;color:#fff}.cancel{background:#eee;color:#1E1A16}.fail{background:#fff;color:#b00;border:1px solid #b00}</style></head>
<body><div class="card"><h1>Mock payment</h1><p>Booking <strong>${esc(reference)}</strong> · TZS ${amountTzs.toLocaleString("en-US")}<br>This page stands in for the card / mobile money gateway while PAYMENT_GATEWAY=mock.</p>
<a class="pay" href="${base}&mock=success">Pay (success)</a>
<a class="fail" href="${base}&mock=failed">Simulate failure</a>
<a class="cancel" href="${base}&mock=cancelled">Cancel</a></div></body></html>`;
}
