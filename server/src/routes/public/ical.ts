import crypto from "node:crypto";
import { Router } from "express";
import { queryOne } from "../../db.ts";
import { notFound } from "../../middleware/errors.ts";
import { propertyFeed } from "../../services/ical.ts";

export const icalRouter = Router();

/** Public export feed; the token in the URL is the only secret. Paste into Airbnb / Booking.com "import calendar". */
icalRouter.get("/ical/:propertyId/:token.ics", async (req, res) => {
  const propertyId = Number(req.params.propertyId);
  const token = String(req.params.token);
  if (!Number.isInteger(propertyId) || !/^[a-f0-9]{32}$/i.test(token)) throw notFound("Calendar");
  const row = await queryOne<{ ical_token: string }>("SELECT ical_token FROM properties WHERE id = ?", [propertyId]);
  if (!row) throw notFound("Calendar");
  const a = Buffer.from(String(row.ical_token).toLowerCase());
  const b = Buffer.from(token.toLowerCase());
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw notFound("Calendar");
  const feed = await propertyFeed(propertyId);
  if (feed === null) throw notFound("Calendar");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="bluesparks-${propertyId}.ics"`);
  res.setHeader("Cache-Control", "no-cache");
  res.send(feed);
});
