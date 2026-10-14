import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { queryOne } from "../../db.ts";
import { clearAuthCookie, requireAdmin, setAuthCookie, signToken } from "../../middleware/auth.ts";
import { ApiError } from "../../middleware/errors.ts";
import { loginLimiter } from "../../middleware/rateLimit.ts";
import { parseBody } from "../../middleware/validate.ts";

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

authRouter.post("/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = parseBody(loginSchema, req);
  const row = await queryOne<{ id: number; email: string; name: string; password_hash: string }>("SELECT * FROM admin_users WHERE email = ?", [email]);
  const ok = row ? await bcrypt.compare(password, row.password_hash) : false;
  if (!row || !ok) throw new ApiError(401, "invalid_credentials", "Email or password is incorrect");
  const user = { id: Number(row.id), email: row.email, name: row.name };
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ token, user });
});

authRouter.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/auth/me", requireAdmin, (req, res) => {
  res.json({ user: req.admin });
});
