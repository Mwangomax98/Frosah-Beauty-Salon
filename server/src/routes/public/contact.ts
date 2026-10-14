import { Router } from "express";
import { z } from "zod";
import { parseBody } from "../../middleware/validate.ts";
import { sendContactMessage } from "../../services/notifications.ts";

export const contactRouter = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(40).default(""),
  message: z.string().trim().min(5, "Please write a short message").max(4000),
  // Honeypot: real users never fill this in.
  website: z.string().max(0).optional(),
});

contactRouter.post("/contact", async (req, res) => {
  const input = parseBody(contactSchema, req);
  await sendContactMessage(input);
  res.json({ ok: true });
});
