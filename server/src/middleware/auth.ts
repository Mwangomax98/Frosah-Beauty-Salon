import type { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";
import { unauthorized } from "./errors.ts";

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminUser;
    }
  }
}

export const ADMIN_COOKIE = "bs_admin";
const TOKEN_TTL_SECONDS = 8 * 3600;

export function signToken(user: AdminUser): string {
  return jwt.sign({ sub: String(user.id), email: user.email, name: user.name }, config.jwtSecret, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE, { httpOnly: true, sameSite: "lax", secure: config.isProd, path: "/" });
}

export function verifyToken(token: string): AdminUser | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    if (!payload.sub) return null;
    return { id: Number(payload.sub), email: String(payload.email ?? ""), name: String(payload.name ?? "Admin") };
  } catch {
    return null;
  }
}

/** Accepts `Authorization: Bearer <jwt>` or the httpOnly cookie. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  let token: string | undefined;
  if (header?.startsWith("Bearer ")) token = header.slice(7).trim();
  else if (req.cookies?.[ADMIN_COOKIE]) token = String(req.cookies[ADMIN_COOKIE]);
  const user = token ? verifyToken(token) : null;
  if (!user) return next(unauthorized("Please sign in again"));
  req.admin = user;
  next();
};
