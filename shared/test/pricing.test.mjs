// Quick sanity run of the shared pricing engine: node --experimental-strip-types shared/test/pricing.test.mjs
import assert from "node:assert/strict";
import { quoteCar, quoteStay, rentalDays } from "../src/index.ts";

const settings = { usdRate: 2600, driverFeeDarTzs: 40000, driverFeeUpcountryTzs: 60000, bundleDiscountPercent: 10, businessWhatsapp: "", vendorEmail: "", businessEmail: "", businessPhone: "", businessAddress: "", bnbBrandName: "" };
const vehicle = { id: 1, slug: "prado", name: "Prado", category: "SUV", seats: 7, bags: 4, transmission: "automatic", drive: "4WD", fuel: "Diesel", features: [], images: [], pricePerDayTzs: 200000, pricePerWeekTzs: 1260000, pricePerMonthTzs: 4800000, mileagePolicy: "", depositTzs: 0, description: "", active: true };

assert.equal(rentalDays("2026-11-01", "10:00", "2026-11-03", "10:00"), 2);
assert.equal(rentalDays("2026-11-01", "10:00", "2026-11-03", "12:00"), 3); // >1h over → extra day

const q1 = quoteCar({ pickupDate: "2026-11-01", pickupTime: "10:00", returnDate: "2026-11-08", returnTime: "10:00", rentalType: "with_driver", driverScope: "dar", extras: [], pickupLocation: "jnia", dropoffLocation: "jnia" }, { vehicle, settings, extras: [], zones: [], seasonalRates: [] });
assert.equal(q1.days, 7);
assert.equal(q1.items[0].totalTzs, 1260000, "weekly rate applied");
assert.equal(q1.items[1].totalTzs, 280000, "driver 7 × 40k");
assert.ok(q1.notes.includes("Weekly rate applied"));

const property = { id: 1, slug: "a", name: "Masaki Flat", area: "Masaki", address: "", lat: null, lng: null, bedrooms: 1, beds: 1, bathrooms: 1, maxGuests: 2, amenities: [], houseRules: "", description: "", images: [], pricePerNightTzs: 100000, pricePerWeekTzs: null, pricePerMonthTzs: null, cleaningFeeTzs: 30000, minNights: 2, paymentMode: "deposit", depositPercent: 30, checkinInstructions: "", icalImportUrls: [], active: true };
const q2 = quoteStay({ checkIn: "2026-12-20", checkOut: "2026-12-23", guests: 2, extras: [] }, { property, settings, extras: [], seasonalRates: [{ id: 1, targetType: "stay", targetId: 1, name: "Xmas", startDate: "2026-12-22", endDate: "2027-01-05", priceTzs: 150000 }], promo: { id: 1, code: "KARIBU10", type: "percent", value: 10, service: "both", validFrom: null, validTo: null, maxUses: null, uses: 0, active: true } });
assert.equal(q2.nights, 3);
assert.equal(q2.items[0].totalTzs, 350000, "2 base nights + 1 seasonal");
assert.equal(q2.subtotalTzs, 380000);
assert.equal(q2.discountTzs, 38000);
assert.equal(q2.totalTzs, 342000);
assert.equal(q2.depositTzs, 102600);
console.log("shared pricing OK");
