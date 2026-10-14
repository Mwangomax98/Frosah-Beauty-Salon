import { todayIso, addDays } from "@bluesparks/shared";

export const today = () => todayIso();
export const tomorrow = () => addDays(todayIso(), 1);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-03-04" → "Wed 4 Mar 2026" */
export function fmtDate(iso: string | null | undefined, opts: { weekday?: boolean; year?: boolean } = { weekday: true, year: true }): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const parts = [`${d} ${MONTHS[m - 1]}`];
  if (opts.year !== false) parts.push(String(y));
  const s = parts.join(" ");
  return opts.weekday ? `${DAYS[dt.getUTCDay()]} ${s}` : s;
}

export function fmtDateTime(iso: string | null | undefined, time?: string | null): string {
  const d = fmtDate(iso);
  return time ? `${d}, ${time}` : d;
}

export function fmtTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function clampDate(v: string, min: string): string {
  return v && v >= min ? v : min;
}

/** First image or a known placeholder. Image URLs from the API may be absolute paths under /uploads or /images. */
export function imgSrc(images: string[] | undefined, fallback: string): string {
  const first = images?.[0];
  return first && first.length > 0 ? first : fallback;
}

/** If an image is one of our placeholder files, derive the 800w variant; else reuse the original. */
export function img800(src: string): string {
  if (src.startsWith("/images/placeholders/") && src.endsWith(".webp") && !src.endsWith("-800.webp")) {
    return src.replace(/\.webp$/, "-800.webp");
  }
  return src;
}

export function srcSet(src: string): string | undefined {
  const small = img800(src);
  return small !== src ? `${small} 800w, ${src} 1600w` : undefined;
}

export function waLink(number: string, text?: string): string {
  const n = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
