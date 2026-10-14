import { Router } from "express";
import { z } from "zod";
import { isIsoDate } from "@bluesparks/shared";
import { publicProperty } from "../../db.ts";
import { notFound } from "../../middleware/errors.ts";
import { parseQuery } from "../../middleware/validate.ts";
import { blockedRanges, busyItemIds } from "../../services/availability.ts";
import {
  getPropertyBySlug,
  getSettings,
  getVehicleBySlug,
  listDeliveryZones,
  listExtras,
  listProperties,
  listVehicles,
} from "../../services/reference.ts";

export const catalogRouter = Router();

const optionalDate = z.string().refine(isIsoDate, "Use YYYY-MM-DD").optional();

catalogRouter.get("/settings", async (_req, res) => {
  const { vendorEmail: _vendorEmail, ...publicSettings } = await getSettings();
  res.json(publicSettings);
});

catalogRouter.get("/vehicles", async (req, res) => {
  const q = parseQuery(z.object({ from: optionalDate, to: optionalDate }), req);
  let vehicles = await listVehicles(true);
  if (q.from && q.to && q.to >= q.from) {
    const busy = await busyItemIds("car", q.from, q.to);
    vehicles = vehicles.filter((v) => !busy.has(v.id));
  }
  res.json(vehicles);
});

catalogRouter.get("/vehicles/:slug", async (req, res) => {
  const vehicle = await getVehicleBySlug(String(req.params.slug));
  if (!vehicle || !vehicle.active) throw notFound("Vehicle");
  res.json({ ...vehicle, blocked: await blockedRanges("car", vehicle.id) });
});

catalogRouter.get("/properties", async (req, res) => {
  const q = parseQuery(
    z.object({ checkIn: optionalDate, checkOut: optionalDate, guests: z.coerce.number().int().positive().optional(), area: z.string().trim().max(80).optional() }),
    req,
  );
  let properties = await listProperties(true);
  if (q.area) properties = properties.filter((p) => p.area.toLowerCase() === q.area!.toLowerCase());
  if (q.guests) properties = properties.filter((p) => p.maxGuests >= q.guests!);
  if (q.checkIn && q.checkOut && q.checkOut > q.checkIn) {
    const busy = await busyItemIds("stay", q.checkIn, q.checkOut);
    properties = properties.filter((p) => !busy.has(p.id));
  }
  res.json(properties.map(publicProperty));
});

catalogRouter.get("/properties/:slug", async (req, res) => {
  const property = await getPropertyBySlug(String(req.params.slug));
  if (!property || !property.active) throw notFound("Property");
  res.json({ ...publicProperty(property), blocked: await blockedRanges("stay", property.id) });
});

catalogRouter.get("/extras", async (req, res) => {
  const q = parseQuery(z.object({ service: z.enum(["car", "stay"]).optional() }), req);
  res.json(await listExtras(q.service ?? "all"));
});

catalogRouter.get("/delivery-zones", async (_req, res) => {
  res.json(await listDeliveryZones(true));
});
