import crypto from "node:crypto";
import { z } from "zod";
import type { Booking, CarBookingInput, PromoCode, Quote, Service, Settings, StayBookingInput } from "@bluesparks/shared";
import {
  BOOKING_REF_PREFIX,
  applyPromo,
  isIsoDate,
  quoteCar,
  quoteStay,
  rentalDays,
  todayIso,
  type CarQuoteContext,
  type StayQuoteContext,
} from "@bluesparks/shared";
import type { PoolConnection } from "mysql2/promise";
import { execute, pool, query, queryOne, rowToBooking, toJson, withTransaction, type Queryable } from "../db.ts";
import { ApiError, badRequest, conflict, notFound } from "../middleware/errors.ts";
import { customerWhatsappText } from "../lib/email-templates.ts";
import { whatsappLink } from "../lib/whatsapp.ts";
import { findConflicts } from "./availability.ts";
import { notifyNewBookingInBackground } from "./notifications.ts";
import { initiatePayment } from "./payments.ts";
import { getProperty, getPromoByCode, getSettings, getVehicle, listDeliveryZones, listExtras, listSeasonalRates } from "./reference.ts";
import { DOCUMENT_KINDS, documentExists } from "./uploads.ts";

// ---------- Zod schemas (the contract is shared/src/types.ts) ----------

const isoDate = z.string().refine(isIsoDate, "Use the format YYYY-MM-DD");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the format HH:mm");
const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s().-]/g, ""))
  .refine((s) => /^\+?\d{9,15}$/.test(s), "Enter a phone number with country code, e.g. +255 7XX XXX XXX")
  .transform((s) => (s.startsWith("+") ? s : s.startsWith("0") ? s : `+${s}`));

const extrasSchema = z.array(z.object({ extraId: z.coerce.number().int().positive(), qty: z.coerce.number().int().min(0).max(20) })).max(30).default([]);
const promoSchema = z.string().trim().max(40).optional();
const bundleRefSchema = z.string().trim().toUpperCase().max(16).optional();
const locationSchema = z.enum(["jnia", "city_centre", "masaki", "mikocheni", "kariakoo", "kigamboni", "custom"]);

export const customerSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(160),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(190),
  phone,
  country: z.string().trim().min(2).max(80),
  specialRequests: z.string().trim().max(2000).optional(),
});

export const documentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  path: z.string().regex(/^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/, "Invalid document reference"),
  originalName: z.string().trim().max(255).default("document"),
});

export const carQuoteSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  pickupDate: isoDate,
  pickupTime: hhmm,
  returnDate: isoDate,
  returnTime: hhmm,
  pickupLocation: locationSchema,
  dropoffLocation: locationSchema,
  pickupAddress: z.string().trim().max(255).optional(),
  dropoffAddress: z.string().trim().max(255).optional(),
  deliveryZoneId: z.coerce.number().int().positive().nullable().optional(),
  rentalType: z.enum(["self_drive", "with_driver"]),
  driverScope: z.enum(["dar", "upcountry"]).optional(),
  extras: extrasSchema,
  passengers: z.coerce.number().int().min(1).max(30).default(1),
  flightNumber: z.string().trim().max(20).optional(),
  promoCode: promoSchema,
  bundleWithBookingRef: bundleRefSchema,
  customer: customerSchema.partial().optional(),
});

export const carBookingSchema = carQuoteSchema.extend({
  customer: customerSchema,
  paymentMethod: z.enum(["online", "on_arrival"]),
  currency: z.enum(["TZS", "USD"]).default("TZS"),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the rental terms" }) }),
  documents: z.array(documentSchema).max(6).default([]),
});

export const stayQuoteSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.coerce.number().int().min(1).max(30).default(1),
  arrivalTime: hhmm.optional(),
  extras: extrasSchema,
  promoCode: promoSchema,
  bundleWithBookingRef: bundleRefSchema,
  customer: customerSchema.partial().optional(),
});

