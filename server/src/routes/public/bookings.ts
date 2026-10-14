import { Router } from "express";
import { z } from "zod";
import { forbidden, notFound } from "../../middleware/errors.ts";
import { parseBody, parseQuery } from "../../middleware/validate.ts";
import {
  carBookingSchema,
  carQuoteSchema,
  createCarBooking,
  createStayBooking,
  getBookingByReference,
  priceCar,
  priceStay,
  stayBookingSchema,
  stayQuoteSchema,
  withWhatsappLink,
  type CreateResult,
} from "../../services/bookings.ts";
import { getSettings } from "../../services/reference.ts";

export const quotesRouter = Router();

quotesRouter.post("/quote/car", async (req, res) => {
  const input = parseBody(carQuoteSchema, req);
  const { quote } = await priceCar(input, { customerEmail: input.customer?.email });
  res.json(quote);
});

quotesRouter.post("/quote/stay", async (req, res) => {
  const input = parseBody(stayQuoteSchema, req);
  const { quote } = await priceStay(input, { customerEmail: input.customer?.email });
  res.json(quote);
});

export const bookingsRouter = Router();

function send(res: import("express").Response, result: CreateResult) {
  // `whatsappLink` is on the booking and at the top level so the confirmation page can use either.
  res.status(result.existing ? 200 : 201).json({
    booking: result.booking,
    whatsappLink: result.booking.whatsappLink,
    ...(result.payment ? { payment: result.payment } : {}),
  });
}

bookingsRouter.post("/bookings/car", async (req, res) => {
  send(res, await createCarBooking(parseBody(carBookingSchema, req)));
});

bookingsRouter.post("/bookings/stay", async (req, res) => {
  send(res, await createStayBooking(parseBody(stayBookingSchema, req)));
});

bookingsRouter.get("/bookings/:reference", async (req, res) => {
  const { email } = parseQuery(z.object({ email: z.string().trim().toLowerCase().email() }), req);
  const booking = await getBookingByReference(String(req.params.reference));
  if (!booking) throw notFound("Booking");
  if (booking.customer.email.toLowerCase() !== email) throw forbidden("That email does not match this booking");
  res.json(withWhatsappLink(booking, await getSettings()));
});
