import { Router } from "express";
import { publicPostLimiter } from "../../middleware/rateLimit.ts";
import { bookingsRouter, quotesRouter } from "./bookings.ts";
import { catalogRouter } from "./catalog.ts";
import { contactRouter } from "./contact.ts";
import { icalRouter } from "./ical.ts";
import { paymentsRouter } from "./payments.ts";
import { uploadsRouter } from "./uploads.ts";

export const publicRouter = Router();

publicRouter.use(publicPostLimiter); // only counts POST requests
publicRouter.use(catalogRouter);
publicRouter.use(quotesRouter);
publicRouter.use(bookingsRouter);
publicRouter.use(uploadsRouter);
publicRouter.use(paymentsRouter);
publicRouter.use(icalRouter);
publicRouter.use(contactRouter);