export const stayBookingSchema = stayQuoteSchema.extend({
  customer: customerSchema,
  paymentMethod: z.enum(["online", "on_arrival"]),
  currency: z.enum(["TZS", "USD"]).default("TZS"),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the booking terms" }) }),
  acceptedHouseRules: z.literal(true, { errorMap: () => ({ message: "Please accept the house rules" }) }),
  documents: z.array(documentSchema).max(6).default([]),
});

export type CarQuoteRequest = z.infer<typeof carQuoteSchema>;
export type StayQuoteRequest = z.infer<typeof stayQuoteSchema>;
export type CarBookingRequest = z.infer<typeof carBookingSchema>;
export type StayBookingRequest = z.infer<typeof stayBookingSchema>;

// ---------- Helpers ----------

export type BookingWithLink = Booking & { whatsappLink: string };

export function withWhatsappLink(booking: Booking, settings: Settings): BookingWithLink {
  return { ...booking, whatsappLink: whatsappLink(settings.businessWhatsapp, customerWhatsappText(booking, settings)) };
}

export async function getBookingById(id: number, conn: Queryable = pool): Promise<Booking | null> {
  const row = await queryOne("SELECT * FROM bookings WHERE id = ?", [id], conn);
  return row ? rowToBooking(row) : null;
}

export async function getBookingByReference(reference: string, conn: Queryable = pool): Promise<Booking | null> {
  const row = await queryOne("SELECT * FROM bookings WHERE reference = ?", [reference.toUpperCase()], conn);
  return row ? rowToBooking(row) : null;
}

/**
 * Bundle discount: the other service must have an existing, non-cancelled booking.
 * When we know the customer's email (booking flow) it must match; the quote preview only checks existence.
 */
async function bundleEligible(ref: string | undefined, service: Service, email: string | undefined): Promise<{ eligible: boolean; bookingId: number | null }> {
  if (!ref) return { eligible: false, bookingId: null };
  const other = await getBookingByReference(ref);
  if (!other || other.service === service || other.status === "cancelled") return { eligible: false, bookingId: null };
  if (email && other.customer.email.toLowerCase() !== email.toLowerCase()) return { eligible: false, bookingId: null };
  return { eligible: true, bookingId: other.id };
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

export function generateReference(service: Service): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return `${BOOKING_REF_PREFIX[service]}-${s}`;
}

async function verifyDocuments(docs: { kind: string; path: string }[]): Promise<void> {
  for (const d of docs) {
    if (!(await documentExists(d.path))) throw badRequest("One of the uploaded documents could not be found. Please upload it again.", { documents: "Upload missing" });
  }
}

/** Shared double-click guard: same email + item + dates created in the last 2 minutes. */
async function recentDuplicate(conn: Queryable, service: Service, itemId: number, email: string, start: string, end: string): Promise<Booking | null> {
  const col = service === "car" ? "vehicle_id" : "property_id";
  const row = await queryOne(
    `SELECT * FROM bookings WHERE ${col} = ? AND customer_email = ? AND start_date = ? AND end_date = ? AND status <> 'cancelled'
     AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE) ORDER BY id DESC LIMIT 1`,
    [itemId, email, start, end],
    conn,
  );
  return row ? rowToBooking(row) : null;
}

function conflictError(service: Service): ApiError {
  return conflict(
    service === "car"
      ? "This vehicle is no longer available for those dates (we keep one day between rentals). Please choose other dates or another vehicle."
      : "This apartment is already booked for some of those nights. Please choose other dates or another apartment.",
    { dates: "Not available" },
  );
}

interface InsertArgs {
  service: Service;
  status: Booking["status"];
  paymentStatus: Booking["paymentStatus"];
  paymentMethod: Booking["paymentMethod"];
  currency: Booking["currency"];
  customer: Booking["customer"];
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  vehicleId: number | null;
  propertyId: number | null;
  itemName: string;
  details: Record<string, unknown>;
  extras: Booking["extras"];
  quote: Quote;
  promoCode: string | null;
  bundleWithBookingId: number | null;
  documents: Booking["documents"];
}

