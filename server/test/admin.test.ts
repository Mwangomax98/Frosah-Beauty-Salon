import { describe, expect, it } from "vitest";
import { parseIcsEvents } from "../src/services/ical.ts";
import { adminToken, api, customer, day, firstVehicle, propertyBySlug, stayBody } from "./helpers.ts";

describe("admin", () => {
  it("rejects unauthenticated and wrong-password requests", async () => {
    expect((await api().get("/api/admin/bookings")).status).toBe(401);
    const bad = await api().post("/api/admin/auth/login").send({ email: "admin@test.local", password: "wrong" });
    expect(bad.status).toBe(401);
  });

  it("logs in (token + cookie), lists bookings and patches status", async () => {
    const p = await propertyBySlug("city-centre-studio");
    const created = await api().post("/api/bookings/stay").send(stayBody(p.id, day(20), day(22)));
    expect(created.status).toBe(201);

    const login = await api().post("/api/admin/auth/login").send({ email: "admin@test.local", password: "TestPass123!" });
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]?.[0]).toContain("bs_admin=");
    const token = login.body.token as string;

    const me = await api().get("/api/admin/auth/me").set("Cookie", login.headers["set-cookie"]);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("admin@test.local");

    const list = await api().get("/api/admin/bookings?service=stay&q=asha").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBeGreaterThanOrEqual(1);
    const id = created.body.booking.id as number;
    expect(list.body.items.some((b: { id: number }) => b.id === id)).toBe(true);

    const patched = await api().patch(`/api/admin/bookings/${id}`).set("Authorization", `Bearer ${token}`).send({ status: "confirmed", adminNotes: "Called the guest" });
    expect(patched.status).toBe(200);
    expect(patched.body.status).toBe("confirmed");
    expect(patched.body.adminNotes).toBe("Called the guest");

    // Moving the dates onto another booking is refused
    const other = await api().post("/api/bookings/stay").send(stayBody(p.id, day(25), day(27), { customer: customer({ email: "x@example.com" }) }));
    expect(other.status).toBe(201);
    const move = await api().patch(`/api/admin/bookings/${id}`).set("Authorization", `Bearer ${token}`).send({ startDate: day(24), endDate: day(26) });
    expect(move.status).toBe(409);

    const detail = await api().get(`/api/admin/bookings/${id}`).set("Authorization", `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(Array.isArray(detail.body.notifications)).toBe(true);
  });

  it("exports CSV with a header row", async () => {
    const token = await adminToken();
    const res = await api().get("/api/admin/bookings.csv").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    const firstLine = res.text.replace(/^﻿/, "").split("\r\n")[0];
    expect(firstLine.startsWith("Reference,Service,Status,Payment status")).toBe(true);
  });

  it("returns revenue report and calendar", async () => {
    const token = await adminToken();
    const rev = await api().get("/api/admin/reports/revenue").set("Authorization", `Bearer ${token}`);
    expect(rev.status).toBe(200);
    expect(rev.body.stay.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(rev.body.byMonth)).toBe(true);
    const cal = await api().get(`/api/admin/calendar?service=stay&from=${day(0)}&to=${day(60)}`).set("Authorization", `Bearer ${token}`);
    expect(cal.status).toBe(200);
    const studio = cal.body.items.find((i: { slug: string }) => i.slug === "city-centre-studio");
    expect(studio.bookings.length).toBeGreaterThanOrEqual(1);
  });

  it("manages blocks, settings and catalogue items", async () => {
    const token = await adminToken();
    const v = await firstVehicle();
    const block = await api().post("/api/admin/blocks").set("Authorization", `Bearer ${token}`).send({ targetType: "car", targetId: v.id, startDate: day(200), endDate: day(202), reason: "Service" });
    expect(block.status).toBe(201);
    const blocked = await api().post("/api/bookings/car").send({
      vehicleId: v.id, pickupDate: day(201), pickupTime: "10:00", returnDate: day(203), returnTime: "10:00", pickupLocation: "jnia", dropoffLocation: "jnia",
      rentalType: "with_driver", extras: [], passengers: 1, customer: customer(), paymentMethod: "on_arrival", currency: "TZS", acceptedTerms: true,
    });
    expect(blocked.status).toBe(409);
    expect((await api().delete(`/api/admin/blocks/${block.body.id}`).set("Authorization", `Bearer ${token}`)).status).toBe(200);

    const settings = await api().get("/api/admin/settings").set("Authorization", `Bearer ${token}`);
    expect(settings.body.vendorEmail).toBeTruthy();
    const put = await api().put("/api/admin/settings").set("Authorization", `Bearer ${token}`).send({ ...settings.body, usdRate: 2700 });
    expect(put.status).toBe(200);
    expect(put.body.usdRate).toBe(2700);
    expect((await api().get("/api/settings")).body.vendorEmail).toBeUndefined();

    const zone = await api().post("/api/admin/delivery-zones").set("Authorization", `Bearer ${token}`).send({ name: "Test zone", feeTzs: 12345 });
    expect(zone.status).toBe(201);
    const patched = await api().patch(`/api/admin/delivery-zones/${zone.body.id}`).set("Authorization", `Bearer ${token}`).send({ active: false });
    expect(patched.body.active).toBe(false);
    expect((await api().get("/api/delivery-zones")).body.some((z: { id: number }) => z.id === zone.body.id)).toBe(false);
    expect((await api().delete(`/api/admin/delivery-zones/${zone.body.id}`).set("Authorization", `Bearer ${token}`)).status).toBe(200);

    const prop = await api().get("/api/admin/properties").set("Authorization", `Bearer ${token}`);
    expect(prop.body[0].icalExportUrl).toMatch(/\/api\/ical\/\d+\/[a-f0-9]{32}\.ics$/);
  });
});

describe("ical", () => {
  it("exports a feed with VEVENTs for bookings and manual blocks", async () => {
    const token = await adminToken();
    const p = await propertyBySlug("oyster-bay-garden-flat");
    expect((await api().post("/api/bookings/stay").send(stayBody(p.id, day(30), day(32)))).status).toBe(201);
    await api().post("/api/admin/blocks").set("Authorization", `Bearer ${token}`).send({ targetType: "stay", targetId: p.id, startDate: day(40), endDate: day(41), reason: "Owner stay" });

    expect((await api().get(`/api/ical/${p.id}/${"0".repeat(32)}.ics`)).status).toBe(404);
    const res = await api().get(`/api/ical/${p.id}/${p.ical_token}.ics`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/calendar");
    expect(res.text).toContain("BEGIN:VCALENDAR");
    expect(res.text).toContain("BEGIN:VEVENT");
    expect(res.text).toContain(`DTSTART;VALUE=DATE:${day(30).replace(/-/g, "")}`);
    expect(res.text).toContain(`DTEND;VALUE=DATE:${day(32).replace(/-/g, "")}`);
    expect(res.text).toContain(`DTEND;VALUE=DATE:${day(42).replace(/-/g, "")}`); // block end is inclusive -> +1
    expect(res.text).toMatch(/UID:booking-\d+@bluesparks/);

    // Round-trip: our own feed parses back into inclusive ranges
    const events = parseIcsEvents(res.text);
    expect(events.find((e) => e.uid.startsWith("booking-"))).toMatchObject({ start: day(30), end: day(31) });
    expect(events.find((e) => e.uid.startsWith("block-"))).toMatchObject({ start: day(40), end: day(41) });
  });

  it("parses Airbnb-style feeds", () => {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN",
      "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20270105", "DTEND;VALUE=DATE:20270108", "UID:abc123@airbnb.com", "SUMMARY:Reserved", "END:VEVENT",
      "BEGIN:VEVENT", "DTSTART:20270201T120000Z", "DTEND:20270203T090000Z", "UID:timed@booking.com", "SUMMARY:CLOSED - Not available", "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const events = parseIcsEvents(ics);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ uid: "abc123@airbnb.com", start: "2027-01-05", end: "2027-01-07" });
    expect(events[1]).toMatchObject({ uid: "timed@booking.com", start: "2027-02-01", end: "2027-02-03" });
  });
});
