import { Router } from "express";
import { z } from "zod";
import { isIsoDate } from "@bluesparks/shared";
import { execute, query, queryOne, rowToBlockedDate } from "../../db.ts";
import { badRequest, notFound } from "../../middleware/errors.ts";
import { parseBody, parseQuery } from "../../middleware/validate.ts";

export const adminBlocksRouter = Router();

const isoDate = z.string().refine(isIsoDate, "Use YYYY-MM-DD");

const createSchema = z
  .object({
    targetType: z.enum(["car", "stay"]),
    targetId: z.coerce.number().int().positive(),
    startDate: isoDate,
    endDate: isoDate,
    reason: z.string().trim().max(255).default(""),
  })
  .refine((b) => b.endDate >= b.startDate, { message: "End date must be on or after start date", path: ["endDate"] });

adminBlocksRouter.get("/blocks", async (req, res) => {
  const q = parseQuery(z.object({ targetType: z.enum(["car", "stay"]).optional(), targetId: z.coerce.number().int().optional(), from: isoDate.optional(), to: isoDate.optional() }), req);
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.targetType) (where.push("target_type = ?"), params.push(q.targetType));
  if (q.targetId) (where.push("target_id = ?"), params.push(q.targetId));
  if (q.from) (where.push("end_date >= ?"), params.push(q.from));
  if (q.to) (where.push("start_date <= ?"), params.push(q.to));
  const rows = await query(`SELECT * FROM blocked_dates ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY start_date DESC LIMIT 2000`, params);
  res.json(rows.map(rowToBlockedDate));
});

adminBlocksRouter.post("/blocks", async (req, res) => {
  const b = parseBody(createSchema, req);
  const table = b.targetType === "car" ? "vehicles" : "properties";
  const exists = await queryOne(`SELECT id FROM ${table} WHERE id = ?`, [b.targetId]);
  if (!exists) throw badRequest(`${b.targetType === "car" ? "Vehicle" : "Property"} not found`, { targetId: "Unknown item" });
  const r = await execute("INSERT INTO blocked_dates (target_type, target_id, start_date, end_date, reason, source) VALUES (?,?,?,?,?,'manual')", [
    b.targetType, b.targetId, b.startDate, b.endDate, b.reason,
  ]);
  const row = await queryOne("SELECT * FROM blocked_dates WHERE id = ?", [r.insertId]);
  res.status(201).json(rowToBlockedDate(row!));
});

adminBlocksRouter.delete("/blocks/:id", async (req, res) => {
  const r = await execute("DELETE FROM blocked_dates WHERE id = ?", [Number(req.params.id)]);
  if (!r.affectedRows) throw notFound("Block");
  res.json({ ok: true });
});