async function insertBooking(conn: PoolConnection, a: InsertArgs): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = generateReference(a.service);
    try {
      const res = await execute(
        `INSERT INTO bookings (reference, service, status, payment_status, payment_method, currency,
           customer_name, customer_email, customer_phone, customer_country, special_requests,
           start_date, end_date, start_time, end_time, vehicle_id, property_id, item_name,
           details, extras, quote, total_tzs, promo_code, bundle_with_booking_id, documents, admin_notes)
         VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?, '')`,
        [
          reference, a.service, a.status, a.paymentStatus, a.paymentMethod, a.currency,
          a.customer.fullName, a.customer.email, a.customer.phone, a.customer.country, a.customer.specialRequests ?? null,
          a.startDate, a.endDate, a.startTime, a.endTime, a.vehicleId, a.propertyId, a.itemName,
          toJson(a.details), toJson(a.extras), toJson(a.quote), a.quote.totalTzs, a.promoCode, a.bundleWithBookingId, toJson(a.documents),
        ],
        conn,
      );
      return res.insertId;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ER_DUP_ENTRY" && String((err as Error).message).includes("reference")) continue;
      throw err;
    }
  }
  throw new Error("Could not generate a unique booking reference");
}

function bookedExtras(quote: Quote, selected: { extraId: number; qty: number }[], extras: { id: number; code: string; name: string }[]): Booking["extras"] {
  return selected
    .map((sel) => {
      const e = extras.find((x) => x.id === sel.extraId);
      const line = e ? quote.items.find((i) => i.code === `extra:${e.code}`) : undefined;
      return e && line ? { extraId: e.id, code: e.code, name: e.name, qty: sel.qty, totalTzs: line.totalTzs } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

async function incrementPromoIfUsed(conn: PoolConnection, promo: PromoCode | null, quote: Quote, service: Service, today: string): Promise<string | null> {
  if (!promo) return null;
  if (applyPromo(quote.subtotalTzs, promo, service, today) <= 0) return null;
  await execute("UPDATE promo_codes SET uses = uses + 1 WHERE id = ?", [promo.id], conn);
  return promo.code;
}

export interface CreateResult {
  booking: BookingWithLink;
  payment?: { redirectUrl: string };
  existing?: boolean;
}

async function finishCreation(bookingId: number, settings: Settings, wantsOnline: boolean): Promise<CreateResult> {
  const booking = (await getBookingById(bookingId))!;
  notifyNewBookingInBackground(booking);
  let payment: { redirectUrl: string } | undefined;
  if (wantsOnline && booking.quote.depositTzs > 0) {
    try {
      const p = await initiatePayment(booking, booking.quote.depositTzs);
      payment = { redirectUrl: p.redirectUrl };
    } catch (err) {
      // The booking exists; the customer can retry payment from the confirmation page or pay on arrival.
      console.error(`[payments] checkout creation failed for ${booking.reference}`, err);
    }
  }
  return { booking: withWhatsappLink(booking, settings), payment };
}

// ---------- Car ----------

export interface CarPricing {
  ctx: CarQuoteContext;
  quote: Quote;
  bundleBookingId: number | null;
}

export async function priceCar(input: CarQuoteRequest, opts: { customerEmail?: string } = {}): Promise<CarPricing> {
  const vehicle = await getVehicle(input.vehicleId);
  if (!vehicle || !vehicle.active) throw notFound("Vehicle");
  const today = todayIso();
  if (input.pickupDate < today) throw badRequest("Pick-up date cannot be in the past", { pickupDate: "Choose today or a later date" });
  if (input.returnDate < input.pickupDate || rentalDays(input.pickupDate, input.pickupTime, input.returnDate, input.returnTime) === 0) {
    throw badRequest("Return must be after pick-up", { returnDate: "Return must be after pick-up" });
  }
  const fields: Record<string, string> = {};
  if (input.pickupLocation === "custom" && !input.pickupAddress) fields.pickupAddress = "Enter the pick-up address";
  if (input.dropoffLocation === "custom" && !input.dropoffAddress) fields.dropoffAddress = "Enter the drop-off address";
  const [settings, extras, zones, seasonalRates, promo, bundle] = await Promise.all([
    getSettings(),
    listExtras("car"),
    listDeliveryZones(true),
    listSeasonalRates("car", vehicle.id),
    getPromoByCode(input.promoCode),
    bundleEligible(input.bundleWithBookingRef, "car", opts.customerEmail),
  ]);
  if (input.pickupLocation === "custom" || input.dropoffLocation === "custom") {
    if (!input.deliveryZoneId || !zones.some((z) => z.id === input.deliveryZoneId)) fields.deliveryZoneId = "Choose a delivery zone";
  }
  if (input.promoCode && !promo) fields.promoCode = "This promo code is not valid";
  if (input.bundleWithBookingRef && !bundle.eligible) fields.bundleWithBookingRef = "No matching stay booking found for this email";
  if (Object.keys(fields).length) throw badRequest("Please check the highlighted fields", fields);
  if (input.rentalType === "with_driver" && !input.driverScope) input.driverScope = "dar";

  const ctx: CarQuoteContext = { vehicle, settings, extras, zones, seasonalRates, promo, bundleEligible: bundle.eligible, today };
  const quote = quoteCar(input, ctx);
  return { ctx, quote, bundleBookingId: bundle.bookingId };
}

export async function createCarBooking(input: CarBookingRequest): Promise<CreateResult> {
  if (input.rentalType === "self_drive") {
    const kinds = new Set(input.documents.map((d) => d.kind));
    const fields: Record<string, string> = {};
    if (!kinds.has("licence")) fields.licence = "Upload your driving licence";
    if (!kinds.has("id") && !kinds.has("passport")) fields.id = "Upload a national ID or passport";
    if (Object.keys(fields).length) throw badRequest("Self-drive rentals need a driving licence and an ID or passport", fields);
  }
  await verifyDocuments(input.documents);
  const { ctx, quote, bundleBookingId } = await priceCar(input, { customerEmail: input.customer.email });
  const zone = input.deliveryZoneId ? ctx.zones.find((z) => z.id === input.deliveryZoneId) : undefined;
  const wantsOnline = input.paymentMethod === "online" && quote.depositTzs > 0;

  const { id, existing } = await withTransaction(async (conn) => {
    await query("SELECT id FROM vehicles WHERE id = ? FOR UPDATE", [ctx.vehicle.id], conn);
    const dup = await recentDuplicate(conn, "car", ctx.vehicle.id, input.customer.email, input.pickupDate, input.returnDate);
    if (dup) return { id: dup.id, existing: true };
    const clashes = await findConflicts("car", ctx.vehicle.id, input.pickupDate, input.returnDate, {}, conn);
    if (clashes.length) throw conflictError("car");
    const promoCode = await incrementPromoIfUsed(conn, ctx.promo ?? null, quote, "car", ctx.today!);
    const bookingId = await insertBooking(conn, {
      service: "car",
      status: "pending",
      paymentStatus: wantsOnline ? "unpaid" : "pay_on_arrival",
      paymentMethod: wantsOnline ? "online" : "on_arrival",
      currency: input.currency,
      customer: input.customer,
      startDate: input.pickupDate,
      endDate: input.returnDate,
      startTime: input.pickupTime,
      endTime: input.returnTime,
      vehicleId: ctx.vehicle.id,
      propertyId: null,
      itemName: ctx.vehicle.name,
      details: {
        rentalType: input.rentalType,
        driverScope: input.rentalType === "with_driver" ? input.driverScope ?? "dar" : null,
        pickupLocation: input.pickupLocation,
        dropoffLocation: input.dropoffLocation,
        pickupAddress: input.pickupAddress ?? null,
        dropoffAddress: input.dropoffAddress ?? null,
        deliveryZoneId: zone?.id ?? null,
        deliveryZoneName: zone?.name ?? null,
        passengers: input.passengers,
        flightNumber: input.flightNumber ?? null,
        days: quote.days ?? null,
      },
      extras: bookedExtras(quote, input.extras, ctx.extras),
      quote,
      promoCode,
      bundleWithBookingId: bundleBookingId,
      documents: input.documents,
    });
    return { id: bookingId, existing: false };
  });

  if (existing) {
    const booking = (await getBookingById(id))!;
    return { booking: withWhatsappLink(booking, ctx.settings), existing: true };
  }
  return finishCreation(id, ctx.settings, wantsOnline);
}

// ---------- Stay ----------

export interface StayPricing {
  ctx: StayQuoteContext;
  quote: Quote;
  bundleBookingId: number | null;
}

export async function priceStay(input: StayQuoteRequest, opts: { customerEmail?: string } = {}): Promise<StayPricing> {
  const property = await getProperty(input.propertyId);
  if (!property || !property.active) throw notFound("Property");
  const today = todayIso();
  const fields: Record<string, string> = {};
  if (input.checkIn < today) fields.checkIn = "Choose today or a later date";
  if (input.checkOut <= input.checkIn) fields.checkOut = "Check-out must be after check-in";
  if (input.guests > property.maxGuests) fields.guests = `This apartment sleeps up to ${property.maxGuests} guests`;
  if (Object.keys(fields).length) throw badRequest("Please check the highlighted fields", fields);

  const [settings, extras, seasonalRates, promo, bundle] = await Promise.all([
    getSettings(),
    listExtras("stay"),
    listSeasonalRates("stay", property.id),
    getPromoByCode(input.promoCode),
    bundleEligible(input.bundleWithBookingRef, "stay", opts.customerEmail),
  ]);
  if (input.promoCode && !promo) fields.promoCode = "This promo code is not valid";
  if (input.bundleWithBookingRef && !bundle.eligible) fields.bundleWithBookingRef = "No matching car booking found for this email";
  if (Object.keys(fields).length) throw badRequest("Please check the highlighted fields", fields);

  const ctx: StayQuoteContext = { property, settings, extras, seasonalRates, promo, bundleEligible: bundle.eligible, today };
  const quote = quoteStay(input, ctx);
  return { ctx, quote, bundleBookingId: bundle.bookingId };
}

export async function createStayBooking(input: StayBookingRequest): Promise<CreateResult> {
  await verifyDocuments(input.documents);
  const { ctx, quote, bundleBookingId } = await priceStay(input, { customerEmail: input.customer.email });
  const property = ctx.property;
  if ((quote.nights ?? 0) < property.minNights) {
    throw badRequest(`Minimum stay at ${property.name} is ${property.minNights} nights`, { checkOut: `Minimum ${property.minNights} nights` });
  }
  // Property payment mode decides what "online" means; on_arrival-only properties never charge online.
  const wantsOnline = input.paymentMethod === "online" && property.paymentMode !== "on_arrival" && quote.depositTzs > 0;

  const { id, existing } = await withTransaction(async (conn) => {
    await query("SELECT id FROM properties WHERE id = ? FOR UPDATE", [property.id], conn);
    const dup = await recentDuplicate(conn, "stay", property.id, input.customer.email, input.checkIn, input.checkOut);
    if (dup) return { id: dup.id, existing: true };
    const clashes = await findConflicts("stay", property.id, input.checkIn, input.checkOut, {}, conn);
    if (clashes.length) throw conflictError("stay");
    const promoCode = await incrementPromoIfUsed(conn, ctx.promo ?? null, quote, "stay", ctx.today!);
    const bookingId = await insertBooking(conn, {
      service: "stay",
      status: "pending",
      paymentStatus: wantsOnline ? "unpaid" : "pay_on_arrival",
      paymentMethod: wantsOnline ? "online" : "on_arrival",
      currency: input.currency,
      customer: input.customer,
      startDate: input.checkIn,
      endDate: input.checkOut,
      startTime: input.arrivalTime ?? null,
      endTime: null,
      vehicleId: null,
      propertyId: property.id,
      itemName: property.name,
      details: {
        guests: input.guests,
        arrivalTime: input.arrivalTime ?? null,
        nights: quote.nights ?? null,
        paymentMode: property.paymentMode,
        area: property.area,
      },
      extras: bookedExtras(quote, input.extras, ctx.extras),
      quote,
      promoCode,
      bundleWithBookingId: bundleBookingId,
      documents: input.documents,
    });
    return { id: bookingId, existing: false };
  });

  if (existing) {
    const booking = (await getBookingById(id))!;
    return { booking: withWhatsappLink(booking, ctx.settings), existing: true };
  }
  return finishCreation(id, ctx.settings, wantsOnline);
}

// ---------- Admin edits ----------

export const adminBookingPatchSchema = z
  .object({
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
    paymentStatus: z.enum(["unpaid", "paid", "deposit_paid", "pay_on_arrival"]).optional(),
    adminNotes: z.string().max(5000).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    startTime: hhmm.nullable().optional(),
    endTime: hhmm.nullable().optional(),
    customer: customerSchema.partial().optional(),
  })
  .strict();

export type AdminBookingPatch = z.infer<typeof adminBookingPatchSchema>;

/** Admin edit. Date changes (or re-activating a cancelled booking) re-check availability under the item lock. */
export async function adminUpdateBooking(id: number, patch: AdminBookingPatch): Promise<Booking> {
  return withTransaction(async (conn) => {
    const current = await getBookingById(id, conn);
    if (!current) throw notFound("Booking");
    const itemId = current.service === "car" ? current.vehicleId : current.propertyId;
    const startDate = patch.startDate ?? current.startDate;
    const endDate = patch.endDate ?? current.endDate;
    const status = patch.status ?? current.status;
    if (current.service === "stay" ? endDate <= startDate : endDate < startDate) {
      throw badRequest("End date must be after start date", { endDate: "Must be after start" });
    }
    const datesChanged = startDate !== current.startDate || endDate !== current.endDate;
    const reactivated = current.status === "cancelled" && (status === "pending" || status === "confirmed");
    if ((datesChanged || reactivated) && itemId && (status === "pending" || status === "confirmed")) {
      const table = current.service === "car" ? "vehicles" : "properties";
      await query(`SELECT id FROM ${table} WHERE id = ? FOR UPDATE`, [itemId], conn);
      const clashes = await findConflicts(current.service, itemId, startDate, endDate, { excludeBookingId: id }, conn);
      if (clashes.length) throw conflictError(current.service);
    }
    const customer = { ...current.customer, ...(patch.customer ?? {}) };
    await execute(
      `UPDATE bookings SET status=?, payment_status=?, admin_notes=?, start_date=?, end_date=?, start_time=?, end_time=?,
         customer_name=?, customer_email=?, customer_phone=?, customer_country=?, special_requests=?
       WHERE id=?`,
      [
        status,
        patch.paymentStatus ?? current.paymentStatus,
        patch.adminNotes ?? current.adminNotes,
        startDate,
        endDate,
        patch.startTime === undefined ? current.startTime : patch.startTime,
        patch.endTime === undefined ? current.endTime : patch.endTime,
        customer.fullName,
        customer.email,
        customer.phone,
        customer.country,
        customer.specialRequests ?? null,
        id,
      ],
      conn,
    );
    return (await getBookingById(id, conn))!;
  });
}
