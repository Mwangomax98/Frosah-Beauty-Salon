import { describe, expect, it } from "vitest";
import { api, day, firstVehicle, propertyBySlug } from "./helpers.ts";

describe("quote endpoints", () => {
  it("applies the weekly rate for a 7-day rental", async () => {
    const v = await firstVehicle();
    const res = await api().post("/api/quote/car").send({
      vehicleId: v.id, pickupDate: day(30), pickupTime: "10:00", returnDate: day(37), returnTime: "10:00",
      pickupLocation: "jnia", dropoffLocation: "jnia", rentalType: "self_drive", extras: [],
    });
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(7);
    const vehicleLine = res.body.items.find((i: { code: string }) => i.code === "vehicle");
    expect(vehicleLine.totalTzs).toBe(v.pricePerWeekTzs);
    expect(vehicleLine.totalTzs).toBeLessThan(v.pricePerDayTzs * 7);
    expect(res.body.notes).toContain("Weekly rate applied");
  });

  it("adds the driver fee per day and the delivery zone fee per custom leg", async () => {
    const v = await firstVehicle();
    const zones = (await api().get("/api/delivery-zones")).body as { id: number; feeTzs: number }[];
    const settings = (await api().get("/api/settings")).body;
    const res = await api().post("/api/quote/car").send({
      vehicleId: v.id, pickupDate: day(30), pickupTime: "09:00", returnDate: day(33), returnTime: "09:00",
      pickupLocation: "custom", pickupAddress: "Serena Hotel", dropoffLocation: "custom", dropoffAddress: "Serena Hotel", deliveryZoneId: zones[0].id,
      rentalType: "with_driver", driverScope: "upcountry", extras: [],
    });
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(3);
    const driver = res.body.items.find((i: { code: string }) => i.code === "driver");
    expect(driver.totalTzs).toBe(settings.driverFeeUpcountryTzs * 3);
    const delivery = res.body.items.find((i: { code: string }) => i.code === "delivery");
    expect(delivery.qty).toBe(2);
    expect(delivery.totalTzs).toBe(zones[0].feeTzs * 2);
    expect(res.body.totalTzs).toBe(res.body.subtotalTzs);
  });

  it("rejects a custom pickup without a delivery zone", async () => {
    const v = await firstVehicle();
    const res = await api().post("/api/quote/car").send({
      vehicleId: v.id, pickupDate: day(30), pickupTime: "09:00", returnDate: day(31), returnTime: "09:00",
      pickupLocation: "custom", dropoffLocation: "jnia", rentalType: "self_drive", extras: [],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.deliveryZoneId).toBeTruthy();
    expect(res.body.error.fields.pickupAddress).toBeTruthy();
  });

  it("applies the KARIBU10 promo to a stay and includes the cleaning fee", async () => {
    const p = await propertyBySlug("city-centre-studio");
    const res = await api().post("/api/quote/stay").send({ propertyId: p.id, checkIn: day(20), checkOut: day(22), guests: 1, extras: [], promoCode: "karibu10" });
    expect(res.status).toBe(200);
    expect(res.body.nights).toBe(2);
    const subtotal = p.price_per_night_tzs * 2 + p.cleaning_fee_tzs;
    expect(res.body.subtotalTzs).toBe(subtotal);
    expect(res.body.discountTzs).toBe(Math.round(subtotal * 0.1));
    expect(res.body.totalTzs).toBe(subtotal - Math.round(subtotal * 0.1));
    expect(res.body.depositTzs).toBe(0); // on_arrival property
  });

  it("rejects an unknown promo code", async () => {
    const p = await propertyBySlug("city-centre-studio");
    const res = await api().post("/api/quote/stay").send({ propertyId: p.id, checkIn: day(20), checkOut: day(22), guests: 1, extras: [], promoCode: "NOPE" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.promoCode).toBeTruthy();
  });

  it("rejects dates in the past", async () => {
    const p = await propertyBySlug("city-centre-studio");
    const res = await api().post("/api/quote/stay").send({ propertyId: p.id, checkIn: day(-3), checkOut: day(-1), guests: 1, extras: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.checkIn).toBeTruthy();
  });
});
