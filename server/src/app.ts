import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.ts";
import { pool } from "./db.ts";
import { errorHandler, notFoundHandler } from "./middleware/errors.ts";
import { adminRouter } from "./routes/admin/index.ts";
import { publicRouter } from "./routes/public/index.ts";
import { ensureUploadDirs } from "./services/uploads.ts";

export function createApp(): Express {
  ensureUploadDirs();
  const app = express();

  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(
    helmet({
      // Images are embedded by the client on another origin.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false, // API only; the mock checkout page is plain inline CSS
    }),
  );
  app.use(cors({ origin: config.clientOrigin, credentials: true, exposedHeaders: ["Content-Disposition"] }));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.get("/api/health", async (_req, res) => {
    let db = false;
    try {
      await pool.query("SELECT 1");
      db = true;
    } catch {
      /* reported below */
    }
    res.status(db ? 200 : 503).json({ ok: db, db, gateway: config.payments.gateway, time: new Date().toISOString() });
  });

  // Public images only. UPLOAD_DIR/private is never mounted.
  app.use("/uploads/images", express.static(config.uploads.images, { maxAge: "7d", immutable: true, index: false, dotfiles: "deny" }));

  app.use("/api/admin", adminRouter);
  app.use("/api", publicRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
