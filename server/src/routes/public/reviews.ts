import { Router } from "express";
import { z } from "zod";
import type { ReviewSummary } from "@bluesparks/shared";
import { execute, query, rowToReview } from "../../db.ts";
import { parseBody, parseQuery } from "../../middleware/validate.ts";

export const reviewsRouter = Router();

/** Approved reviews, newest first, plus the average rating across all approved reviews. */
reviewsRouter.get("/reviews", async (req, res) => {
  const q = parseQuery(z.object({ service: z.enum(["car", "stay", "general"]).optional(), limit: z.coerce.number().int().min(1).max(100).default(24) }), req);
  const where = q.service ? "approved = 1 AND service = ?" : "approved = 1";
  const params = q.service ? [q.service] : [];
  const rows = await query(`SELECT * FROM reviews WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ${q.limit}`, params);
  const [agg] = await query<{ n: number; avg: number | null }>(`SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE ${where}`, params);
  const summary: ReviewSummary = { count: Number(agg?.n ?? 0), average: agg?.avg ? Math.round(Number(agg.avg) * 10) / 10 : 0 };
  res.json({ reviews: rows.map(rowToReview), summary });
});

const submitSchema = z.object({
  name: z.string().trim().min(2, "Your name, please").max(120),
  location: z.string().trim().max(120).default(""),
  service: z.enum(["car", "stay", "general"]).default("general"),
  rating: z.coerce.number().int().min(1, "Pick 1 to 5 stars").max(5),
  comment: z.string().trim().min(10, "Tell us a little more").max(2000),
  // Honeypot: real users never fill this in.
  website: z.string().max(0).optional(),
});

/** New reviews wait for approval in the admin dashboard before they appear on the site. */
reviewsRouter.post("/reviews", async (req, res) => {
  const { website: _website, ...r } = parseBody(submitSchema, req);
  await execute("INSERT INTO reviews (name, location, service, rating, comment, approved) VALUES (?,?,?,?,?,0)", [r.name, r.location, r.service, r.rating, r.comment]);
  res.status(201).json({ ok: true, pending: true });
});
