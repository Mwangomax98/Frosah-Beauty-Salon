import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import type {
  BlockedDate,
  Booking,
  DeliveryZone,
  Extra,
  Payment,
  PromoCode,
  Property,
  SeasonalRate,
  Settings,
  Vehicle,
} from "@bluesparks/shared";
import { config } from "./config.ts";

export const pool: Pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  // DATE columns come back as "YYYY-MM-DD" strings; TIMESTAMP columns as JS Dates interpreted as UTC.
  dateStrings: ["DATE"],
  timezone: "Z",
  supportBigNumbers: true,
});

// Keep the DB session in UTC so CURRENT_TIMESTAMP matches the JS-side `timezone: "Z"`.
pool.on("connection", (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

/** Anything that can run a query: the pool or a transaction connection. */
export type Queryable = Pool | PoolConnection;

export type Row = RowDataPacket & Record<string, unknown>;

export async function query<T = Row>(sql: string, params: unknown[] = [], conn: Queryable = pool): Promise<T[]> {
  const [rows] = await conn.query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

export async function queryOne<T = Row>(sql: string, params: unknown[] = [], conn: Queryable = pool): Promise<T | null> {
  const rows = await query<T>(sql, params, conn);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: unknown[] = [], conn: Queryable = pool): Promise<ResultSetHeader> {
  const [result] = await conn.query<ResultSetHeader>(sql, params);
  return result;
}

/**
 * Run `fn` inside a READ COMMITTED transaction. Rolled back on throw.
 * READ COMMITTED matters for availability checks: after a `SELECT ... FOR UPDATE` on the item row,
 * later reads must see bookings committed by the transaction we just waited for.
 */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    conn.release();
  }
}

// ---------- JSON / value helpers ----------

/** MariaDB returns JSON columns as strings, MySQL 8 as parsed values. Accept both. */
export function parseJson<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  if (Buffer.isBuffer(v)) return parseJson(v.toString("utf8"), fallback);
  return v as T;
}

export const toJson = (v: unknown): string => JSON.stringify(v ?? null);

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const bool = (v: unknown): boolean => v === 1 || v === true || v === "1";

/** "HH:mm:ss" -> "HH:mm" */
const time = (v: unknown): string | null => (v === null || v === undefined ? null : String(v).slice(0, 5));

export function isoTimestamp(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const d = new Date(v.includes("T") ? v : `${v.replace(" ", "T")}Z`);
    return Number.isNaN(d.getTime()) ? v : d.toISOString();
  }
  return new Date().toISOString();
}

// ---------- Row mappers ----------

export function rowToVehicle(r: Row): Vehicle {
  return {
    id: num(r.id),
    slug: str(r.slug),
    name: str(r.name),
    category: str(r.category),
    seats: num(r.seats),
    bags: num(r.bags),
    transmission: r.transmission as Vehicle["transmission"],
    drive: r.drive as Vehicle["drive"],
    fuel: str(r.fuel),
    features: parseJson<string[]>(r.features, []),
    images: parseJson<string[]>(r.images, []),
    pricePerDayTzs: num(r.price_per_day_tzs),
    pricePerWeekTzs: numOrNull(r.price_per_week_tzs),
    pricePerMonthTzs: numOrNull(r.price_per_month_tzs),
    mileagePolicy: str(r.mileage_policy),
    depositTzs: num(r.deposit_tzs),
    description: str(r.description),
    active: bool(r.active),
  };
}

/** Admin-facing property (includes iCal import URLs). Use `publicProperty` for the public API. */
export function rowToProperty(r: Row): Property & { icalToken: string } {
  return {
    id: num(r.id),
    slug: str(r.slug),
    name: str(r.name),
    area: str(r.area),
    address: str(r.address),
    lat: numOrNull(r.lat),
    lng: numOrNull(r.lng),
    bedrooms: num(r.bedrooms),
    beds: num(r.beds),
    bathrooms: num(r.bathrooms),
    maxGuests: num(r.max_guests),
    amenities: parseJson<string[]>(r.amenities, []),
    houseRules: str(r.house_rules),
    description: str(r.description),
    images: parseJson<string[]>(r.images, []),
    pricePerNightTzs: num(r.price_per_night_tzs),
    pricePerWeekTzs: numOrNull(r.price_per_week_tzs),
    pricePerMonthTzs: numOrNull(r.price_per_month_tzs),
    cleaningFeeTzs: num(r.cleaning_fee_tzs),
    minNights: num(r.min_nights) || 1,
    paymentMode: r.payment_mode as Property["paymentMode"],
    depositPercent: num(r.deposit_percent),
    checkinInstructions: str(r.checkin_instructions),
    icalImportUrls: parseJson<string[]>(r.ical_import_urls, []),
    icalToken: str(r.ical_token),
    active: bool(r.active),
  };
}

/** Strip private fields for the public API. `icalImportUrls` is always empty publicly. */
export function publicProperty(p: Property & { icalToken?: string }): Property {
  const { icalToken: _token, ...rest } = p;
  return { ...rest, icalImportUrls: [] };
}

