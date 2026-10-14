import type { Service } from "@bluesparks/shared";
import { addDays, todayIso } from "@bluesparks/shared";
import { pool, query, type Queryable } from "../db.ts";

export interface DateRange {
  start: string;
  end: string; // inclusive
}

/**
 * Availability rules (see docs/API.md):
 * - Stay: requested [checkIn, checkOut) vs bookings [start, end) and blocks [start, end+1).
 * - Car:  requested [pickup, return+1) vs bookings [start, end+1) (turnaround buffer) and blocks [start, end+1).
 *
 * `start`/`end` here are the requested range as stored on a booking (end = checkOut for stays, return date for cars).
 */
function overlapSql(service: Service): { booking: string; block: string } {
  if (service === "stay") {
    return {
      booking: "start_date < ? AND end_date > ?", // params: [end, start]
      block: "start_date < ? AND end_date >= ?",
    };
  }
  return {
    booking: "start_date <= ? AND end_date >= ?",
    block: "start_date <= ? AND end_date >= ?",
  };
}

const itemColumn = (service: Service) => (service === "car" ? "vehicle_id" : "property_id");

export interface Conflict {
  kind: "booking" | "block";
  id: number;
  start: string;
  end: string;
  reference?: string;
}

/** Find bookings/blocks that collide with the requested range. Run inside the transaction that locked the item row. */
export async function findConflicts(
  service: Service,
  itemId: number,
  start: string,
  end: string,
  opts: { excludeBookingId?: number } = {},
  conn: Queryable = pool,
): Promise<Conflict[]> {
  const sql = overlapSql(service);
  const bookingParams: unknown[] = [itemId, end, start];
  let exclude = "";
  if (opts.excludeBookingId) {
    exclude = " AND id <> ?";
    bookingParams.push(opts.excludeBookingId);
  }
  const bookings = await query<{ id: number; start_date: string; end_date: string; reference: string }>(
    `SELECT id, reference, start_date, end_date FROM bookings
     WHERE ${itemColumn(service)} = ? AND status IN ('pending','confirmed') AND ${sql.booking}${exclude}`,
    bookingParams,
    conn,
  );
  const blocks = await query<{ id: number; start_date: string; end_date: string }>(
    `SELECT id, start_date, end_date FROM blocked_dates WHERE target_type = ? AND target_id = ? AND ${sql.block}`,
    [service, itemId, end, start],
    conn,
  );
  return [
    ...bookings.map((b) => ({ kind: "booking" as const, id: b.id, start: b.start_date, end: b.end_date, reference: b.reference })),
    ...blocks.map((b) => ({ kind: "block" as const, id: b.id, start: b.start_date, end: b.end_date })),
  ];
}

/** IDs of items that are NOT available for the range (used to filter public listings). */
export async function busyItemIds(service: Service, start: string, end: string): Promise<Set<number>> {
  const sql = overlapSql(service);
  const col = itemColumn(service);
  const bookings = await query<{ item: number }>(
    `SELECT DISTINCT ${col} AS item FROM bookings WHERE ${col} IS NOT NULL AND status IN ('pending','confirmed') AND ${sql.booking}`,
    [end, start],
  );
  const blocks = await query<{ item: number }>(
    `SELECT DISTINCT target_id AS item FROM blocked_dates WHERE target_type = ? AND ${sql.block}`,
    [service, end, start],
  );
  return new Set([...bookings, ...blocks].map((r) => Number(r.item)));
}

/**
 * Unavailable date ranges for an item (inclusive on both ends) for the next `days` days.
 * For stays a booking's checkout day is free again, so its range ends the night before checkout.
 */
export async function blockedRanges(service: Service, itemId: number, days = 180): Promise<DateRange[]> {
  const from = todayIso();
  const to = addDays(from, days);
  const col = itemColumn(service);
  const bookings = await query<{ start_date: string; end_date: string }>(
    `SELECT start_date, end_date FROM bookings
     WHERE ${col} = ? AND status IN ('pending','confirmed') AND start_date <= ? AND end_date >= ?`,
    [itemId, to, from],
  );
  const blocks = await query<{ start_date: string; end_date: string }>(
    `SELECT start_date, end_date FROM blocked_dates WHERE target_type = ? AND target_id = ? AND start_date <= ? AND end_date >= ?`,
    [service, itemId, to, from],
  );
  const ranges: DateRange[] = [
    ...bookings.map((b) => ({ start: b.start_date, end: service === "stay" ? addDays(b.end_date, -1) : b.end_date })),
    ...blocks.map((b) => ({ start: b.start_date, end: b.end_date })),
  ].filter((r) => r.end >= r.start);
  return mergeRanges(ranges);
}

export function mergeRanges(ranges: DateRange[]): DateRange[] {
  const sorted = [...ranges].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const out: DateRange[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= addDays(last.end, 1)) {
      if (r.end > last.end) last.end = r.end;
    } else {
      out.push({ ...r });
    }
  }
  return out;
}
