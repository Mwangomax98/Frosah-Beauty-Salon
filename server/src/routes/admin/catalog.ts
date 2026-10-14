import crypto from "node:crypto";
import { Router, type Router as RouterType } from "express";
import { z, type ZodTypeAny } from "zod";
import { AMENITIES, isIsoDate } from "@bluesparks/shared";
import {
  execute,
  query,
  queryOne,
  rowToDeliveryZone,
  rowToExtra,
  rowToPromoCode,
  rowToProperty,
  rowToSeasonalRate,
  rowToVehicle,
  toJson,
  type Row,
} from "../../db.ts";
import { badRequest, conflict, notFound } from "../../middleware/errors.ts";
import { parseBody } from "../../middleware/validate.ts";
import { icalExportUrl, syncPropertyIcal } from "../../services/ical.ts";

/**
 * Generic CRUD for the catalogue tables. Each entity declares its zod schema, the camelCase -> column map
 * and the row mapper; the router does the rest.
 */
interface EntityDef<S extends ZodTypeAny> {
  path: string;
  table: string;
  schema: S;
  columns: Record<string, string>; // camelCase field -> column name
  json?: string[]; // fields stored as JSON
  map: (r: Row) => unknown;
  orderBy: string;
  beforeCreate?: (data: Record<string, unknown>) => Record<string, unknown>;
  afterMap?: (entity: unknown) => unknown;
}

function toRow(def: EntityDef<ZodTypeAny>, data: Record<string, unknown>): { cols: string[]; values: unknown[] } {
  const cols: string[] = [];
  const values: unknown[] = [];
  for (const [field, col] of Object.entries(def.columns)) {
    if (!(field in data) || data[field] === undefined) continue;
    cols.push(col);
    let v = data[field];
    if (def.json?.includes(field)) v = toJson(v);
    else if (typeof v === "boolean") v = v ? 1 : 0;
    values.push(v);
  }
  return { cols, values };
}

function dupError(err: unknown, what: string): never {
  if ((err as { code?: string }).code === "ER_DUP_ENTRY") throw conflict(`${what} with that slug/code already exists`, { slug: "Already in use" });
  throw err;
}

