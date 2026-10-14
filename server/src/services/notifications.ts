import nodemailer, { type Transporter } from "nodemailer";
import type { Booking } from "@bluesparks/shared";
import { config } from "../config.ts";
import { execute } from "../db.ts";
import { contactEmail, customerBookingEmail, vendorBookingEmail, vendorWhatsappText } from "../lib/email-templates.ts";
import { sendWhatsappText, whatsappConfigured } from "../lib/whatsapp.ts";
import { getProperty, getSettings } from "./reference.ts";

let transporter: Transporter | null = null;

/** SMTP when configured; otherwise a JSON transport that just logs the message. Never throws at startup. */
export function mailer(): Transporter {
  if (transporter) return transporter;
  if (config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    if (!config.isTest) console.warn("[email] SMTP_HOST not set — emails will be logged to the console instead of sent");
  }
  return transporter;
}

export async function sendEmail(to: string, mail: { subject: string; html: string; text: string }): Promise<string> {
  const info = await mailer().sendMail({ from: config.smtp.from, to, subject: mail.subject, html: mail.html, text: mail.text });
  if (!config.smtp.host && !config.isTest) {
    console.log(`[email] (not sent, no SMTP) to=${to} subject="${mail.subject}"`);
  }
  return String(info.messageId ?? "");
}

type Channel = "email_vendor" | "email_customer" | "whatsapp";

async function log(bookingId: number, channel: Channel, status: "sent" | "failed" | "skipped", detail: string): Promise<void> {
  try {
    await execute("INSERT INTO notification_log (booking_id, channel, status, detail) VALUES (?,?,?,?)", [bookingId, channel, status, detail.slice(0, 2000)]);
  } catch (err) {
    console.error("[notify] could not write notification_log", err);
  }
}

async function attempt(bookingId: number, channel: Channel, fn: () => Promise<string>): Promise<void> {
  try {
    const detail = await fn();
    await log(bookingId, channel, "sent", detail);
  } catch (err) {
    await log(bookingId, channel, "failed", err instanceof Error ? err.message : String(err));
  }
}

/**
 * Vendor email + customer email + vendor WhatsApp. Fire-and-forget: callers do not await this.
 * Every outcome is written to notification_log.
 */
export async function notifyNewBooking(booking: Booking): Promise<void> {
  try {
    const settings = await getSettings();
    const property = booking.propertyId ? await getProperty(booking.propertyId) : null;

    await attempt(booking.id, "email_vendor", async () => {
      if (!settings.vendorEmail) throw new Error("settings.vendorEmail is empty");
      return `to ${settings.vendorEmail}: ${await sendEmail(settings.vendorEmail, vendorBookingEmail(booking, settings))}`;
    });
    await attempt(booking.id, "email_customer", async () => {
      return `to ${booking.customer.email}: ${await sendEmail(booking.customer.email, customerBookingEmail(booking, settings, property))}`;
    });

    if (!whatsappConfigured()) {
      await log(booking.id, "whatsapp", "skipped", "WHATSAPP_CLOUD_TOKEN / WHATSAPP_PHONE_ID not configured");
    } else {
      await attempt(booking.id, "whatsapp", async () => {
        const r = await sendWhatsappText(settings.businessWhatsapp, vendorWhatsappText(booking, settings));
        return `to ${settings.businessWhatsapp}: ${r.id}`;
      });
    }
  } catch (err) {
    console.error("[notify] unexpected failure", err);
  }
}

export function notifyNewBookingInBackground(booking: Booking): void {
  // setImmediate keeps the HTTP response path free; errors are swallowed inside notifyNewBooking.
  setImmediate(() => {
    void notifyNewBooking(booking);
  });
}

export async function sendContactMessage(input: { name: string; email: string; phone: string; message: string }): Promise<void> {
  const settings = await getSettings();
  const to = settings.vendorEmail || settings.businessEmail;
  if (!to) throw new Error("No vendor email configured");
  await mailer().sendMail({ from: config.smtp.from, to, replyTo: input.email, ...contactEmail(input, settings) });
  if (!config.smtp.host && !config.isTest) console.log(`[email] (not sent, no SMTP) contact form from ${input.email}`);
}
