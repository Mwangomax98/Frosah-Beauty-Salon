import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { config } from "../../config.ts";
import { getBookingById } from "../../services/bookings.ts";
import { getPaymentByTxRef, mockCheckoutHtml, verifyAndApply } from "../../services/payments.ts";
import { ApiError, notFound } from "../../middleware/errors.ts";
import { parseQuery } from "../../middleware/validate.ts";

export const paymentsRouter = Router();

const txRefSchema = z.string().trim().min(3).max(64);

/** Mock gateway's hosted page (dev only — the route 404s when another gateway is active). */
paymentsRouter.get("/payments/mock-checkout", async (req, res) => {
  if (config.payments.gateway !== "mock") throw notFound("Page");
  const { tx_ref } = parseQuery(z.object({ tx_ref: txRefSchema }), req);
  const payment = await getPaymentByTxRef(tx_ref);
  if (!payment) throw notFound("Payment");
  const booking = await getBookingById(payment.bookingId);
  if (!booking) throw notFound("Booking");
  res.type("html").send(mockCheckoutHtml(tx_ref, payment.amountTzs, booking.reference));
});

/**
 * Redirect target after the hosted checkout AND the JSON endpoint the confirmation page polls.
 * Browser navigations (Accept: text/html) get a 302 to the client; API calls get JSON.
 */
paymentsRouter.get("/payments/verify", async (req, res) => {
  const { tx_ref } = parseQuery(z.object({ tx_ref: txRefSchema }).passthrough(), req);
  const result = await verifyAndApply(tx_ref, req.query as Record<string, unknown>);
  const wantsHtml = req.accepts(["json", "html"]) === "html";
  if (wantsHtml) {
    const outcome = result.status === "successful" ? "success" : result.status === "cancelled" ? "cancelled" : result.status === "pending" ? "pending" : "failed";
    const url = `${config.publicUrl}/booking/${encodeURIComponent(result.booking.reference)}?email=${encodeURIComponent(result.booking.customer.email)}&payment=${outcome}`;
    res.redirect(302, url);
    return;
  }
  res.json({ status: result.status, booking: result.booking });
});

/** Gateway webhooks. Flutterwave signs with the `verif-hash` header you set in its dashboard. */
paymentsRouter.post("/payments/webhook/:gateway", async (req, res) => {
  const gateway = String(req.params.gateway);
  if (gateway === "flutterwave") {
    const expected = config.payments.flutterwave.webhookHash;
    const got = String(req.headers["verif-hash"] ?? "");
    if (!expected || got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
      throw new ApiError(401, "invalid_signature", "Webhook signature mismatch");
    }
    const body = (req.body ?? {}) as { data?: { tx_ref?: string; txRef?: string }; txRef?: string };
    const txRef = body.data?.tx_ref ?? body.data?.txRef ?? body.txRef;
    if (txRef) {
      try {
        // Always re-verify with the API rather than trusting the payload.
        await verifyAndApply(String(txRef), {});
      } catch (err) {
        console.error("[payments] webhook verify failed", err);
      }
    }
    res.status(200).json({ ok: true });
    return;
  }
  if (gateway === "mock") {
    res.status(200).json({ ok: true });
    return;
  }
  throw notFound("Gateway");
});