export function rowToSeasonalRate(r: Row): SeasonalRate {
  return {
    id: num(r.id),
    targetType: r.target_type as SeasonalRate["targetType"],
    targetId: num(r.target_id),
    name: str(r.name),
    startDate: str(r.start_date),
    endDate: str(r.end_date),
    priceTzs: num(r.price_tzs),
  };
}

export function rowToExtra(r: Row): Extra {
  return {
    id: num(r.id),
    service: r.service as Extra["service"],
    code: str(r.code),
    name: str(r.name),
    description: str(r.description),
    priceTzs: num(r.price_tzs),
    pricing: r.pricing as Extra["pricing"],
    active: bool(r.active),
  };
}

export function rowToDeliveryZone(r: Row): DeliveryZone {
  return { id: num(r.id), name: str(r.name), feeTzs: num(r.fee_tzs), active: bool(r.active) };
}

export function rowToPromoCode(r: Row): PromoCode {
  return {
    id: num(r.id),
    code: str(r.code),
    type: r.type as PromoCode["type"],
    value: num(r.value),
    service: r.service as PromoCode["service"],
    validFrom: r.valid_from ? str(r.valid_from) : null,
    validTo: r.valid_to ? str(r.valid_to) : null,
    maxUses: numOrNull(r.max_uses),
    uses: num(r.uses),
    active: bool(r.active),
  };
}

export function rowToBlockedDate(r: Row): BlockedDate & { externalUid: string | null } {
  return {
    id: num(r.id),
    targetType: r.target_type as BlockedDate["targetType"],
    targetId: num(r.target_id),
    startDate: str(r.start_date),
    endDate: str(r.end_date),
    reason: str(r.reason),
    source: r.source as BlockedDate["source"],
    externalUid: r.external_uid ? str(r.external_uid) : null,
  };
}

export function rowToBooking(r: Row): Booking {
  return {
    id: num(r.id),
    reference: str(r.reference),
    service: r.service as Booking["service"],
    status: r.status as Booking["status"],
    paymentStatus: r.payment_status as Booking["paymentStatus"],
    paymentMethod: r.payment_method as Booking["paymentMethod"],
    currency: r.currency as Booking["currency"],
    customer: {
      fullName: str(r.customer_name),
      email: str(r.customer_email),
      phone: str(r.customer_phone),
      country: str(r.customer_country),
      specialRequests: r.special_requests ? str(r.special_requests) : undefined,
    },
    startDate: str(r.start_date),
    endDate: str(r.end_date),
    startTime: time(r.start_time),
    endTime: time(r.end_time),
    vehicleId: numOrNull(r.vehicle_id),
    propertyId: numOrNull(r.property_id),
    itemName: str(r.item_name),
    details: parseJson<Record<string, unknown>>(r.details, {}),
    extras: parseJson<Booking["extras"]>(r.extras, []),
    quote: parseJson<Booking["quote"]>(r.quote, {
      items: [],
      subtotalTzs: 0,
      discountTzs: 0,
      totalTzs: 0,
      depositTzs: 0,
      notes: [],
    }),
    totalTzs: num(r.total_tzs),
    promoCode: r.promo_code ? str(r.promo_code) : null,
    bundleWithBookingId: numOrNull(r.bundle_with_booking_id),
    documents: parseJson<Booking["documents"]>(r.documents, []),
    adminNotes: str(r.admin_notes),
    createdAt: isoTimestamp(r.created_at),
    updatedAt: isoTimestamp(r.updated_at),
  };
}

export function rowToPayment(r: Row): Payment & { txRef: string } {
  return {
    id: num(r.id),
    bookingId: num(r.booking_id),
    gateway: str(r.gateway),
    gatewayRef: r.gateway_ref ? str(r.gateway_ref) : null,
    txRef: str(r.tx_ref),
    amountTzs: num(r.amount_tzs),
    status: r.status as Payment["status"],
    createdAt: isoTimestamp(r.created_at),
  };
}

export const DEFAULT_SETTINGS: Settings = {
  usdRate: 2600,
  driverFeeDarTzs: 40000,
  driverFeeUpcountryTzs: 60000,
  bundleDiscountPercent: 10,
  businessWhatsapp: "255700000000",
  vendorEmail: "bookings@example.com",
  businessEmail: "info@example.com",
  businessPhone: "+255 700 000 000",
  businessAddress: "Masaki, Dar es Salaam",
  bnbBrandName: "Bluesparks Stays",
};

const NUMERIC_SETTINGS: (keyof Settings)[] = ["usdRate", "driverFeeDarTzs", "driverFeeUpcountryTzs", "bundleDiscountPercent"];

/** settings table is key/value; coerce numeric keys. Missing keys fall back to defaults. */
export function rowsToSettings(rows: { key: string; value: string }[]): Settings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    out[key] = (NUMERIC_SETTINGS as string[]).includes(key) ? Number(value) : value;
  }
  return out as unknown as Settings;
}
