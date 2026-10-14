import type {
  CarBookingInput,
  DeliveryZone,
  Extra,
  LineItem,
  Property,
  PromoCode,
  Quote,
  SeasonalRate,
  Settings,
  StayBookingInput,
  Vehicle,
} from "./types";
import { addDays, daysBetween, eachDate, isDateInRange } from "./dates";

/** Round to whole shillings. */
const r = (n: number) => Math.round(n);

function seasonalOrBase(date: string, base: number, rates: SeasonalRate[]): number {
  const hit = rates.find((s) => isDateInRange(date, s.startDate, s.endDate));
  return hit ? hit.priceTzs : base;
}

/**
 * Charge for N units at base, but apply weekly/monthly rates when they're cheaper.
 * Weekly/monthly rates are totals for 7 / 30 units. Mixed stays use the cheapest combination
 * (e.g. 10 days = 1 week + 3 days, unless 10×daily is cheaper).
 */
export function bestPeriodTotal(
  units: number,
  dailyTotal: number,
  avgDaily: number,
  weekly: number | null,
  monthly: number | null,
): { total: number; note: string | null } {
  let best = dailyTotal;
  let note: string | null = null;
  if (monthly && units >= 30) {
    const months = Math.floor(units / 30);
    const rest = units - months * 30;
    let restCost = rest * avgDaily;
    if (weekly && rest >= 7) {
      const weeks = Math.floor(rest / 7);
      restCost = Math.min(restCost, weeks * weekly + (rest - weeks * 7) * avgDaily);
    }
    const candidate = months * monthly + restCost;
    if (candidate < best) {
      best = candidate;
      note = "Monthly rate applied";
    }
  }
  if (weekly && units >= 7) {
    const weeks = Math.floor(units / 7);
    const candidate = weeks * weekly + (units - weeks * 7) * avgDaily;
    if (candidate < best) {
      best = candidate;
      note = "Weekly rate applied";
    }
  }
  return { total: r(best), note };
}

export function applyPromo(subtotal: number, promo: PromoCode | null | undefined, service: "car" | "stay", today: string): number {
  if (!promo || !promo.active) return 0;
  if (promo.service !== "both" && promo.service !== service) return 0;
  if (promo.validFrom && today < promo.validFrom) return 0;
  if (promo.validTo && today > promo.validTo) return 0;
  if (promo.maxUses !== null && promo.uses >= promo.maxUses) return 0;
  const d = promo.type === "percent" ? (subtotal * promo.value) / 100 : promo.value;
  return r(Math.min(d, subtotal));
}

export interface CarQuoteContext {
  vehicle: Vehicle;
  settings: Settings;
  extras: Extra[];
  zones: DeliveryZone[];
  seasonalRates: SeasonalRate[];
  promo?: PromoCode | null;
  bundleEligible?: boolean;
  today?: string;
}

/** Rental days: a 24h period counts as one day; any part of the next period counts as another. */
export function rentalDays(pickupDate: string, pickupTime: string, returnDate: string, returnTime: string): number {
  const start = new Date(`${pickupDate}T${pickupTime || "00:00"}:00`);
  const end = new Date(`${returnDate}T${returnTime || "00:00"}:00`);
  const hours = (end.getTime() - start.getTime()) / 36e5;
  if (!(hours > 0)) return 0;
  // 1h grace on the return
  return Math.max(1, Math.ceil((hours - 1) / 24));
}

export function quoteCar(input: Pick<CarBookingInput, "pickupDate" | "pickupTime" | "returnDate" | "returnTime" | "rentalType" | "driverScope" | "extras" | "pickupLocation" | "dropoffLocation" | "deliveryZoneId" | "promoCode">, ctx: CarQuoteContext): Quote {
  const items: LineItem[] = [];
  const notes: string[] = [];
  const days = rentalDays(input.pickupDate, input.pickupTime, input.returnDate, input.returnTime);
  if (days === 0) {
    return { items, subtotalTzs: 0, discountTzs: 0, totalTzs: 0, depositTzs: 0, days: 0, notes: ["Return must be after pickup"] };
  }
  const v = ctx.vehicle;
  const dates = eachDate(input.pickupDate, addDays(input.pickupDate, days - 1));
  const dailyTotal = dates.reduce((s, d) => s + seasonalOrBase(d, v.pricePerDayTzs, ctx.seasonalRates), 0);
  const avg = dailyTotal / days;
  const { total: vehicleTotal, note } = bestPeriodTotal(days, dailyTotal, avg, v.pricePerWeekTzs, v.pricePerMonthTzs);
  if (note) notes.push(note);
  items.push({ code: "vehicle", label: `${v.name} × ${days} day${days > 1 ? "s" : ""}`, qty: days, unitTzs: r(vehicleTotal / days), totalTzs: vehicleTotal });

  if (input.rentalType === "with_driver") {
    const scope = input.driverScope ?? "dar";
    const fee = scope === "upcountry" ? ctx.settings.driverFeeUpcountryTzs : ctx.settings.driverFeeDarTzs;
    items.push({
      code: "driver",
      label: scope === "upcountry" ? "Driver (upcountry) × days" : "Driver (within Dar) × days",
      qty: days,
      unitTzs: fee,
      totalTzs: r(fee * days),
    });
  }

  const zoneLegs = [input.pickupLocation, input.dropoffLocation].filter((l) => l === "custom").length;
  if (zoneLegs > 0 && input.deliveryZoneId) {
    const z = ctx.zones.find((z) => z.id === input.deliveryZoneId && z.active);
    if (z) items.push({ code: "delivery", label: `Delivery/collection — ${z.name}`, qty: zoneLegs, unitTzs: z.feeTzs, totalTzs: r(z.feeTzs * zoneLegs) });
  }

  for (const sel of input.extras) {
    const e = ctx.extras.find((x) => x.id === sel.extraId && x.active && (x.service === "car" || x.service === "both"));
    if (!e || sel.qty <= 0) continue;
    const units = e.pricing === "per_day" ? days * sel.qty : sel.qty;
    items.push({ code: `extra:${e.code}`, label: e.pricing === "per_day" ? `${e.name} × ${days} days` : e.name, qty: units, unitTzs: e.priceTzs, totalTzs: r(e.priceTzs * units) });
  }

  const subtotal = items.reduce((s, i) => s + i.totalTzs, 0);
  let discount = applyPromo(subtotal, ctx.promo, "car", ctx.today ?? input.pickupDate);
  if (discount > 0) notes.push(`Promo code ${ctx.promo!.code} applied`);
  if (ctx.bundleEligible && ctx.settings.bundleDiscountPercent > 0) {
    const b = r((subtotal * ctx.settings.bundleDiscountPercent) / 100);
    discount += b;
    notes.push(`Stay + car bundle: ${ctx.settings.bundleDiscountPercent}% off`);
  }
  discount = Math.min(discount, subtotal);
  const total = subtotal - discount;
  return { items, subtotalTzs: subtotal, discountTzs: discount, totalTzs: total, depositTzs: total, days, notes };
}

