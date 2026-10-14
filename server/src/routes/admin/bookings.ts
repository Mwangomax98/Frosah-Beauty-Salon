import { Router } from "express";
import { z } from "zod";
import type { Booking } from "@bluesparks/shared";
import { addDays, isIsoDate, todayIso } from "@bluesparks/shared";
import { query, rowToBlockedDate, rowToBooking } from "../../db.ts";
import { toCsv } from "../../lib/csv.ts";
import { notFound } from "../../middleware/errors.ts";
import { parseBody, parseQuery } from "../../middleware/validate.ts";
import { adminBookingPatchSchema, adminUpdateBooking, getBookingById } from "../../services/bookings.ts";

export const adminBookingsRouter = Router();

const isoDate = z.string().refine(isIsoDate, "Use YYYY-MM-DD");

const listSchema = z.object({
  service: z.enum(["car", "stay"]).optional(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  paymentStatus: z.enum(["unpaid", "paid", "deposit_paid", "pay_on_arrival"]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

function buildWhere(f: z.infer<typeof listSchema>): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (f.service) (clauses.push("service = ?"), params.push(f.service));
  if (f.status) (clauses.push("status = ?"), params.push(f.status));
  if (f.paymentStatus) (clauses.push("payment_status = ?"), params.push(f.paymentStatus));
  if (f.from) (clauses.push("end_date >= ?"), params.push(f.from));
  if (f.to) (clauses.push("start_date <= ?"), params.push(f.to));
  if (f.q) {
    const like = `%${f.q}%`;
    clauses.push("(reference LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR customer_phone LIKE ? OR item_name LIKE ?)");
    params.push(like, like, like, like, like);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

adminBookingsRouter.get("/bookings", async (req, res) => {
  const f = parseQuery(listSchema, req);
  const { where, params } = buildWhere(f);
  const [{ total }] = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM bookings ${where}`, params);
  const rows = await query(`SELECT * FROM bookings ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, f.pageSize, (f.page - 1) * f.pageSize]);
  res.json({ items: rows.map(rowToBooking), total: Number(total), page: f.page, pageSize: f.pageSize });
});

adminBookingsRouter.get("/bookings.csv", async (req, res) => {
  const f = parseQuery(listSchema.omit({ page: true, pageSize: true }), req);
  const { where, params } = buildWhere({ ...f, page: 1, pageSize: 1 });
  const rows = await query(`SELECT * FROM bookings ${where} ORDER BY created_at DESC LIMIT 20000`, params);
  const headers = [
    "Reference", "Service", "Status", "Payment status", "Payment method", "Item", "Start date", "End date", "Start time", "End time",
    "Customer", "Email", "Phone", "Country", "Subtotal TZS", "Discount TZS", "Total TZS", "Deposit TZS", "Promo code", "Extras", "Special requests", "Admin notes", "Created at",
  ];
  const data = rows.map(rowToBooking).map((b: Booking) => [
    b.reference, b.service, b.status, b.paymentStatus, b.paymentMethod, b.itemName, b.startDate, b.endDate, b.startTime, b.endTime,
    b.customer.fullName, b.customer.email, b.customer.phone, b.customer.country,
    b.quote.subtotalTzs, b.quote.discountTzs, b.totalTzs, b.quote.depositTzs, b.promoCode,
    b.extras.map((e) => `${e.name} x${e.qty}`).join("; "), b.customer.specialRequests ?? "", b.adminNotes, b.createdAt,
  ]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="bookings-${todayIso()}.csv"`);
  res.send(toCsv(headers, data));
});

adminBookingsRouter.get("/bookings/:id", async (req, res) => {
  const booking = await getBookingById(Number(req.params.id));
  if (!booking) throw notFound("Booking");
  const payments = await query("SELECT id, gateway, gateway_ref, tx_ref, amount_tzs, status, created_at FROM payments WHERE booking_id = ? ORDER BY id", [booking.id]);
  const notifications = await query("SELECT channel, status, detail, created_at FROM notification_log WHERE booking_id = ? ORDER BY id", [booking.id]);
  res.json({ ...booking, payments, notifications });
});

adminBookingsRouter.patch("/bookings/:id", async (req, res) => {
  const patch = parseBody(adminBookingPatchSchema, req);
  res.json(await adminUpdateBooking(Number(req.params.id), patch));
});

// ---------- Reports ----------

adminBookingsRouter.get("/reports/revenue", async (req, res) => {
  const today = todayIso();
  const q = parseQuery(z.object({ from: isoDate.optional(), to: isoDate.optional() }), req);
  const from = q.from ?? `${today.slice(0, 4) - 0 - 1}${today.slice(4, 7)}-01`;
  const to = q.to ?? addDays(today, 365);
  const rows = await query<{
    service: "car" | "stay";
    status: string;
    payment_status: string;
    total_tzs: number;
    start_date: string;
    paid: number | null;
  }>(
    `SELECT b.service, b.status, b.payment_status, b.total_tzs, b.start_date,
            (SELECT COALESCE(SUM(p.amount_tzs),0) FROM payments p WHERE p.booking_id = b.id AND p.status='successful') AS paid
     FROM bookings b WHERE b.start_date BETWEEN ? AND ? AND b.status <> 'cancelled'`,
    [from, to],
  );
  const empty = () => ({ count: 0, totalTzs: 0, paidTzs: 0 });
  const summary = { car: empty(), stay: empty() };
  const months = new Map<string, { month: string; car: { count: number; totalTzs: number }; stay: { count: number; totalTzs: number } }>();
  for (const r of rows) {
    const total = Number(r.total_tzs);
    const paid = r.payment_status === "paid" ? total : Number(r.paid ?? 0);
    const s = summary[r.service];
    s.count += 1;
    s.totalTzs += total;
    s.paidTzs += Math.min(paid, total);
    const month = r.start_date.slice(0, 7);
    const m = months.get(month) ?? { month, car: { count: 0, totalTzs: 0 }, stay: { count: 0, totalTzs: 0 } };
    m[r.service].count += 1;
    m[r.service].totalTzs += total;
    months.set(month, m);
  }
  res.json({ from, to, ...summary, byMonth: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)) });
});

// ---------- Calendar ----------

adminBookingsRouter.get("/calendar", async (req, res) => {
  const today = todayIso();
  const q = parseQuery(z.object({ service: z.enum(["car", "stay"]).optional(), from: isoDate.optional(), to: isoDate.optional() }), req);
  const from = q.from ?? addDays(today, -30);
  const to = q.to ?? addDays(today, 90);
  const services = q.service ? [q.service] : (["car", "stay"] as const);
  const items: { id: number; service: "car" | "stay"; name: string; slug: string; bookings: Booking[]; blocks: ReturnType<typeof rowToBlockedDate>[] }[] = [];
  for (const service of services) {
    const table = service === "car" ? "vehicles" : "properties";
    const col = service === "car" ? "vehicle_id" : "property_id";
    const things = await query<{ id: number; name: string; slug: string }>(`SELECT id, name, slug FROM ${table} ORDER BY name`);
    const bookings = await query(
      `SELECT * FROM bookings WHERE service = ? AND status IN ('pending','confirmed','completed') AND start_date <= ? AND end_date >= ? ORDER BY start_date`,
      [service, to, from],
    );
    const blocks = await query(`SELECT * FROM blocked_dates WHERE target_type = ? AND start_date <= ? AND end_date >= ? ORDER BY start_date`, [service, to, from]);
    for (const t of things) {
      items.push({
        id: Number(t.id),
        service,
        name: t.name,
        slug: t.slug,
        bookings: bookings.filter((b) => Number(b[col]) === Number(t.id)).map(rowToBooking),
        blocks: blocks.filter((b) => Number(b.target_id) === Number(t.id)).map(rowToBlockedDate),
      });
    }
  }
  res.json({ from, to, items });
});

export { parseBody };
