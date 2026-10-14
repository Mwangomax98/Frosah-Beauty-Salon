import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { MAX_UPLOAD_BYTES } from "@bluesparks/shared";
import { config } from "../config.ts";
import { badRequest } from "../middleware/errors.ts";

export const DOCUMENT_KINDS = ["licence", "id", "passport"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

const DOCUMENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/tiff"]);

const TOKEN_RE = /^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/;

export function ensureUploadDirs(): void {
  fs.mkdirSync(config.uploads.images, { recursive: true });
  fs.mkdirSync(config.uploads.private, { recursive: true });
}

/** Memory storage: files are inspected (magic bytes) before anything touches the disk. */
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

const randomName = () => crypto.randomBytes(16).toString("hex");

/** Store a customer document (licence / ID / passport) privately. Returns the opaque token (file name). */
export async function saveDocument(buffer: Buffer): Promise<{ path: string }> {
  const type = await fileTypeFromBuffer(buffer);
  const ext = type ? DOCUMENT_TYPES[type.mime] : undefined;
  if (!type || !ext) throw badRequest("Only JPEG, PNG, WebP images or PDF files are accepted");
  ensureUploadDirs();
  const token = `${randomName()}.${ext}`;
  await fs.promises.writeFile(path.join(config.uploads.private, token), buffer, { flag: "wx" });
  return { path: token };
}

export function isValidDocumentToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

export function documentFilePath(token: string): string | null {
  if (!isValidDocumentToken(token)) return null;
  return path.join(config.uploads.private, token);
}

export async function documentExists(token: string): Promise<boolean> {
  const file = documentFilePath(token);
  if (!file) return false;
  try {
    await fs.promises.access(file, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function documentContentType(token: string): string {
  const ext = token.split(".").pop();
  for (const [mime, e] of Object.entries(DOCUMENT_TYPES)) if (e === ext) return mime;
  return "application/octet-stream";
}

/** Re-encode an admin image to WebP (max 1600px on the long side) and store it publicly. */
export async function saveImage(buffer: Buffer): Promise<{ url: string; path: string }> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !IMAGE_TYPES.has(type.mime)) throw badRequest("Please upload a JPEG, PNG or WebP image");
  ensureUploadDirs();
  const name = `${randomName()}.webp`;
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await fs.promises.writeFile(path.join(config.uploads.images, name), out, { flag: "wx" });
  return { url: `/uploads/images/${name}`, path: name };
}
