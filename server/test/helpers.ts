import request from "supertest";
import { addDays, todayIso } from "@bluesparks/shared";
import { createApp } from "../src/app.ts";
import { query } from "../src/db.ts";

export const app = createApp();
export const api = () => request(app);

/** A date `n` days from today (Dar time). Seasonal rates are cleared in tests, so any date is base price. */
export const day = (n: number) => addDays(todayIso(), n);

export const customer = (overrides: Partial<{ fullName: string; email: string; phone: string; country: string }> = {}) => ({
  fullName: "Asha Mohamed",
  email: "asha@example.com",
  phone: "+255 712 345 678",
  country: "Tanzania",
  ...overrides,
});

export async function firstVehicle(): Promise<{ id: number; slug: string; pricePerDayTzs: number; pricePerWeekTzs: number }> {
  const [v] = await query<{ id: number; slug: string; price_per_day_tzs: number; price_per_week_tzs: number }>("SELECT * FROM vehicles WHERE active = 1 ORDER BY id LIMIT 1");
  return { id: Number(v.id), slug: v.slug, pricePerDayTzs: Number(v.price_per_day_tzs), pricePerWeekTzs: Number(v.price_per_week_tzs) };
}

export async function propertyBySlug(slug: string): Promise<{ id: number; ical_token: string; price_per_night_tzs: number; cleaning_fee_tzs: number; min_nights: number }> {
  const [p] = await query<{ id: number; ical_token: string; price_per_night_tzs: number; cleaning_fee_tzs: number; min_nights: number }>("SELECT * FROM properties WHERE slug = ?", [slug]);
  return { ...p, id: Number(p.id), price_per_night_tzs: Number(p.price_per_night_tzs), cleaning_fee_tzs: Number(p.cleaning_fee_tzs), min_nights: Number(p.min_nights) };
}

export function stayBody(propertyId: number, checkIn: string, checkOut: string, overrides: Record<string, unknown> = {}) {
  return {
    propertyId,
    checkIn,
    checkOut,
    guests: 2,
    extras: [],
    customer: customer(),
    paymentMethod: "on_arrival",
    currency: "TZS",
    acceptedTerms: true,
    acceptedHouseRules: true,
    documents: [],
    ...overrides,
  };
}

export function carBody(vehicleId: number, pickupDate: string, returnDate: string, overrides: Record<string, unknown> = {}) {
  return {
    vehicleId,
    pickupDate,
    pickupTime: "10:00",
    returnDate,
    returnTime: "10:00",
    pickupLocation: "jnia",
    dropoffLocation: "jnia",
    rentalType: "with_driver",
    driverScope: "dar",
    extras: [],
    passengers: 2,
    customer: customer(),
    paymentMethod: "on_arrival",
    currency: "TZS",
    acceptedTerms: true,
    documents: [],
    ...overrides,
  };
}

export async function adminToken(): Promise<string> {
  const res = await api().post("/api/admin/auth/login").send({ email: "admin@test.local", password: "TestPass123!" });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}
