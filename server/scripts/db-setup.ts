/**
 * Creates the database (if missing), applies sql/schema.sql (idempotent) and seeds placeholder data
 * when tables are empty. Safe to run repeatedly: existing rows are never duplicated.
 *
 *   npm run db:setup -w server
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { SERVER_ROOT, config } from "../src/config.ts";
import { DEFAULT_SETTINGS } from "../src/db.ts";

const log = (msg: string) => {
  if (!config.isTest) console.log(msg);
};

async function createDatabaseIfMissing(): Promise<void> {
  const conn = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } catch (err) {
    // The DB user may not be allowed to create databases; fine if it already exists.
    log(`(could not create database automatically: ${(err as Error).message})`);
  } finally {
    await conn.end();
  }
}

async function applySchema(conn: mysql.Connection): Promise<void> {
  const sql = fs.readFileSync(path.join(SERVER_ROOT, "sql", "schema.sql"), "utf8");
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
  for (const stmt of statements) await conn.query(stmt);
}

async function isEmpty(conn: mysql.Connection, table: string): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`${table}\``);
  return Number(rows[0].n) === 0;
}

const j = (v: unknown) => JSON.stringify(v);

async function seed(conn: mysql.Connection): Promise<void> {
  // Admin user: created from env; re-running updates the password so a changed ADMIN_PASSWORD takes effect.
  const hash = await bcrypt.hash(config.admin.password, 10);
  await conn.query(
    "INSERT INTO admin_users (email, password_hash, name) VALUES (?,?, 'Admin') ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
    [config.admin.email, hash],
  );
  log(`Admin user: ${config.admin.email}`);

  // Settings: only insert keys that are missing so admin edits survive re-runs.
  const defaults = { ...DEFAULT_SETTINGS, vendorEmail: config.admin.email, businessEmail: config.admin.email };
  for (const [key, value] of Object.entries(defaults)) {
    await conn.query("INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)", [key, String(value)]);
  }

  if (await isEmpty(conn, "vehicles")) {
    const vehicles = [
      {
        slug: "toyota-land-cruiser-prado", name: "Toyota Land Cruiser Prado", category: "4WD SUV", seats: 7, bags: 4, transmission: "automatic", drive: "4WD", fuel: "Diesel",
        features: ["Air conditioning", "Bluetooth", "Reverse camera", "Roof rack", "USB charging", "Spare wheel"],
        day: 350000, deposit: 500000,
        description: "The safari standard. Comfortable on tarmac, unstoppable on murram. Ideal for Mikumi, Morogoro and upcountry trips with the family.",
        mileage: "Unlimited within Dar es Salaam; 300 km/day upcountry",
      },
      {
        slug: "toyota-hilux-4wd", name: "Toyota Hilux Double Cab 4WD", category: "Pickup", seats: 5, bags: 3, transmission: "manual", drive: "4WD", fuel: "Diesel",
        features: ["Air conditioning", "Bluetooth", "Tow bar", "Load bed cover", "Spare wheel"],
        day: 250000, deposit: 400000,
        description: "Workhorse for site visits, cargo and rough roads. Popular with NGOs and contractors heading out of town.",
        mileage: "Unlimited within Dar es Salaam; 300 km/day upcountry",
      },
      {
        slug: "toyota-harrier", name: "Toyota Harrier", category: "SUV", seats: 5, bags: 3, transmission: "automatic", drive: "2WD", fuel: "Petrol",
        features: ["Air conditioning", "Leather seats", "Bluetooth", "Reverse camera", "Keyless entry"],
        day: 200000, deposit: 300000,
        description: "Smooth and quiet city SUV. A favourite for weddings, business meetings and airport runs.",
        mileage: "Unlimited within Dar es Salaam",
      },
      {
        slug: "toyota-rav4", name: "Toyota RAV4", category: "Compact SUV", seats: 5, bags: 2, transmission: "automatic", drive: "2WD", fuel: "Petrol",
        features: ["Air conditioning", "Bluetooth", "Reverse camera", "USB charging"],
        day: 150000, deposit: 250000,
        description: "Easy to park, economical on fuel and still high enough for Dar's rainy-season roads.",
        mileage: "Unlimited within Dar es Salaam",
      },
      {
        slug: "toyota-noah", name: "Toyota Noah 8-seater", category: "Van", seats: 8, bags: 5, transmission: "automatic", drive: "2WD", fuel: "Petrol",
        features: ["Air conditioning", "Sliding doors", "Bluetooth", "USB charging"],
        day: 180000, deposit: 250000,
        description: "Room for the whole group and the luggage. Great for airport transfers, church groups and day trips to Bagamoyo.",
        mileage: "Unlimited within Dar es Salaam",
      },
      {
        slug: "suzuki-alto", name: "Suzuki Alto", category: "Economy", seats: 4, bags: 1, transmission: "manual", drive: "2WD", fuel: "Petrol",
        features: ["Air conditioning", "Radio/AUX"],
        day: 120000, deposit: 150000,
        description: "Our most affordable car. Perfect for getting around town on a budget.",
        mileage: "Unlimited within Dar es Salaam",
      },
    ];
    let i = 1;
    for (const v of vehicles) {
      await conn.query(
        `INSERT INTO vehicles (slug, name, category, seats, bags, transmission, drive, fuel, features, images, price_per_day_tzs, price_per_week_tzs, price_per_month_tzs, mileage_policy, deposit_tzs, description, active)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [
          v.slug, v.name, v.category, v.seats, v.bags, v.transmission, v.drive, v.fuel, j(v.features),
          j([`/images/placeholders/car-${i}.webp`, `/images/placeholders/car-${i}-b.webp`]),
          v.day, Math.round((v.day * 6.3) / 1000) * 1000, Math.round((v.day * 24) / 1000) * 1000, v.mileage, v.deposit, v.description,
        ],
      );
      i++;
    }
    log(`Seeded ${vehicles.length} vehicles`);
  }

  if (await isEmpty(conn, "properties")) {
    const commonRules = "No smoking indoors. No parties or loud music after 22:00. Please respect the neighbours and the askari. Check-out by 11:00.";
    const properties = [
      {
        slug: "masaki-seaview-apartment", name: "Masaki Sea View Apartment", area: "Masaki", address: "Chole Road, Masaki, Dar es Salaam", lat: -6.7483, lng: 39.2758,
        bedrooms: 2, beds: 2, bathrooms: 2, maxGuests: 4, amenities: ["wifi", "ac", "parking", "kitchen", "pool", "generator", "security", "tv", "sea_view", "balcony", "gym"],
        night: 350000, cleaning: 50000, minNights: 2, paymentMode: "deposit", depositPercent: 30,
        description: "Bright two-bedroom on the peninsula with the ocean straight ahead. Walk to Slipway, Coco Beach and the Masaki restaurants.",
        checkin: "The building is on Chole Road, opposite the pharmacy. Tell the askari at the gate you are a Blue Spark guest; our caretaker Mama Neema will meet you with the keys. Check-in from 14:00.",
      },
      {
        slug: "oyster-bay-garden-flat", name: "Oyster Bay Garden Flat", area: "Oyster Bay", address: "Toure Drive, Oyster Bay, Dar es Salaam", lat: -6.7625, lng: 39.2806,
        bedrooms: 1, beds: 1, bathrooms: 1, maxGuests: 2, amenities: ["wifi", "ac", "parking", "kitchen", "generator", "security", "tv", "washer"],
        night: 220000, cleaning: 40000, minNights: 2, paymentMode: "full_online", depositPercent: 100,
        description: "Quiet ground-floor flat with a private garden, five minutes from Coco Beach and the embassies.",
        checkin: "Gate code is sent by WhatsApp on the morning of arrival. Keys are in the lockbox by the kitchen door. Check-in from 14:00.",
      },
      {
        slug: "mikocheni-family-house", name: "Mikocheni Family House", area: "Mikocheni", address: "Mwai Kibaki Road, Mikocheni B, Dar es Salaam", lat: -6.7667, lng: 39.2458,
        bedrooms: 3, beds: 4, bathrooms: 2, maxGuests: 6, amenities: ["wifi", "ac", "parking", "kitchen", "generator", "security", "tv", "washer", "balcony"],
        night: 280000, cleaning: 60000, minNights: 3, paymentMode: "deposit", depositPercent: 50,
        description: "Three-bedroom house in a gated compound with parking for two cars. Good for families and longer work stays.",
        checkin: "Our caretaker lives on the compound and will open the gate for you. Please share your arrival time in the booking. Check-in from 14:00.",
      },
      {
        slug: "city-centre-studio", name: "City Centre Studio", area: "City Centre", address: "Samora Avenue, Posta, Dar es Salaam", lat: -6.8161, lng: 39.2894,
        bedrooms: 1, beds: 1, bathrooms: 1, maxGuests: 2, amenities: ["wifi", "ac", "kitchen", "generator", "security", "tv"],
        night: 90000, cleaning: 20000, minNights: 1, paymentMode: "on_arrival", depositPercent: 0,
        description: "Simple, clean studio above the shops on Samora Avenue. Steps from the ferry, banks and government offices.",
        checkin: "Reception is on the ground floor and is staffed 24 hours. Show your booking reference and ID. Check-in from 13:00.",
      },
      {
        slug: "kigamboni-beach-cottage", name: "Kigamboni Beach Cottage", area: "Kigamboni", address: "Kigamboni Beach Road, Kigamboni, Dar es Salaam", lat: -6.8458, lng: 39.3069,
        bedrooms: 2, beds: 3, bathrooms: 1, maxGuests: 5, amenities: ["wifi", "ac", "parking", "kitchen", "generator", "security", "sea_view", "balcony"],
        night: 180000, cleaning: 40000, minNights: 2, paymentMode: "deposit", depositPercent: 30,
        description: "Barefoot cottage across the bridge, a short walk from the sand. Sunsets over the city skyline.",
        checkin: "Cross the Nyerere Bridge and follow Kigamboni Beach Road for 6 km. Our caretaker Juma will be waiting at the blue gate. Check-in from 14:00.",
      },
    ];
    let i = 1;
    for (const p of properties) {
      await conn.query(
        `INSERT INTO properties (slug, name, area, address, lat, lng, bedrooms, beds, bathrooms, max_guests, amenities, house_rules, description, images,
           price_per_night_tzs, price_per_week_tzs, price_per_month_tzs, cleaning_fee_tzs, min_nights, payment_mode, deposit_percent, checkin_instructions, ical_import_urls, ical_token, active)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [
          p.slug, p.name, p.area, p.address, p.lat, p.lng, p.bedrooms, p.beds, p.bathrooms, p.maxGuests, j(p.amenities), commonRules, p.description,
          j([`/images/placeholders/stay-${i}.webp`, `/images/placeholders/stay-${i}-b.webp`, `/images/placeholders/stay-${i}-c.webp`]),
          p.night, Math.round((p.night * 6.3) / 1000) * 1000, Math.round((p.night * 24) / 1000) * 1000, p.cleaning, p.minNights, p.paymentMode, p.depositPercent, p.checkin,
          j([]), crypto.randomBytes(16).toString("hex"),
        ],
      );
      i++;
    }
    log(`Seeded ${properties.length} properties`);
  }

  if (await isEmpty(conn, "seasonal_rates")) {
    const year = new Date().getFullYear();
    const [[v]] = await conn.query<mysql.RowDataPacket[]>("SELECT id, price_per_day_tzs FROM vehicles ORDER BY id LIMIT 1");
    const [[p]] = await conn.query<mysql.RowDataPacket[]>("SELECT id, price_per_night_tzs FROM properties ORDER BY id LIMIT 1");
    if (v) {
      await conn.query("INSERT INTO seasonal_rates (target_type, target_id, name, start_date, end_date, price_tzs) VALUES ('car', ?, 'Festive season', ?, ?, ?)", [
        v.id, `${year}-12-20`, `${year + 1}-01-05`, Math.round(Number(v.price_per_day_tzs) * 1.2),
      ]);
    }
    if (p) {
      await conn.query("INSERT INTO seasonal_rates (target_type, target_id, name, start_date, end_date, price_tzs) VALUES ('stay', ?, 'Festive season', ?, ?, ?)", [
        p.id, `${year}-12-20`, `${year + 1}-01-05`, Math.round(Number(p.price_per_night_tzs) * 1.25),
      ]);
    }
    log("Seeded 2 seasonal rates");
  }

  if (await isEmpty(conn, "extras")) {
    const extras: [string, string, string, string, number, string][] = [
      // service, code, name, description, price, pricing
      ["car", "additional_driver", "Additional driver", "Add a second named driver to the agreement", 15000, "per_day"],
      ["car", "child_seat", "Child seat", "Forward-facing seat for 1–4 years", 10000, "per_day"],
      ["car", "gps_holder", "GPS / phone holder", "Dashboard mount with charger", 10000, "per_booking"],
      ["car", "cooler_box", "Cooler box", "25 L cooler box, ice not included", 15000, "per_booking"],
      ["car", "airport_meet", "Airport meet & greet", "We wait at JNIA arrivals with your name", 30000, "per_booking"],
      ["car", "hotel_delivery", "Hotel / BnB delivery", "Car brought to your door (plus zone fee)", 20000, "per_booking"],
      ["car", "extra_insurance", "Extra insurance", "Reduces your excess to zero", 25000, "per_day"],
      ["car", "late_return", "Late return allowance", "Return up to 4 hours late without an extra day", 40000, "per_booking"],
      ["car", "upcountry_package", "Upcountry package", "Spare tyre, jack, jerrycan and recovery rope", 20000, "per_day"],
      ["stay", "airport_pickup", "Airport pickup", "Private car from JNIA to the apartment", 60000, "per_booking"],
      ["stay", "early_checkin", "Early check-in", "Arrive from 10:00 instead of 14:00", 30000, "per_booking"],
      ["stay", "late_checkout", "Late check-out", "Leave by 16:00 instead of 11:00", 30000, "per_booking"],
      ["stay", "breakfast", "Breakfast", "Fresh chapati, fruit, eggs and chai delivered each morning", 15000, "per_day"],
      ["stay", "extra_cleaning", "Extra cleaning", "Mid-stay clean and fresh linen", 40000, "per_booking"],
    ];
    let order = 0;
    for (const [service, code, name, description, price, pricing] of extras) {
      await conn.query("INSERT INTO extras (service, code, name, description, price_tzs, pricing, sort_order, active) VALUES (?,?,?,?,?,?,?,1)", [
        service, code, name, description, price, pricing, order++,
      ]);
    }
    log(`Seeded ${extras.length} extras`);
  }

  if (await isEmpty(conn, "delivery_zones")) {
    const zones: [string, number][] = [
      ["Masaki / Oyster Bay", 15000],
      ["City Centre / Kariakoo / Upanga", 20000],
      ["Mikocheni / Mbezi", 25000],
      ["Kigamboni", 35000],
    ];
    for (const [name, fee] of zones) await conn.query("INSERT INTO delivery_zones (name, fee_tzs, active) VALUES (?,?,1)", [name, fee]);
    log(`Seeded ${zones.length} delivery zones`);
  }

  if (await isEmpty(conn, "promo_codes")) {
    await conn.query("INSERT INTO promo_codes (code, type, value, service, max_uses, active) VALUES ('KARIBU10', 'percent', 10, 'both', NULL, 1)");
    log("Seeded promo code KARIBU10");
  }
}

export async function setupDatabase(): Promise<void> {
  await createDatabaseIfMissing();
  const conn = await mysql.createConnection({ ...config.db, multipleStatements: false, charset: "utf8mb4" });
  try {
    await applySchema(conn);
    log(`Schema applied to ${config.db.database}`);
    await seed(conn);
  } finally {
    await conn.end();
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  setupDatabase()
    .then(() => {
      console.log("Database ready.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("db:setup failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
