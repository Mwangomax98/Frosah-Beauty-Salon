import { describe, expect, it } from "vitest";
import { api } from "./helpers.ts";
import { execute } from "../src/db.ts";

describe("customer reviews", () => {
  it("keeps a submitted review hidden until it is approved", async () => {
    await execute("DELETE FROM reviews");
    const res = await api().post("/api/reviews").send({ name: "Neema J.", location: "Arusha", service: "car", rating: 5, comment: "The Alphard was spotless and the driver was on time at JNIA." });
    expect(res.status).toBe(201);
    let list = await api().get("/api/reviews");
    expect(list.body.reviews).toHaveLength(0);
    expect(list.body.summary).toEqual({ count: 0, average: 0 });

    await execute("UPDATE reviews SET approved = 1");
    list = await api().get("/api/reviews");
    expect(list.body.reviews).toHaveLength(1);
    expect(list.body.reviews[0].name).toBe("Neema J.");
    expect(list.body.summary).toEqual({ count: 1, average: 5 });
  });

  it("rejects bad ratings and bots", async () => {
    const bad = await api().post("/api/reviews").send({ name: "X Y", rating: 9, comment: "Too many stars here" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.rating).toBeTruthy();
    const bot = await api().post("/api/reviews").send({ name: "Bot", rating: 5, comment: "Buy cheap things now", website: "spam.example" });
    expect(bot.status).toBe(400);
  });
});
