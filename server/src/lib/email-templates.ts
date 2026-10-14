import type { Booking, Property, Settings } from "@bluesparks/shared";
import { COMPANY, PICKUP_LOCATIONS, formatMoney } from "@bluesparks/shared";
import { config } from "../config.ts";

// Plain, readable HTML emails in Bluesparks colours. Written like a local owner would, not a marketing team.

const COLORS = { bg: "#FAF6EF", accent: "#F26B1D", text: "#1E1A16", muted: "#6B6259", line: "#E8DFD2" };

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nl2br = (s: string) => esc(s).replace(/\n/g, "<br>");

const tzs = (n: number) => formatMoney(n, "TZS", 1);

function brandFor(booking: Booking, settings: Settings): string {
  return booking.service === "car" ? COMPANY.carsBrand : settings.bnbBrandName || COMPANY.staysBrand;
}

function layout(title: string, bodyHtml: string, settings: Settings): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.bg};color:${COLORS.text};font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${COLORS.line};border-radius:8px;">
<tr><td style="padding:20px 28px;border-bottom:4px solid ${COLORS.accent};">
  <div style="font-size:20px;font-weight:bold;letter-spacing:0.5px;">${esc(COMPANY.name)}</div>
  <div style="font-size:13px;color:${COLORS.muted};font-family:Arial,Helvetica,sans-serif;">${esc(COMPANY.carsBrand)} · ${esc(settings.bnbBrandName || COMPANY.staysBrand)} · ${esc(COMPANY.city)}</div>
</td></tr>
<tr><td style="padding:24px 28px;font-size:16px;line-height:1.55;">${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid ${COLORS.line};font-size:13px;color:${COLORS.muted};font-family:Arial,Helvetica,sans-serif;">
  ${esc(settings.businessAddress)}<br>
  ${esc(settings.businessPhone)} · ${esc(settings.businessEmail)}<br>
  WhatsApp: +${esc(settings.businessWhatsapp)}
</td></tr>
</table></td></tr></table></body></html>`;
}

function h2(text: string) {
  return `<h2 style="font-size:17px;margin:24px 0 8px;color:${COLORS.accent};font-family:Arial,Helvetica,sans-serif;">${esc(text)}</h2>`;
}

function kv(rows: [string, string | number | null | undefined][]): string {
  const cells = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:${COLORS.muted};font-family:Arial,Helvetica,sans-serif;font-size:14px;width:42%;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-size:15px;">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${cells}</table>`;
}

function quoteTable(booking: Booking): string {
  const q = booking.quote;
  const lines = q.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid ${COLORS.line};font-size:15px;">${esc(i.label)}</td><td align="right" style="padding:6px 0;border-bottom:1px solid ${COLORS.line};font-size:15px;white-space:nowrap;">${esc(tzs(i.totalTzs))}</td></tr>`,
    )
    .join("");
  const discount =
    q.discountTzs > 0
      ? `<tr><td style="padding:6px 0;font-size:15px;">Discount</td><td align="right" style="padding:6px 0;font-size:15px;">− ${esc(tzs(q.discountTzs))}</td></tr>`
      : "";
  const usd = booking.currency === "USD" ? "" : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
