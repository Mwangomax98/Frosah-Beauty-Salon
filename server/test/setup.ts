// Runs before every test file. Points the server at the throwaway `bluesparks_test` database,
// applies the schema + seed, and clears booking data so each file starts clean.
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll } from "vitest";

process.env.NODE_ENV = "test";
process.env.DB_HOST ??= "127.0.0.1";
process.env.DB_PORT ??= "3306";
process.env.DB_USER ??= "bluesparks";
process.env.DB_PASSWORD ??= "bluesparks";
process.env.DB_NAME = process.env.TEST_DB_NAME ?? "bluesparks_test";
process.env.JWT_SECRET = "test-secret-0123456789abcdef0123456789";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "TestPass123!";
process.env.PAYMENT_GATEWAY = "mock";
process.env.API_PUBLIC_URL = "http://localhost:4100";
process.env.PUBLIC_URL = "http://localhost:5173";
process.env.UPLOAD_DIR = path.join(os.tmpdir(), "bluesparks-test-uploads");
process.env.RATE_LIMIT_DISABLED = "1";
process.env.SMTP_HOST = "";
process.env.WHATSAPP_CLOUD_TOKEN = "";
process.env.WHATSAPP_PHONE_ID = "";

beforeAll(async () => {
  const { setupDatabase } = await import("../scripts/db-setup.ts");
  await setupDatabase();
  const { pool } = await import("../src/db.ts");
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of ["notification_log", "payments", "bookings", "blocked_dates", "seasonal_rates"]) await pool.query(`TRUNCATE TABLE ${t}`);
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  await pool.query("UPDATE promo_codes SET uses = 0");
});

afterAll(async () => {
  // Let fire-and-forget notifications finish before the pool closes.
  await new Promise((r) => setTimeout(r, 300));
  const { pool } = await import("../src/db.ts");
  await pool.end();
});
