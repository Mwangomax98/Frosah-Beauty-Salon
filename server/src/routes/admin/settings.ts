import { Router } from "express";
import { z } from "zod";
import type { Settings } from "@bluesparks/shared";
import { execute, withTransaction } from "../../db.ts";
import { parseBody } from "../../middleware/validate.ts";
import { getSettings } from "../../services/reference.ts";

export const adminSettingsRouter = Router();

export const settingsSchema = z.object({
  usdRate: z.coerce.number().positive(),
  driverFeeDarTzs: z.coerce.number().int().min(0),
  driverFeeUpcountryTzs: z.coerce.number().int().min(0),
  bundleDiscountPercent: z.coerce.number().min(0).max(100),
  businessWhatsapp: z.string().trim().regex(/^\d{9,15}$/, "Digits only, with country code and no +, e.g. 2557XXXXXXXX"),
  vendorEmail: z.string().trim().toLowerCase().email(),
  businessEmail: z.string().trim().toLowerCase().email(),
  businessPhone: z.string().trim().max(40),
  businessAddress: z.string().trim().max(255),
  bnbBrandName: z.string().trim().min(1).max(80),
});

adminSettingsRouter.get("/settings", async (_req, res) => {
  res.json(await getSettings());
});

adminSettingsRouter.put("/settings", async (req, res) => {
  const settings = parseBody(settingsSchema, req) as Settings;
  await withTransaction(async (conn) => {
    for (const [key, value] of Object.entries(settings)) {
      await execute("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [key, String(value)], conn);
    }
  });
  res.json(await getSettings());
});