${lines}${discount}
<tr><td style="padding:10px 0 0;font-size:17px;font-weight:bold;">Total</td><td align="right" style="padding:10px 0 0;font-size:17px;font-weight:bold;white-space:nowrap;">${esc(tzs(q.totalTzs))}${usd}</td></tr>
</table>${q.notes.length ? `<p style="font-size:13px;color:${COLORS.muted};margin:8px 0 0;">${q.notes.map(esc).join(" · ")}</p>` : ""}`;
}

const locationLabel = (code: unknown): string => PICKUP_LOCATIONS.find((l) => l.code === code)?.label ?? String(code ?? "");

function bookingSummaryRows(booking: Booking): [string, string | number | null | undefined][] {
  const d = booking.details as Record<string, string | number | undefined>;
  if (booking.service === "car") {
    return [
      ["Vehicle", booking.itemName],
      ["Pick-up", `${booking.startDate} at ${booking.startTime ?? ""} — ${locationLabel(d.pickupLocation)}${d.pickupAddress ? ` (${d.pickupAddress})` : ""}`],
      ["Return", `${booking.endDate} at ${booking.endTime ?? ""} — ${locationLabel(d.dropoffLocation)}${d.dropoffAddress ? ` (${d.dropoffAddress})` : ""}`],
      ["Rental type", d.rentalType === "with_driver" ? `With driver (${d.driverScope === "upcountry" ? "upcountry" : "within Dar"})` : "Self-drive"],
      ["Passengers", d.passengers],
      ["Flight", d.flightNumber],
    ];
  }
  return [
    ["Apartment", booking.itemName],
    ["Check-in", `${booking.startDate}${d.arrivalTime ? ` (arriving around ${d.arrivalTime})` : ""}`],
    ["Check-out", booking.endDate],
    ["Nights", booking.quote.nights],
    ["Guests", d.guests],
  ];
}

function paymentLine(booking: Booking): string {
  switch (booking.paymentStatus) {
    case "paid":
      return "Paid in full online.";
    case "deposit_paid":
      return `Deposit of ${tzs(booking.quote.depositTzs)} paid online. Balance of ${tzs(booking.totalTzs - booking.quote.depositTzs)} is due on arrival.`;
    case "pay_on_arrival":
      return `Pay on arrival: ${tzs(booking.totalTzs)} in cash, M-Pesa, Tigo Pesa or card when we meet.`;
    default:
      return booking.paymentMethod === "online"
        ? "Online payment not completed yet. The booking is held as pending until payment is confirmed."
        : "Payment pending.";
  }
}

export function vendorBookingEmail(booking: Booking, settings: Settings): { subject: string; html: string; text: string } {
  const brand = brandFor(booking, settings);
  const adminLink = `${config.publicUrl}/admin/bookings/${booking.id}`;
  const docs = booking.documents.length
    ? `<ul style="margin:8px 0;padding-left:20px;">${booking.documents
        .map((doc) => `<li>${esc(doc.kind)} — <a href="${config.apiPublicUrl}/api/admin/documents/${esc(doc.path)}" style="color:${COLORS.accent};">${esc(doc.originalName)}</a></li>`)
        .join("")}</ul>`
    : `<p style="margin:8px 0;color:${COLORS.muted};">No documents uploaded.</p>`;
  const body = `
<p style="margin:0 0 12px;">New ${booking.service === "car" ? "car hire" : "stay"} booking <strong>${esc(booking.reference)}</strong> (${esc(brand)}).</p>
${h2("Customer")}
${kv([
  ["Name", booking.customer.fullName],
  ["Email", booking.customer.email],
  ["Phone", booking.customer.phone],
  ["Country", booking.customer.country],
  ["Special requests", booking.customer.specialRequests],
])}
${h2("Booking")}
${kv([...bookingSummaryRows(booking), ["Status", booking.status], ["Payment", paymentLine(booking)], ["Bundle", booking.bundleWithBookingId ? `Linked to booking #${booking.bundleWithBookingId}` : undefined], ["Promo code", booking.promoCode]])}
${h2("Price")}
${quoteTable(booking)}
${h2("Documents")}
${docs}
<p style="margin:24px 0 0;"><a href="${adminLink}" style="display:inline-block;background:${COLORS.accent};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;">Open in admin</a></p>`;
  const text = [
    `New booking ${booking.reference} (${brand})`,
    `${booking.customer.fullName} · ${booking.customer.phone} · ${booking.customer.email}`,
    ...bookingSummaryRows(booking)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`),
    `Total: ${tzs(booking.totalTzs)} — ${paymentLine(booking)}`,
    adminLink,
  ].join("\n");
  return { subject: `New booking ${booking.reference} — ${booking.customer.fullName} — ${booking.itemName}`, html: layout(`New booking ${booking.reference}`, body, settings), text };
}

