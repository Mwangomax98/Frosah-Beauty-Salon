import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) => new ApiError(400, "bad_request", message, fields);
export const unauthorized = (message = "Authentication required") => new ApiError(401, "unauthorized", message);
export const forbidden = (message = "Forbidden") => new ApiError(403, "forbidden", message);
export const notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found`);
export const conflict = (message: string, fields?: Record<string, string>) => new ApiError(409, "conflict", message, fields);

export function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Route not found" } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: "validation_error", message: "Please check the highlighted fields", fields: zodFields(err) } });
    return;
  }
  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5 MB)" : err.message;
    res.status(400).json({ error: { code: "upload_error", message } });
    return;
  }
  // body-parser JSON syntax errors and similar
  const anyErr = err as { status?: number; statusCode?: number; type?: string; message?: string };
  const status = anyErr.status ?? anyErr.statusCode;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: { code: anyErr.type ?? "bad_request", message: anyErr.message ?? "Bad request" } });
    return;
  }
  console.error("[error]", err);
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong on our side. Please try again." } });
};