export interface StayQuoteContext {
  property: Property;
  settings: Settings;
  extras: Extra[];
  seasonalRates: SeasonalRate[];
  promo?: PromoCode | null;
  bundleEligible?: boolean;
  today?: string;
}

export function quoteStay(input: Pick<StayBookingInput, "checkIn" | "checkOut" | "guests" | "extras" | "promoCode">, ctx: StayQuoteContext): Quote {
  const items: LineItem[] = [];
  const notes: string[] = [];
  const nights = daysBetween(input.checkIn, input.checkOut);
  const p = ctx.property;
  if (nights <= 0) {
    return { items, subtotalTzs: 0, discountTzs: 0, totalTzs: 0, depositTzs: 0, nights: 0, notes: ["Check-out must be after check-in"] };
  }
  if (nights < p.minNights) notes.push(`Minimum stay is ${p.minNights} nights`);
  const dates = eachDate(input.checkIn, addDays(input.checkOut, -1));
  const nightlyTotal = dates.reduce((s, d) => s + seasonalOrBase(d, p.pricePerNightTzs, ctx.seasonalRates), 0);
  const avg = nightlyTotal / nights;
  const { total: stayTotal, note } = bestPeriodTotal(nights, nightlyTotal, avg, p.pricePerWeekTzs, p.pricePerMonthTzs);
  if (note) notes.push(note);
  items.push({ code: "stay", label: `${p.name} × ${nights} night${nights > 1 ? "s" : ""}`, qty: nights, unitTzs: r(stayTotal / nights), totalTzs: stayTotal });
  if (p.cleaningFeeTzs > 0) items.push({ code: "cleaning", label: "Cleaning fee", qty: 1, unitTzs: p.cleaningFeeTzs, totalTzs: p.cleaningFeeTzs });

  for (const sel of input.extras) {
    const e = ctx.extras.find((x) => x.id === sel.extraId && x.active && (x.service === "stay" || x.service === "both"));
    if (!e || sel.qty <= 0) continue;
    const units = e.pricing === "per_day" ? nights * sel.qty : sel.qty;
    items.push({ code: `extra:${e.code}`, label: e.pricing === "per_day" ? `${e.name} × ${nights} nights` : e.name, qty: units, unitTzs: e.priceTzs, totalTzs: r(e.priceTzs * units) });
  }

  const subtotal = items.reduce((s, i) => s + i.totalTzs, 0);
  let discount = applyPromo(subtotal, ctx.promo, "stay", ctx.today ?? input.checkIn);
  if (discount > 0) notes.push(`Promo code ${ctx.promo!.code} applied`);
  if (ctx.bundleEligible && ctx.settings.bundleDiscountPercent > 0) {
    discount += r((subtotal * ctx.settings.bundleDiscountPercent) / 100);
    notes.push(`Stay + car bundle: ${ctx.settings.bundleDiscountPercent}% off`);
  }
  discount = Math.min(discount, subtotal);
  const total = subtotal - discount;
  let deposit = total;
  if (p.paymentMode === "deposit") deposit = r((total * p.depositPercent) / 100);
  if (p.paymentMode === "on_arrival") deposit = 0;
  return { items, subtotalTzs: subtotal, discountTzs: discount, totalTzs: total, depositTzs: deposit, nights, notes };
}

export function toUsd(tzs: number, usdRate: number): number {
  return Math.round((tzs / usdRate) * 100) / 100;
}

export function formatMoney(tzs: number, currency: "TZS" | "USD", usdRate: number): string {
  if (currency === "USD") return `$${toUsd(tzs, usdRate).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `TZS ${Math.round(tzs).toLocaleString("en-US")}`;
}
