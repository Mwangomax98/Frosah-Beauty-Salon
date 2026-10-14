import type { DeliveryZone, Extra, PromoCode, Property, SeasonalRate, Service, Settings, Vehicle } from "@bluesparks/shared";
import {
  pool,
  query,
  queryOne,
  rowToDeliveryZone,
  rowToExtra,
  rowToPromoCode,
  rowToProperty,
  rowToSeasonalRate,
  rowToVehicle,
  rowsToSettings,
  type Queryable,
} from "../db.ts";

// Small read helpers shared by the public and admin routes and the booking service.

export async function getSettings(conn: Queryable = pool): Promise<Settings> {
  const rows = await query<{ key: string; value: string }>("SELECT `key`, `value` FROM settings", [], conn);
  return rowsToSettings(rows);
}

export async function listVehicles(activeOnly: boolean, conn: Queryable = pool): Promise<Vehicle[]> {
  const rows = await query(`SELECT * FROM vehicles ${activeOnly ? "WHERE active = 1" : ""} ORDER BY price_per_day_tzs ASC, id ASC`, [], conn);
  return rows.map(rowToVehicle);
}

export async function getVehicle(id: number, conn: Queryable = pool): Promise<Vehicle | null> {
  const row = await queryOne("SELECT * FROM vehicles WHERE id = ?", [id], conn);
  return row ? rowToVehicle(row) : null;
}

export async function getVehicleBySlug(slug: string, conn: Queryable = pool): Promise<Vehicle | null> {
  const row = await queryOne("SELECT * FROM vehicles WHERE slug = ?", [slug], conn);
  return row ? rowToVehicle(row) : null;
}

export type PropertyRow = Property & { icalToken: string };

export async function listProperties(activeOnly: boolean, conn: Queryable = pool): Promise<PropertyRow[]> {
  const rows = await query(`SELECT * FROM properties ${activeOnly ? "WHERE active = 1" : ""} ORDER BY price_per_night_tzs ASC, id ASC`, [], conn);
  return rows.map(rowToProperty);
}

export async function getProperty(id: number, conn: Queryable = pool): Promise<PropertyRow | null> {
  const row = await queryOne("SELECT * FROM properties WHERE id = ?", [id], conn);
  return row ? rowToProperty(row) : null;
}

export async function getPropertyBySlug(slug: string, conn: Queryable = pool): Promise<PropertyRow | null> {
  const row = await queryOne("SELECT * FROM properties WHERE slug = ?", [slug], conn);
  return row ? rowToProperty(row) : null;
}

export async function listExtras(service: Service | "all", activeOnly = true, conn: Queryable = pool): Promise<Extra[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (activeOnly) where.push("active = 1");
  if (service !== "all") {
    where.push("(service = ? OR service = 'both')");
    params.push(service);
  }
  const rows = await query(`SELECT * FROM extras ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY sort_order ASC, id ASC`, params, conn);
  return rows.map(rowToExtra);
}

export async function listDeliveryZones(activeOnly = true, conn: Queryable = pool): Promise<DeliveryZone[]> {
  const rows = await query(`SELECT * FROM delivery_zones ${activeOnly ? "WHERE active = 1" : ""} ORDER BY fee_tzs ASC, id ASC`, [], conn);
  return rows.map(rowToDeliveryZone);
}

export async function listSeasonalRates(targetType: Service, targetId: number, conn: Queryable = pool): Promise<SeasonalRate[]> {
  const rows = await query("SELECT * FROM seasonal_rates WHERE target_type = ? AND target_id = ? ORDER BY start_date ASC", [targetType, targetId], conn);
  return rows.map(rowToSeasonalRate);
}

export async function getPromoByCode(code: string | undefined, conn: Queryable = pool): Promise<PromoCode | null> {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return null;
  const row = await queryOne("SELECT * FROM promo_codes WHERE UPPER(code) = ?", [trimmed], conn);
  return row ? rowToPromoCode(row) : null;
}
