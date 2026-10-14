import { Router } from "express";
import { z } from "zod";
import { badRequest } from "../../middleware/errors.ts";
import { DOCUMENT_KINDS, memoryUpload, saveDocument } from "../../services/uploads.ts";

export const uploadsRouter = Router();

/** Customer documents (licence / ID / passport). Returns an opaque token to attach to the booking. */
uploadsRouter.post("/uploads", memoryUpload.single("file"), async (req, res) => {
  const { kind } = z.object({ kind: z.enum(DOCUMENT_KINDS) }).parse(req.body ?? {});
  if (!req.file) throw badRequest("Please choose a file to upload", { file: "Required" });
  const saved = await saveDocument(req.file.buffer);
  res.status(201).json({ path: saved.path, originalName: req.file.originalname.slice(0, 255), kind });
});