function crud<S extends ZodTypeAny>(router: RouterType, def: EntityDef<S>): void {
  const base = `/${def.path}`;
  const finish = (r: Row) => (def.afterMap ? def.afterMap(def.map(r)) : def.map(r));

  router.get(base, async (_req, res) => {
    const rows = await query(`SELECT * FROM ${def.table} ORDER BY ${def.orderBy}`);
    res.json(rows.map(finish));
  });

  router.get(`${base}/:id`, async (req, res) => {
    const row = await queryOne(`SELECT * FROM ${def.table} WHERE id = ?`, [Number(req.params.id)]);
    if (!row) throw notFound();
    res.json(finish(row));
  });

  router.post(base, async (req, res) => {
    let data = parseBody(def.schema, req) as Record<string, unknown>;
    if (def.beforeCreate) data = def.beforeCreate(data);
    const { cols, values } = toRow(def, data);
    if (!cols.length) throw badRequest("Nothing to save");
    try {
      const r = await execute(`INSERT INTO ${def.table} (${cols.map((c) => `\`${c}\``).join(",")}) VALUES (${cols.map(() => "?").join(",")})`, values);
      const row = await queryOne(`SELECT * FROM ${def.table} WHERE id = ?`, [r.insertId]);
      res.status(201).json(finish(row!));
    } catch (err) {
      dupError(err, def.path);
    }
  });

  router.patch(`${base}/:id`, async (req, res) => {
    const id = Number(req.params.id);
    const partial = (def.schema as unknown as z.AnyZodObject).partial();
    const data = parseBody(partial, req) as Record<string, unknown>;
    const { cols, values } = toRow(def, data);
    if (!cols.length) throw badRequest("Nothing to update");
    try {
      const r = await execute(`UPDATE ${def.table} SET ${cols.map((c) => `\`${c}\` = ?`).join(", ")} WHERE id = ?`, [...values, id]);
      if (!r.affectedRows) throw notFound();
      const row = await queryOne(`SELECT * FROM ${def.table} WHERE id = ?`, [id]);
      res.json(finish(row!));
    } catch (err) {
      dupError(err, def.path);
    }
  });

  router.delete(`${base}/:id`, async (req, res) => {
    const r = await execute(`DELETE FROM ${def.table} WHERE id = ?`, [Number(req.params.id)]);
    if (!r.affectedRows) throw notFound();
    res.json({ ok: true });
  });
}

// ---------- Schemas ----------

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes").max(120);
const money = z.coerce.number().int().min(0);
const moneyOrNull = z.coerce.number().int().min(0).nullable();
const isoDate = z.string().refine(isIsoDate, "Use YYYY-MM-DD");
const strArray = z.array(z.string().trim().max(255)).max(50);

const vehicleSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().max(60).default("SUV"),
  seats: z.coerce.number().int().min(1).max(60).default(5),
  bags: z.coerce.number().int().min(0).max(30).default(2),
  transmission: z.enum(["manual", "automatic"]).default("automatic"),
  drive: z.enum(["2WD", "4WD"]).default("2WD"),
  fuel: z.string().trim().max(30).default("Petrol"),
  features: strArray.default([]),
  images: strArray.default([]),
  pricePerDayTzs: money,
  pricePerWeekTzs: moneyOrNull.default(null),
  pricePerMonthTzs: moneyOrNull.default(null),
  mileagePolicy: z.string().trim().max(255).default("Unlimited within Dar es Salaam"),
  depositTzs: money.default(0),
  description: z.string().trim().max(5000).default(""),
  active: z.boolean().default(true),
});

const propertySchema = z.object({
  slug,
  name: z.string().trim().min(2).max(160),
  area: z.string().trim().min(2).max(80),
  address: z.string().trim().max(255).default(""),
  lat: z.coerce.number().min(-90).max(90).nullable().default(null),
  lng: z.coerce.number().min(-180).max(180).nullable().default(null),
  bedrooms: z.coerce.number().int().min(0).max(20).default(1),
  beds: z.coerce.number().int().min(0).max(30).default(1),
  bathrooms: z.coerce.number().int().min(0).max(20).default(1),
  maxGuests: z.coerce.number().int().min(1).max(30).default(2),
  amenities: z.array(z.enum(AMENITIES)).default([]),
  houseRules: z.string().trim().max(5000).default(""),
  description: z.string().trim().max(5000).default(""),
  images: strArray.default([]),
  pricePerNightTzs: money,
  pricePerWeekTzs: moneyOrNull.default(null),
  pricePerMonthTzs: moneyOrNull.default(null),
  cleaningFeeTzs: money.default(0),
  minNights: z.coerce.number().int().min(1).max(60).default(1),
  paymentMode: z.enum(["full_online", "deposit", "on_arrival"]).default("deposit"),
  depositPercent: z.coerce.number().int().min(0).max(100).default(30),
  checkinInstructions: z.string().trim().max(5000).default(""),
  icalImportUrls: z.array(z.string().trim().url().max(1000)).max(10).default([]),
  active: z.boolean().default(true),
});

const seasonalRateSchema = z
  .object({
    targetType: z.enum(["car", "stay"]),
    targetId: z.coerce.number().int().positive(),
    name: z.string().trim().min(1).max(120),
    startDate: isoDate,
    endDate: isoDate,
    priceTzs: money,
  })
  .refine((s) => s.endDate >= s.startDate, { message: "End must be on or after start", path: ["endDate"] });

const extraSchema = z.object({
  service: z.enum(["car", "stay", "both"]),
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores").max(60),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(255).default(""),
  priceTzs: money,
  pricing: z.enum(["per_day", "per_booking"]).default("per_booking"),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});

const zoneSchema = z.object({ name: z.string().trim().min(1).max(120), feeTzs: money, active: z.boolean().default(true) });

const promoSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]+$/, "Letters and numbers only").max(40),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().int().min(0),
  service: z.enum(["car", "stay", "both"]).default("both"),
  validFrom: isoDate.nullable().default(null),
  validTo: isoDate.nullable().default(null),
  maxUses: z.coerce.number().int().min(0).nullable().default(null),
  active: z.boolean().default(true),
});

// ---------- Router ----------

export const adminCatalogRouter = Router();

crud(adminCatalogRouter, {
  path: "vehicles",
  table: "vehicles",
  schema: vehicleSchema,
  orderBy: "active DESC, name ASC",
  json: ["features", "images"],
  map: rowToVehicle,
  columns: {
    slug: "slug", name: "name", category: "category", seats: "seats", bags: "bags", transmission: "transmission", drive: "drive", fuel: "fuel",
    features: "features", images: "images", pricePerDayTzs: "price_per_day_tzs", pricePerWeekTzs: "price_per_week_tzs", pricePerMonthTzs: "price_per_month_tzs",
    mileagePolicy: "mileage_policy", depositTzs: "deposit_tzs", description: "description", active: "active",
  },
});

crud(adminCatalogRouter, {
  path: "properties",
  table: "properties",
  schema: propertySchema,
  orderBy: "active DESC, name ASC",
  json: ["amenities", "images", "icalImportUrls"],
  map: rowToProperty,
  afterMap: (p) => {
    const prop = p as ReturnType<typeof rowToProperty>;
    return { ...prop, icalExportUrl: icalExportUrl(prop) };
  },
  beforeCreate: (data) => ({ ...data, icalToken: crypto.randomBytes(16).toString("hex") }),
  columns: {
    slug: "slug", name: "name", area: "area", address: "address", lat: "lat", lng: "lng", bedrooms: "bedrooms", beds: "beds", bathrooms: "bathrooms",
    maxGuests: "max_guests", amenities: "amenities", houseRules: "house_rules", description: "description", images: "images",
    pricePerNightTzs: "price_per_night_tzs", pricePerWeekTzs: "price_per_week_tzs", pricePerMonthTzs: "price_per_month_tzs", cleaningFeeTzs: "cleaning_fee_tzs",
    minNights: "min_nights", paymentMode: "payment_mode", depositPercent: "deposit_percent", checkinInstructions: "checkin_instructions",
    icalImportUrls: "ical_import_urls", icalToken: "ical_token", active: "active",
  },
});

adminCatalogRouter.post("/properties/:id/ical-sync", async (req, res) => {
  const id = Number(req.params.id);
  const exists = await queryOne("SELECT id FROM properties WHERE id = ?", [id]);
  if (!exists) throw notFound("Property");
  res.json(await syncPropertyIcal(id));
});

crud(adminCatalogRouter, {
  path: "seasonal-rates",
  table: "seasonal_rates",
  schema: seasonalRateSchema,
  orderBy: "start_date DESC",
  map: rowToSeasonalRate,
  columns: { targetType: "target_type", targetId: "target_id", name: "name", startDate: "start_date", endDate: "end_date", priceTzs: "price_tzs" },
});

crud(adminCatalogRouter, {
  path: "extras",
  table: "extras",
  schema: extraSchema,
  orderBy: "service ASC, sort_order ASC, id ASC",
  map: (r) => ({ ...rowToExtra(r), sortOrder: Number(r.sort_order ?? 0) }),
  columns: { service: "service", code: "code", name: "name", description: "description", priceTzs: "price_tzs", pricing: "pricing", sortOrder: "sort_order", active: "active" },
});

crud(adminCatalogRouter, {
  path: "delivery-zones",
  table: "delivery_zones",
  schema: zoneSchema,
  orderBy: "fee_tzs ASC",
  map: rowToDeliveryZone,
  columns: { name: "name", feeTzs: "fee_tzs", active: "active" },
});

crud(adminCatalogRouter, {
  path: "promo-codes",
  table: "promo_codes",
  schema: promoSchema,
  orderBy: "active DESC, code ASC",
  map: rowToPromoCode,
  columns: { code: "code", type: "type", value: "value", service: "service", validFrom: "valid_from", validTo: "valid_to", maxUses: "max_uses", active: "active" },
});
