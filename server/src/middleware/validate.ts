import type { Request, RequestHandler } from "express";
import type { ZodTypeAny, z } from "zod";

/** Parse `req.body` with a zod schema. ZodErrors propagate to the error handler as 400 with `fields`. */
export function parseBody<S extends ZodTypeAny>(schema: S, req: Request): z.infer<S> {
  return schema.parse(req.body ?? {});
}

export function parseQuery<S extends ZodTypeAny>(schema: S, req: Request): z.infer<S> {
  return schema.parse(req.query ?? {});
}

export function parseParams<S extends ZodTypeAny>(schema: S, req: Request): z.infer<S> {
  return schema.parse(req.params ?? {});
}

/** Middleware variant: validates the body up-front and replaces it with the parsed value. */
export function validateBody<S extends ZodTypeAny>(schema: S): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Wrap an async handler so rejections reach the error handler (Express 5 does this natively, kept for clarity). */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
