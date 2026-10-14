import { config } from "../config.ts";

/** Click-to-chat link. `business` is E.164 digits without "+". */
export function whatsappLink(business: string, text: string): string {
  const digits = business.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function whatsappConfigured(): boolean {
  return Boolean(config.whatsapp.token && config.whatsapp.phoneId);
}

/**
 * Send a free-form text message through the Meta WhatsApp Cloud API.
 * Note: free-form messages only reach numbers that messaged the business within 24h, unless
 * the recipient is the business owner's own number set up as a test recipient / opted in.
 */
export async function sendWhatsappText(to: string, body: string): Promise<{ id: string }> {
  if (!whatsappConfigured()) throw new Error("WhatsApp Cloud API not configured");
  const res = await fetch(`https://graph.facebook.com/v20.0/${config.whatsapp.phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.whatsapp.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { preview_url: false, body },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `WhatsApp API responded ${res.status}`);
  return { id: json.messages?.[0]?.id ?? "" };
}
