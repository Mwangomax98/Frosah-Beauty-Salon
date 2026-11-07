// Quick sanity run of the shared pricing engine: npx tsx shared/test/pricing.test.mjs
import assert from "node:assert/strict";
import { quoteCar, quoteStay, rentalDays, vehicleRates } from "../src/index.ts";

const settings = { usdRate: 2600, driverFeeDarTzs: 40000, driverFeeUpcountryTzs: 60000, bundleDiscountPercent: 10, businessWhatsapp: "", vendorEmail: "", businessEmail: "", businessPhone: "", businessAddress: "", bnbBrandName: "", instagramUrl: "", googleMapsUrl: "" };
const vehicle = { id: 1, slug: "prado", name: "Prado", model: "TX-L", year: 2020, category: "SUV", seats: 7, bags: 4, transmission: "automatic", drive: "4WD", fuel: "Diesel", features: [], images: [], pricePerDayTzs: 200000, pricePerWeekTzs: 1260000, pricePerMonthTzs: 4800000, priceWithDriverPerDayTzs: null, priceWithDriverPerWeekTzs: null, priceWithDriverPerMonthTzs: null, mileagePolicy: "", depositTzs: 0, description: "", active: true };

assert.equal(rentalDays("2026-11-01", "10:00", "2026-11-03", "10:00"), 2);
assert.equal(rentalDays("2026-11-01", "10:00", "2026-11-03", "12:00"), 3); // >1h over → extra day

const base = { pickupDate: "2026-11-01", pickupTime: "10:00", returnDate: "2026-11-08", returnTime: "10:00", extras: [], pickupLocation: "jnia", dropoffLocation: "jnia" };

// Self drive: the car's own self-drive rates.
const qSelf = quoteCar({ ...base, rentalType: "self_drive" }, { vehicle, settings, extras: [], zones: [], seasonalRates: [] });
assert.equal(qSelf.days, 7);
assert.equal(qSelf.items.length, 1);
assert.equal(qSelf.items[0].totalTzs, 1260000, "self-drive weekly rate applied");
assert.ok(qSelf.notes.includes("Weekly rate applied"));

// With driver, car has no with-driver price: self-drive + default driver fee per day.
const q1 = quoteCar({ ...base, rentalType: "with_driver", driverScope: "dar" }, { vehicle, settings, extras: [], zones: [], seasonalRates: [] });
assert.equal(q1.items.length, 1, "no separate driver line in Dar");
assert.equal(q1.items[0].totalTzs, 1260000 + 7 * 40000, "fallback: weekly + 7 × 40k");

// With driver, car has its own with-driver prices.
const priced = { ...vehicle, priceWithDriverPerDayTzs: 280000, priceWithDriverPerWeekTzs: 1750000, priceWithDriverPerMonthTzs: null };
assert.deepEqual(vehicleRates(priced, "with_driver", settings), { day: 280000, week: 1750000, month: 4800000 + 80000 * 30, premium: 80000 });
const q3 = quoteCar({ ...base, rentalType: "with_driver", driverScope: "dar" }, { vehicle: priced, settings, extras: [], zones: [], seasonalRates: [] });
assert.equal(q3.items[0].totalTzs, 1750000, "with-driver weekly rate");
const q4 = quoteCar({ ...base, returnDate: "2026-11-03", rentalType: "with_driver", driverScope: "upcountry" }, { vehicle: priced, settings, extras: [], zones: [], seasonalRates: [] });
assert.equal(q4.items[0].totalTzs, 560000, "2 × 280k with driver");
assert.equal(q4.items[1].code, "driver_upcountry");
assert.equal(q4.items[1].totalTzs, 120000, "2 × 60k upcountry allowance");

// Seasonal rate on the self-drive price carries the with-driver premium.
const q5 = quoteCar({ ...base, returnDate: "2026-11-02", rentalType: "with_driver", driverScope: "dar" }, { vehicle: priced, settings, extras: [], zones: [], seasonalRates: [{ id: 1, targetType: "car", targetId: 1, name: "Peak", startDate: "2026-11-01", endDate: "2026-11-30", priceTzs: 250000 }] });
assert.equal(q5.items[0].totalTzs, 330000, "250k seasonal + 80k premium");

const property = { id: 1, slug: "a", name: "Masaki Flat", area: "Masaki", address: "", lat: null, lng: null, bedrooms: 1, beds: 1, bathrooms: 1, maxGuests: 2, amenities: [], houseRules: "", description: "", images: [], pricePerNightTzs: 100000, pricePerWeekTzs: null, pricePerMonthTzs: null, cleaningFeeTzs: 30000, minNights: 2, paymentMode: "deposit", depositPercent: 30, checkinInstructions: "", icalImportUrls: [], active: true };
const q2 = quoteStay({ checkIn: "2026-12-20", checkOut: "2026-12-23", guests: 2, extras: [] }, { property, settings, extras: [], seasonalRates: [{ id: 1, targetType: "stay", targetId: 1, name: "Xmas", startDate: "2026-12-22", endDate: "2027-01-05", priceTzs: 150000 }], promo: { id: 1, code: "KARIBU10", type: "percent", value: 10, service: "both", validFrom: null, validTo: null, maxUses: null, uses: 0, active: true } });
assert.equal(q2.nights, 3);
assert.equal(q2.items[0].totalTzs, 350000, "2 base nights + 1 seasonal");
assert.equal(q2.subtotalTzs, 380000);
assert.equal(q2.discountTzs, 38000);
assert.equal(q2.totalTzs, 342000);
assert.equal(q2.depositTzs, 102600);
console.log("shared pricing OK");
