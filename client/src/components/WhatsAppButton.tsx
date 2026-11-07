import { useLocation } from "react-router";
import { useSettings, FALLBACK_SETTINGS } from "@/lib/queries";
import { waLink } from "@/lib/format";
import { localPhone } from "@/lib/whatsapp";

/** Floating "Book on WhatsApp" button on every public page (hidden inside the booking form, which has its own). */
export function WhatsAppButton() {
  const { data } = useSettings();
  const s = data ?? FALLBACK_SETTINGS;
  const { pathname } = useLocation();
  if (pathname.startsWith("/book/")) return null;
  return (
    <a
      href={waLink(s.businessWhatsapp, "Habari Blue Spark! I would like to make a booking.")}
      target="_blank"
      rel="noopener"
      aria-label={`Book on WhatsApp, ${localPhone(s.businessWhatsapp)}`}
      className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#1f7a4d] px-4 py-3 font-bold text-white shadow-hard transition-transform hover:scale-105 motion-reduce:transition-none sm:right-6 sm:bottom-6"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
      </svg>
      <span className="hidden sm:inline">Book on WhatsApp</span>
    </a>
  );
}
