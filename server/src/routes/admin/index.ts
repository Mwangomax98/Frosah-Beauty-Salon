import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.ts";
import { authRouter } from "./auth.ts";
import { adminBlocksRouter } from "./blocks.ts";
import { adminBookingsRouter } from "./bookings.ts";
import { adminCatalogRouter } from "./catalog.ts";
import { adminSettingsRouter } from "./settings.ts";
import { adminUploadsRouter } from "./uploads.ts";

export const adminRouter = Router();

adminRouter.use(authRouter); // login/logout are public; /auth/me checks itself
adminRouter.use(requireAdmin);
adminRouter.use(adminBookingsRouter);
adminRouter.use(adminBlocksRouter);
adminRouter.use(adminCatalogRouter);
adminRouter.use(adminSettingsRouter);
adminRouter.use(adminUploadsRouter);
