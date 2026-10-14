import fs from "node:fs";
import { Router } from "express";
import { badRequest, notFound } from "../../middleware/errors.ts";
import { documentContentType, documentFilePath, memoryUpload, saveImage } from "../../services/uploads.ts";

export const adminUploadsRouter = Router();

/** Accepts the file under `image` or `file`. */
adminUploadsRouter.post("/uploads/image", memoryUpload.any(), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const file = files.find((f) => f.fieldname === "image") ?? files[0];
  if (!file) throw badRequest("Please choose an image", { image: "Required" });
  const saved = await saveImage(file.buffer);
  res.status(201).json({ url: saved.url });
});

/** Stream a customer's private document. Never served statically. */
adminUploadsRouter.get("/documents/:token", async (req, res) => {
  const token = String(req.params.token);
  const file = documentFilePath(token);
  if (!file) throw notFound("Document");
  try {
    await fs.promises.access(file, fs.constants.R_OK);
  } catch {
    throw notFound("Document");
  }
  res.setHeader("Content-Type", documentContentType(token));
  res.setHeader("Content-Disposition", `inline; filename="${token}"`);
  res.setHeader("Cache-Control", "private, no-store");
  fs.createReadStream(file).pipe(res);
});
