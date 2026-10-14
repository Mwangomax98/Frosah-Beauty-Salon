// Client-side validation mirroring the server's zod rules. The server is still authoritative.
import { z } from "zod";
import { COUNTRIES, isIsoDate, todayIso } from "@bluesparks/shared";

const isoDate = z.string().refine(isIsoDate, "Enter a valid date");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Enter a time");
const notPast = (d: string) => d >= todayIso();

export const customerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a phone number with country code, e.g. +255 7xx xxx xxx"),
  country: z.enum(COUNTRIES, { errorMap: () => ({ message: "Choose your country" }) }),
  specialRequests: z.string().trim().max(1000).optional(),
});

export const carDatesSchema = z
  .object({
    pickupDate: isoDate.refine(notPast, "Pick-up can't be in the past"),
    pickupTime: time,
    returnDate: isoDate,
    returnTime: time,
    pickupLocation: z.string().min(1, "Choose a pick-up point"),
    dropoffLocation: z.string().min(1, "Choose a drop-off point"),
    pickupAddress: z.string().trim().max(200).optional(),
    dropoffAddress: z.string().trim().max(200).optional(),
    deliveryZoneId: z.number().nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (`${v.returnDate}T${v.returnTime}` <= `${v.pickupDate}T${v.pickupTime}`) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Return must be after pick-up" });
    if (v.pickupLocation === "custom" && !v.pickupAddress) ctx.addIssue({ code: "custom", path: ["pickupAddress"], message: "Tell us where to bring the car" });
    if (v.dropoffLocation === "custom" && !v.dropoffAddress) ctx.addIssue({ code: "custom", path: ["dropoffAddress"], message: "Tell us where to collect the car" });
    if ((v.pickupLocation === "custom" || v.dropoffLocation === "custom") && !v.deliveryZoneId) ctx.addIssue({ code: "custom", path: ["deliveryZoneId"], message: "Choose a delivery zone" });
  });

export const carDetailsSchema = customerSchema.extend({
  passengers: z.coerce.number().int().min(1, "At least one passenger").max(14),
  flightNumber: z.string().trim().max(20).optional(),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue" }) }),
  documents: z.array(z.object({ kind: z.string(), path: z.string(), originalName: z.string() })),
});

export const stayDatesSchema = z
  .object({
    checkIn: isoDate.refine(notPast, "Check-in can't be in the past"),
    checkOut: isoDate,
    guests: z.coerce.number().int().min(1).max(20),
  })
  .refine((v) => v.checkOut > v.checkIn, { path: ["checkOut"], message: "Check-out must be after check-in" });

export const stayDetailsSchema = customerSchema.extend({
  arrivalTime: z.string().optional(),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue" }) }),
  acceptedHouseRules: z.literal(true, { errorMap: () => ({ message: "Please accept the house rules" }) }),
});

export type FieldErrors = Record<string, string>;

/** Server `fields` use dotted paths (customer.email). Strip the `customer.` prefix so they match our inputs. */
export function fromServer(fields: Record<string, string>): FieldErrors {
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(fields)) out[k.replace(/^customer\./, "")] = v;
  return out;
}

/** Collapse a zod error to { path: message } for inline display. */
export function flatten(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
