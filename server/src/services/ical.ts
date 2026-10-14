import ical from "node-ical";
import type { Booking, Property } from "@bluesparks/shared";
import { addDays, toIso } from "@bluesparks/shared";
import { config } from "../config.ts";
import { execute, query, rowToBlockedDate, rowToBooking, withTransaction } from "../db.ts";
import { listProperties } from "./reference.ts";

// ---------- Export ----------

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = (iso: string) => iso.replace(/-/g, "");
const fold = (line: string): string => {
  // RFC 5545: lines should not exceed 75 octets; continuation lines start with a space.
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  out.push(rest);
  return out.join("\r\n");
};

export function icalExportUrl(property: { id: number; icalToken: string }): string {
  return `${config.apiPublicUrl}/api/ical/${property.id}/${property.icalToken}.ics`;
}

/** All-day VEVENTs; DTEND is exclusive per RFC 5545 (checkout day / day after a block). */
export function buildPropertyFeed(
  property: Pick<Property, "id" | "name">,
  bookings: Pick<Booking, "id" | "reference" | "startDate" | "endDate" | "updatedAt" | "createdAt">[],
  blocks: { id: number; startDate: string; endDate: string; reason: string; source: string }[],
): string {
  const now = new Date();
  const stamp = `${toIso(now).replace(/-/g, "")}T${now.toISOString().slice(11, 19).replace(/:/g, "")}Z`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Blue Spark Holdings//Blue Spark Stays//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${icsEscape(property.name)} (Blue Spark)`),
  ];
  for (const b of bookings) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${b.id}@bluesparks`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(b.startDate)}`,
      `DTEND;VALUE=DATE:${icsDate(b.endDate)}`,
      fold(`SUMMARY:${icsEscape(`Reserved — ${b.reference}`)}`),
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  for (const bl of blocks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:block-${bl.id}@bluesparks`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(bl.startDate)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(bl.endDate, 1))}`,
      fold(`SUMMARY:${icsEscape(bl.reason || "Not available")}`),
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export async function propertyFeed(propertyId: number): Promise<string | null> {
  const [propRow] = await query("SELECT id, name FROM properties WHERE id = ?", [propertyId]);
  if (!propRow) return null;
  const bookings = await query(
    "SELECT * FROM bookings WHERE property_id = ? AND status IN ('pending','confirmed') AND end_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) ORDER BY start_date",
    [propertyId],
  );
  // Only our own manual blocks go out; re-exporting imported events would echo them back to the source.
  const blocks = await query(
    "SELECT * FROM blocked_dates WHERE target_type = 'stay' AND target_id = ? AND source = 'manual' AND end_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) ORDER BY start_date",
    [propertyId],
  );
  return buildPropertyFeed({ id: Number(propRow.id), name: String(propRow.name) }, bookings.map(rowToBooking), blocks.map(rowToBlockedDate));
}

// ---------- Import ----------

export interface ImportedEvent {
  uid: string;
  start: string; // inclusive
  end: string; // inclusive
  summary: string;
}

type IcalDate = Date & { dateOnly?: boolean };

/** All-day values keep their calendar date; timed values are read in Dar time (UTC+3). */
function toDateString(d: IcalDate): string {
  if (d.dateOnly) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return toIso(new Date(d.getTime() + 3 * 3600 * 1000));
}

export function parseIcsEvents(body: string): ImportedEvent[] {
  const data = ical.sync.parseICS(body);
  const out: ImportedEvent[] = [];
  for (const comp of Object.values(data)) {
    if (!comp || comp.type !== "VEVENT") continue;
    const ev = comp as ical.VEvent;
    if (!ev.start) continue;
    const start = toDateString(ev.start as IcalDate);
    const endRaw = ev.end ? (ev.end as IcalDate) : null;
    let endExclusive = endRaw ? toDateString(endRaw) : addDays(start, 1);
    // A timed event ending at 00:00 is treated like a date-only exclusive end; otherwise the end day is occupied.
    if (endRaw && !endRaw.dateOnly) {
      const shifted = new Date(endRaw.getTime() + 3 * 3600 * 1000);
      if (shifted.getUTCHours() !== 0 || shifted.getUTCMinutes() !== 0) endExclusive = addDays(endExclusive, 1);
    }
    if (endExclusive <= start) endExclusive = addDays(start, 1);
    const end = addDays(endExclusive, -1);
    const uid = String(ev.uid ?? `${start}-${end}-${ev.summary ?? ""}`).slice(0, 255);
    out.push({ uid, start, end, summary: String(ev.summary ?? "").slice(0, 255) });
  }
  return out;
}

async function fetchIcs(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Blue Spark-iCal-Sync/1.0", Accept: "text/calendar, */*" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

/**
 * Pull every import URL of a property and mirror the events into blocked_dates (source=ical).
 * Blocks whose UID disappeared are removed — but only when every URL was fetched successfully,
 * so a flaky Airbnb/Booking.com response never opens up dates by accident.
 */
export async function syncPropertyIcal(propertyId: number): Promise<{ imported: number; removed: number; errors: string[] }> {
  const [row] = await query("SELECT id, ical_import_urls FROM properties WHERE id = ?", [propertyId]);
  if (!row) throw new Error(`Property ${propertyId} not found`);
  let urls: string[] = [];
  try {
    urls = typeof row.ical_import_urls === "string" ? JSON.parse(row.ical_import_urls) : (row.ical_import_urls as string[]);
  } catch {
    urls = [];
  }
  const events: ImportedEvent[] = [];
  const errors: string[] = [];
  for (const url of urls) {
    try {
      events.push(...parseIcsEvents(await fetchIcs(url)));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (urls.length === 0) {
    const res = await execute("DELETE FROM blocked_dates WHERE target_type='stay' AND target_id=? AND source='ical'", [propertyId]);
    return { imported: 0, removed: res.affectedRows, errors };
  }

  return withTransaction(async (conn) => {
    const seen = new Set<string>();
    for (const ev of events) {
      if (seen.has(ev.uid)) continue;
      seen.add(ev.uid);
      await execute(
        `INSERT INTO blocked_dates (target_type, target_id, start_date, end_date, reason, source, external_uid)
         VALUES ('stay', ?, ?, ?, ?, 'ical', ?)
         ON DUPLICATE KEY UPDATE start_date = VALUES(start_date), end_date = VALUES(end_date), reason = VALUES(reason)`,
        [propertyId, ev.start, ev.end, ev.summary || "Imported from calendar", ev.uid],
        conn,
      );
    }
    let removed = 0;
    if (errors.length === 0) {
      const existing = await query<{ id: number; external_uid: string }>(
        "SELECT id, external_uid FROM blocked_dates WHERE target_type='stay' AND target_id=? AND source='ical'",
        [propertyId],
        conn,
      );
      const stale = existing.filter((b) => !seen.has(b.external_uid)).map((b) => b.id);
      if (stale.length) {
        const res = await execute(`DELETE FROM blocked_dates WHERE id IN (${stale.map(() => "?").join(",")})`, stale, conn);
        removed = res.affectedRows;
      }
    }
    return { imported: seen.size, removed, errors };
  });
}

export async function syncAllIcal(): Promise<void> {
  const properties = await listProperties(false);
  for (const p of properties) {
    if (!p.icalImportUrls.length) continue;
    try {
      const r = await syncPropertyIcal(p.id);
      const errs = r.errors.length ? ` (${r.errors.length} URL error(s): ${r.errors.join("; ")})` : "";
      console.log(`[ical] ${p.slug}: ${r.imported} imported, ${r.removed} removed${errs}`);
    } catch (err) {
      console.error(`[ical] ${p.slug}: sync failed`, err);
    }
  }
}

const THIRTY_MINUTES = 30 * 60 * 1000;

/** Run once now (non-fatal) and then every 30 minutes. Returns a stop function. */
export function startIcalScheduler(): () => void {
  void syncAllIcal().catch((err) => console.error("[ical] initial sync failed", err));
  const timer = setInterval(() => void syncAllIcal(), THIRTY_MINUTES);
  timer.unref();
  return () => clearInterval(timer);
}
