import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

/** Walk up from this module until we find the server package root (works from src/ and dist/). */
function findServerRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const name = JSON.parse(fs.readFileSync(pkg, "utf8")).name;
        if (name === "@bluesparks/server") return dir;
      } catch {
        /* ignore */
      }
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

export const SERVER_ROOT = findServerRoot();

// Already-set environment variables always win over the .env file.
dotenv.config({ path: path.join(SERVER_ROOT, ".env") });

const bool = z
  .string()
  .optional()
  .transform((v) => v === "1" || v === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY: bool,
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  PUBLIC_URL: z.string().url().default("http://localhost:5173"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().default("Blue Spark Holdings <no-reply@localhost>"),
  PAYMENT_GATEWAY: z.enum(["mock", "flutterwave"]).default("mock"),
  FLUTTERWAVE_SECRET_KEY: z.string().optional().default(""),
  FLUTTERWAVE_PUBLIC_KEY: z.string().optional().default(""),
  FLUTTERWAVE_WEBHOOK_HASH: z.string().optional().default(""),
  WHATSAPP_CLOUD_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_ID: z.string().optional().default(""),
  UPLOAD_DIR: z.string().default("./uploads"),
  RATE_LIMIT_DISABLED: bool,
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n${lines.join("\n")}\n(see server/.env.example)`);
}
const env = parsed.data;

const uploadDir = path.isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : path.resolve(SERVER_ROOT, env.UPLOAD_DIR);

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  port: env.PORT,
  trustProxy: env.TRUST_PROXY,
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
  jwtSecret: env.JWT_SECRET,
  admin: { email: env.ADMIN_EMAIL.toLowerCase(), password: env.ADMIN_PASSWORD },
  clientOrigin: env.CLIENT_ORIGIN.replace(/\/$/, ""),
  publicUrl: env.PUBLIC_URL.replace(/\/$/, ""),
  apiPublicUrl: env.API_PUBLIC_URL.replace(/\/$/, ""),
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },
  payments: {
    gateway: env.PAYMENT_GATEWAY,
    flutterwave: {
      secretKey: env.FLUTTERWAVE_SECRET_KEY,
      publicKey: env.FLUTTERWAVE_PUBLIC_KEY,
      webhookHash: env.FLUTTERWAVE_WEBHOOK_HASH,
    },
  },
  whatsapp: { token: env.WHATSAPP_CLOUD_TOKEN, phoneId: env.WHATSAPP_PHONE_ID },
  uploads: {
    root: uploadDir,
    images: path.join(uploadDir, "images"),
    private: path.join(uploadDir, "private"),
  },
  rateLimitDisabled: env.RATE_LIMIT_DISABLED,
} as const;

export type Config = typeof config;
