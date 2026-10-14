import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { api, carBody, customer, day, firstVehicle, propertyBySlug, stayBody } from "./helpers.ts";

describe("stay bookings", () => {
  it("creates a stay booking with a reference, WhatsApp link and payment redirect", async () => {
    const p = await propertyBySlug("masaki-seaview-apartment"); // deposit mode
    const res = await api().post("/api/bookings/stay").send(stayBody(p.id, day(40), day(43), { paymentMethod: "online", extras: [] }));
    expect(res.status).toBe(201);
    const { booking, payment, whatsappLink } = res.body;
    expect(booking.reference).toMatch(/^BS-[A-HJ-NP-Z2-9]{6}$/);
    expect(booking.status).toBe("pending");
    expect(booking.paymentStatus).toBe("unpaid");
    expect(booking.quote.nights).toBe(3);
    expect(booking.quote.depositTzs).toBeLessThan(booking.totalTzs);
    expect(whatsappLink).toContain("https://wa.me/");
    expect(booking.whatsappLink).toBe(whatsappLink);
    expect(payment.redirectUrl).toContain(`/api/payments/mock-checkout?tx_ref=${booking.reference}-1`);

    // Mock verify -> deposit paid + confirmed
    const verify = await api().get(`/api/payments/verify?tx_ref=${booking.reference}-1&mock=success`).set("Accept", "application/json");
    expect(verify.status).toBe(200);
    expect(verify.body.booking.status).toBe("confirmed");
    expect(verify.body.booking.paymentStatus).toBe("deposit_paid");

    // Browser navigation gets redirected to the client
    const nav = await api().get(`/api/payments/verify?tx_ref=${booking.reference}-1`).set("Accept", "text/html");
    expect(nav.status).toBe(302);
    expect(nav.headers.location).toContain(`/booking/${booking.reference}?email=`);
    expect(nav.headers.location).toContain("payment=success");

    // Customer lookup needs the matching email
    expect((await api().get(`/api/bookings/${booking.reference}?email=asha@example.com`)).status).toBe(200);
    expect((await api().get(`/api/bookings/${booking.reference}?email=other@example.com`)).status).toBe(403);
  });

  it("rejects overlapping nights with 409 but allows back-to-back stays", async () => {
    const p = await propertyBySlug("oyster-bay-garden-flat");
    expect((await api().post("/api/bookings/stay").send(stayBody(p.id, day(50), day(53)))).status).toBe(201);
    const clash = await api().post("/api/bookings/stay").send(stayBody(p.id, day(52), day(55), { customer: customer({ email: "other@example.com" }) }));
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe("conflict");
    // Check-in on the previous guest's check-out day is fine
    const next = await api().post("/api/bookings/stay").send(stayBody(p.id, day(53), day(55), { customer: customer({ email: "third@example.com" }) }));
    expect(next.status).toBe(201);
  });

  it("only lets one of two concurrent identical requests through", async () => {
    const p = await propertyBySlug("mikocheni-family-house");
    const [a, b] = await Promise.all([
      api().post("/api/bookings/stay").send(stayBody(p.id, day(60), day(64), { customer: customer({ email: "one@example.com" }) })),
      api().post("/api/bookings/stay").send(stayBody(p.id, day(61), day(65), { customer: customer({ email: "two@example.com" }) })),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it("returns the existing booking on a double submit", async () => {
    const p = await propertyBySlug("kigamboni-beach-cottage");
    const first = await api().post("/api/bookings/stay").send(stayBody(p.id, day(70), day(72)));
    const second = await api().post("/api/bookings/stay").send(stayBody(p.id, day(70), day(72)));
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.booking.reference).toBe(first.body.booking.reference);
  });

  it("enforces minimum nights, max guests and house rules acceptance", async () => {
    const p = await propertyBySlug("masaki-seaview-apartment"); // min 2 nights, 4 guests
    const short = await api().post("/api/bookings/stay").send(stayBody(p.id, day(80), day(81)));
    expect(short.status).toBe(400);
    const crowded = await api().post("/api/bookings/stay").send(stayBody(p.id, day(80), day(83), { guests: 9 }));
    expect(crowded.status).toBe(400);
    expect(crowded.body.error.fields.guests).toBeTruthy();
    const rules = await api().post("/api/bookings/stay").send(stayBody(p.id, day(80), day(83), { acceptedHouseRules: false }));
    expect(rules.status).toBe(400);
    expect(rules.body.error.fields.acceptedHouseRules).toBeTruthy();
  });
});

describe("car bookings", () => {
  it("keeps a one-day turnaround buffer between rentals", async () => {
    const v = await firstVehicle();
    expect((await api().post("/api/bookings/car").send(carBody(v.id, day(30), day(33)))).status).toBe(201);
    // Pick-up on the return day is blocked...
    const sameDay = await api().post("/api/bookings/car").send(carBody(v.id, day(33), day(35), { customer: customer({ email: "b@example.com" }) }));
    expect(sameDay.status).toBe(409);
    // ...the next day is fine.
    const nextDay = await api().post("/api/bookings/car").send(carBody(v.id, day(34), day(36), { customer: customer({ email: "c@example.com" }) }));
    expect(nextDay.status).toBe(201);
    expect(nextDay.body.booking.reference).toMatch(/^JR-/);
    // and the listing hides the vehicle for those dates
    const list = await api().get(`/api/vehicles?from=${day(31)}&to=${day(32)}`);
    expect(list.body.find((x: { id: number }) => x.id === v.id)).toBeUndefined();
    const detail = await api().get(`/api/vehicles/${v.slug}`);
    expect(detail.body.blocked).toEqual(expect.arrayContaining([{ start: day(30), end: day(36) }]));
  });

  it("requires licence + ID documents for self-drive", async () => {
    const v = await firstVehicle();
    const res = await api().post("/api/bookings/car").send(carBody(v.id, day(100), day(102), { rentalType: "self_drive" }));
    expect(res.status).toBe(400);
    expect(res.body.error.fields.licence).toBeTruthy();
    expect(res.body.error.fields.id).toBeTruthy();
  });

  it("rejects document tokens that were never uploaded", async () => {
    const v = await firstVehicle();
    const fake = (c: string) => `${c.repeat(32)}.jpg`;
    const res = await api().post("/api/bookings/car").send(
      carBody(v.id, day(100), day(102), {
        rentalType: "self_drive",
        documents: [
          { kind: "licence", path: fake("a"), originalName: "l.jpg" },
          { kind: "passport", path: fake("b"), originalName: "p.jpg" },
        ],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts self-drive with uploaded documents and lists them to the admin", async () => {
    const v = await firstVehicle();
    const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#F26B1D" } }).png().toBuffer();
    const up1 = await api().post("/api/uploads").field("kind", "licence").attach("file", png, "licence.png");
    expect(up1.status).toBe(201);
    expect(up1.body.path).toMatch(/^[a-f0-9]{32}\.png$/);
    const up2 = await api().post("/api/uploads").field("kind", "id").attach("file", png, "id.png");
    expect(up2.status).toBe(201);

    const badType = await api().post("/api/uploads").field("kind", "id").attach("file", Buffer.from("not an image at all"), "x.png");
    expect(badType.status).toBe(400);

    const res = await api().post("/api/bookings/car").send(
      carBody(v.id, day(110), day(112), {
        rentalType: "self_drive",
        paymentMethod: "online",
        documents: [
          { kind: "licence", path: up1.body.path, originalName: "licence.png" },
          { kind: "id", path: up2.body.path, originalName: "id.png" },
        ],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.booking.documents).toHaveLength(2);
    expect(res.body.payment.redirectUrl).toBeTruthy();
    expect(res.body.booking.quote.depositTzs).toBe(res.body.booking.totalTzs); // cars charge in full
  });

  it("validates basic fields", async () => {
    const v = await firstVehicle();
    const res = await api().post("/api/bookings/car").send(
      carBody(v.id, day(5), day(4), { customer: customer({ email: "nope", phone: "123" }), acceptedTerms: false }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.fields["customer.email"]).toBeTruthy();
    expect(res.body.error.fields["customer.phone"]).toBeTruthy();
    expect(res.body.error.fields.acceptedTerms).toBeTruthy();
  });
});
