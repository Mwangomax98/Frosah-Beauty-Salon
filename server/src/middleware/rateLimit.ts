import rateLimit from "express-rate-limit";
import { config } from "../config.ts";

const FIFTEEN_MIN = 15 * 60 * 1000;

const common = {
  windowMs: FIFTEEN_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.rateLimitDisabled,
  message: { error: { code: "rate_limited", message: "Too many requests. Please wait a few minutes and try again." } },
};

/** Public POST endpoints (bookings, quotes, uploads, contact): 30 / 15 min / IP. */
export const publicPostLimiter = rateLimit({
  ...common,
  limit: 30,
  skip: (req) => config.rateLimitDisabled || req.method !== "POST",
});

/** Admin login: 10 attempts / 15 min / IP. */
export const loginLimiter = rateLimit({ ...common, limit: 10 });