export function customerBookingEmail(booking: Booking, settings: Settings, property?: Property | null): { subject: string; html: string; text: string } {
  const brand = brandFor(booking, settings);
  const firstName = booking.customer.fullName.split(" ")[0] || booking.customer.fullName;
  const link = `${config.publicUrl}/booking/${booking.reference}?email=${encodeURIComponent(booking.customer.email)}`;
  const d = booking.details as Record<string, unknown>;
  let extra = "";
  if (booking.service === "stay" && property) {
    extra += h2("Getting in");
    extra += `<p style="margin:0 0 8px;">${nl2br(property.checkinInstructions || "We will send check-in details before you arrive.")}</p>`;
    extra += `<p style="margin:0;color:${COLORS.muted};font-size:14px;">${esc(property.address)}</p>`;
    if (property.houseRules) extra += `${h2("House rules")}<p style="margin:0;">${nl2br(property.houseRules)}</p>`;
  }
  if (booking.service === "car") {
    extra += h2("Before pick-up");
    extra += `<p style="margin:0;">${
      d.rentalType === "self_drive"
        ? "Please carry your original driving licence and the ID or passport you uploaded. We will go through the car together and note the fuel level and any marks before you drive off."
        : "Your driver will be in touch on WhatsApp the day before to confirm the meeting point. Fuel is included in the daily rate for trips within Dar; upcountry fuel is paid by the guest."
    }</p>`;
  }
  const body = `
<p style="margin:0 0 12px;">Karibu, ${esc(firstName)}.</p>
<p style="margin:0 0 12px;">Asante for booking with ${esc(brand)}. Your reference is <strong style="color:${COLORS.accent};font-size:18px;">${esc(booking.reference)}</strong>. Keep it handy — it is all we need to find your booking.</p>
${h2("Your booking")}
${kv(bookingSummaryRows(booking))}
${h2("Price")}
${quoteTable(booking)}
<p style="margin:12px 0 0;">${esc(paymentLine(booking))}</p>
${extra}
<p style="margin:24px 0 0;"><a href="${link}" style="display:inline-block;background:${COLORS.accent};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;">View your booking</a></p>
<p style="margin:16px 0 0;">Questions? Reply to this email or message us on WhatsApp at +${esc(settings.businessWhatsapp)}. Tutaonana Dar.</p>`;
  const text = [
    `Karibu ${firstName}, asante for booking with ${brand}.`,
    `Reference: ${booking.reference}`,
    ...bookingSummaryRows(booking)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`),
    `Total: ${tzs(booking.totalTzs)}`,
    paymentLine(booking),
    link,
  ].join("\n");
  return { subject: `${brand} booking ${booking.reference} — ${booking.itemName}`, html: layout(`Booking ${booking.reference}`, body, settings), text };
}

export function contactEmail(input: { name: string; email: string; phone: string; message: string }, settings: Settings): { subject: string; html: string; text: string } {
  const body = `
<p style="margin:0 0 12px;">New message from the website contact form.</p>
${kv([
  ["Name", input.name],
  ["Email", input.email],
  ["Phone", input.phone],
])}
${h2("Message")}
<p style="margin:0;">${nl2br(input.message)}</p>`;
  return {
    subject: `Website enquiry from ${input.name}`,
    html: layout("Website enquiry", body, settings),
    text: `From: ${input.name} <${input.email}> ${input.phone}\n\n${input.message}`,
  };
}

/** Short WhatsApp text for the vendor. */
export function vendorWhatsappText(booking: Booking, settings: Settings): string {
  const rows = bookingSummaryRows(booking)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  return [
    `New booking ${booking.reference} (${brandFor(booking, settings)})`,
    `${booking.customer.fullName} · ${booking.customer.phone}`,
    ...rows,
    `Total ${tzs(booking.totalTzs)} · ${paymentLine(booking)}`,
  ].join("\n");
}

/** Text pre-filled in the customer's click-to-chat link. */
export function customerWhatsappText(booking: Booking, settings: Settings): string {
  return `Habari ${brandFor(booking, settings)}, this is ${booking.customer.fullName}. I just booked ${booking.itemName} (${booking.startDate} to ${booking.endDate}), reference ${booking.reference}.`;
}
