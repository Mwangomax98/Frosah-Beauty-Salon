// Builds client/public/images/placeholders/*.webp (1600w + 800w).
// 1. Tries to download each free Unsplash photo listed below (verifies HTTP 200 + image/* content-type).
// 2. If the download fails (offline, proxy, rate limit) it renders a clean duotone SVG placeholder
//    in the brand palette so no <img> ever 404s. CREDITS.md records what was used for each file.
//
// Run: npm run images -w client
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/images/placeholders");
await mkdir(OUT, { recursive: true });

// PLACEHOLDER brand colours — keep in sync with src/index.css @theme.
const BRAND = "#0B2545";
const BRAND_DEEP = "#071A31";
const ORANGE = "#F26B1D";
const PAPER = "#FAF6EF";
const CREAM = "#F1EADD";

/** @type {{file:string, w:number, h:number, kind:'skyline'|'car'|'stay'|'airport'|'street'|'about', label:string, url:string, credit:string}[]} */
const IMAGES = [
  { file: "hero-dar", w: 1600, h: 1000, kind: "skyline", label: "Dar es Salaam harbour", url: "https://images.unsplash.com/photo-1589553416260-f586c8f1514f?w=1600&q=80", credit: "Dar es Salaam skyline — Unsplash (free licence)" },
  { file: "hero-car", w: 1600, h: 700, kind: "car", label: "Land Cruiser Prado", url: "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=1600&q=80", credit: "White SUV side profile — Unsplash" },
  { file: "hero-stay", w: 1600, h: 1000, kind: "stay", label: "Balcony over the Indian Ocean", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80", credit: "Apartment balcony — Unsplash" },
  { file: "car-1", w: 1600, h: 1067, kind: "car", label: "Toyota Land Cruiser Prado", url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1600&q=80", credit: "Toyota Land Cruiser Prado — Unsplash" },
  { file: "car-2", w: 1600, h: 1067, kind: "car", label: "Toyota RAV4", url: "https://images.unsplash.com/photo-1568844293986-8c2c2d8a1a37?w=1600&q=80", credit: "Toyota RAV4 — Unsplash" },
  { file: "car-3", w: 1600, h: 1067, kind: "car", label: "Toyota Noah", url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=1600&q=80", credit: "Toyota van — Unsplash" },
  { file: "car-4", w: 1600, h: 1067, kind: "car", label: "Toyota Vitz", url: "https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=1600&q=80", credit: "Small hatchback — Unsplash" },
  { file: "car-5", w: 1600, h: 1067, kind: "car", label: "Toyota Hilux", url: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=1600&q=80", credit: "Toyota Hilux pickup — Unsplash" },
  { file: "car-6", w: 1600, h: 1067, kind: "car", label: "Toyota Harrier", url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1600&q=80", credit: "Toyota Harrier — Unsplash" },
  { file: "stay-1", w: 1600, h: 1067, kind: "stay", label: "Masaki sea-view apartment", url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&q=80", credit: "Apartment living room — Unsplash" },
  { file: "stay-2", w: 1600, h: 1067, kind: "stay", label: "Oyster Bay balcony", url: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1600&q=80", credit: "Bright bedroom — Unsplash" },
  { file: "stay-3", w: 1600, h: 1067, kind: "stay", label: "Mikocheni family house", url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1600&q=80", credit: "Kitchen & dining — Unsplash" },
  { file: "stay-4", w: 1600, h: 1067, kind: "stay", label: "Kigamboni beach house", url: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1600&q=80", credit: "Beach house interior — Unsplash" },
  { file: "stay-5", w: 1600, h: 1067, kind: "stay", label: "City Centre studio", url: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1600&q=80", credit: "City studio — Unsplash" },
  { file: "airport", w: 1600, h: 1000, kind: "airport", label: "JNIA arrivals", url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80", credit: "Airport arrivals — Unsplash" },
  { file: "street", w: 1600, h: 1000, kind: "street", label: "Kariakoo market", url: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1600&q=80", credit: "African market street — Unsplash" },
  { file: "about-1", w: 1600, h: 1000, kind: "about", label: "Handing over the keys", url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=80", credit: "Car keys handover — Unsplash" },
  { file: "about-2", w: 1600, h: 1000, kind: "about", label: "Coco Beach at dusk", url: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1600&q=80", credit: "Coastline at dusk — Unsplash" },
];

async function tryDownload(url) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20000);
    const res = await fetch(url, { signal: ctl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10_000) return null;
    return buf;
  } catch {
    return null;
  }
}

// ---------- SVG placeholder art (duotone, brand palette, no gradients) ----------
function skylineSvg(w, h) {
  const buildings = [];
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 40 + ((i * 37) % 90);
    const bh = 120 + ((i * 53) % 260);
    buildings.push(`<rect x="${x}" y="${h * 0.62 - bh}" width="${bw}" height="${bh}" fill="${BRAND}"/>`);
    for (let r = 0; r < Math.floor(bh / 40); r++) {
      for (let c = 0; c < Math.floor(bw / 22); c++) {
        if ((r + c + i) % 3 === 0) buildings.push(`<rect x="${x + 6 + c * 22}" y="${h * 0.62 - bh + 10 + r * 40}" width="8" height="14" fill="${CREAM}" opacity="0.7"/>`);
      }
    }
    x += bw + 8;
    i++;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${CREAM}"/>
  <circle cx="${w * 0.78}" cy="${h * 0.3}" r="${h * 0.14}" fill="${ORANGE}"/>
  ${buildings.join("")}
  <rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${BRAND_DEEP}"/>
  ${Array.from({ length: 14 }, (_, k) => `<rect x="${(k * w) / 14 + 10}" y="${h * 0.66 + (k % 3) * 18}" width="${w / 28}" height="3" fill="${CREAM}" opacity="0.35"/>`).join("")}
</svg>`;
}

function carSvg(w, h, label, transparent = false) {
  const cx = w / 2;
  const cy = h * 0.6;
  const s = w / 1600;
  // Hero car is a cut-out (alpha background) so it can sit in front of the headline.
  if (transparent) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <g transform="translate(${cx - 520 * s}, ${cy - 230 * s}) scale(${s})">
    <ellipse cx="540" cy="345" rx="520" ry="40" fill="${BRAND_DEEP}" opacity="0.25"/>
    <path d="M60 300 L140 300 L200 150 Q230 90 330 90 L680 90 Q760 90 820 170 L900 260 L1000 280 L1010 330 L60 330 Z" fill="${BRAND}"/>
    <path d="M230 160 Q250 120 330 120 L480 120 L480 260 L185 260 Z" fill="${CREAM}"/>
    <path d="M520 120 L680 120 Q740 120 790 180 L840 260 L520 260 Z" fill="${CREAM}"/>
    <circle cx="260" cy="330" r="78" fill="${BRAND_DEEP}"/><circle cx="260" cy="330" r="36" fill="${CREAM}"/>
    <circle cx="820" cy="330" r="78" fill="${BRAND_DEEP}"/><circle cx="820" cy="330" r="36" fill="${CREAM}"/>
    <rect x="930" y="280" width="60" height="26" fill="${ORANGE}"/>
  </g>
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${PAPER}"/>
  <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="${BRAND_DEEP}"/>
  <rect x="0" y="${h * 0.84}" width="${w}" height="${6 * s}" fill="${ORANGE}" stroke-dasharray="80 50"/>
  <g transform="translate(${cx - 520 * s}, ${cy - 230 * s}) scale(${s})">
    <path d="M60 300 L140 300 L200 150 Q230 90 330 90 L680 90 Q760 90 820 170 L900 260 L1000 280 L1010 330 L60 330 Z" fill="${BRAND}"/>
    <path d="M230 160 Q250 120 330 120 L480 120 L480 260 L185 260 Z" fill="${CREAM}"/>
    <path d="M520 120 L680 120 Q740 120 790 180 L840 260 L520 260 Z" fill="${CREAM}"/>
    <circle cx="260" cy="330" r="78" fill="${BRAND_DEEP}"/><circle cx="260" cy="330" r="36" fill="${CREAM}"/>
    <circle cx="820" cy="330" r="78" fill="${BRAND_DEEP}"/><circle cx="820" cy="330" r="36" fill="${CREAM}"/>
    <rect x="930" y="280" width="60" height="26" fill="${ORANGE}"/>
  </g>
  <text x="${w * 0.04}" y="${h * 0.95}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${34 * s}" fill="${CREAM}" letter-spacing="2">${label.toUpperCase()} · PLACEHOLDER PHOTO</text>
</svg>`;
}

function staySvg(w, h, label) {
  const s = w / 1600;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${CREAM}"/>
  <rect x="${w * 0.12}" y="${h * 0.12}" width="${w * 0.76}" height="${h * 0.62}" fill="${PAPER}" stroke="${BRAND}" stroke-width="${10 * s}"/>
  <rect x="${w * 0.12}" y="${h * 0.12}" width="${w * 0.76}" height="${h * 0.3}" fill="${BRAND}"/>
  <circle cx="${w * 0.7}" cy="${h * 0.27}" r="${h * 0.07}" fill="${ORANGE}"/>
  <rect x="${w * 0.12}" y="${h * 0.42}" width="${w * 0.76}" height="${h * 0.32}" fill="${BRAND_DEEP}"/>
  ${Array.from({ length: 9 }, (_, k) => `<rect x="${w * 0.12}" y="${h * (0.45 + k * 0.034)}" width="${w * 0.76}" height="${2 * s}" fill="${CREAM}" opacity="0.25"/>`).join("")}
  <rect x="${w * 0.497}" y="${h * 0.12}" width="${8 * s}" height="${h * 0.62}" fill="${BRAND}"/>
  <rect x="${w * 0.08}" y="${h * 0.74}" width="${w * 0.84}" height="${h * 0.04}" fill="${BRAND}"/>
  ${Array.from({ length: 12 }, (_, k) => `<rect x="${w * (0.1 + k * 0.07)}" y="${h * 0.78}" width="${8 * s}" height="${h * 0.12}" fill="${BRAND}"/>`).join("")}
  <text x="${w * 0.04}" y="${h * 0.96}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${34 * s}" fill="${BRAND}" letter-spacing="2">${label.toUpperCase()} · PLACEHOLDER PHOTO</text>
</svg>`;
}

function genericSvg(w, h, label, kind) {
  const s = w / 1600;
  const motif =
    kind === "airport"
      ? `<path d="M${w * 0.5} ${h * 0.2} l${60 * s} ${220 * s} l${300 * s} ${120 * s} v${50 * s} l${-300 * s} ${-60 * s} l${-20 * s} ${160 * s} l${90 * s} ${70 * s} v${40 * s} l${-130 * s} ${-40 * s} l${-130 * s} ${40 * s} v${-40 * s} l${90 * s} ${-70 * s} l${-20 * s} ${-160 * s} l${-300 * s} ${60 * s} v${-50 * s} l${300 * s} ${-120 * s} z" fill="${BRAND}"/>`
      : kind === "street"
        ? Array.from({ length: 8 }, (_, k) => `<polygon points="${w * (0.1 + k * 0.11)},${h * 0.7} ${w * (0.16 + k * 0.11)},${h * 0.45} ${w * (0.22 + k * 0.11)},${h * 0.7}" fill="${k % 2 ? ORANGE : BRAND}"/>`).join("")
        : `<circle cx="${w * 0.5}" cy="${h * 0.45}" r="${h * 0.22}" fill="${ORANGE}"/><rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="${BRAND}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${PAPER}"/>${motif}
  <text x="${w * 0.04}" y="${h * 0.95}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${34 * s}" fill="${kind === "about" ? CREAM : BRAND}" letter-spacing="2">${label.toUpperCase()} · PLACEHOLDER PHOTO</text>
</svg>`;
}

function placeholderSvg(img) {
  const { w, h, kind, label } = img;
  if (kind === "skyline") return skylineSvg(w, h);
  if (kind === "car") return carSvg(w, h, label, img.file === "hero-car");
  if (kind === "stay") return staySvg(w, h, label);
  return genericSvg(w, h, label, kind);
}

const credits = ["# Image credits", "", "Generated by `client/scripts/images.mjs`. Replace any file here with the owner's own photo (same filename) and re-run the script, or just drop in WebP files with the same names.", ""];
for (const img of IMAGES) {
  let src = await tryDownload(img.url);
  let source;
  if (src) {
    source = `downloaded — ${img.credit} — ${img.url}`;
  } else {
    src = Buffer.from(placeholderSvg(img));
    source = `**PLACEHOLDER ART** (download of ${img.url} failed in this environment; ${img.credit}). Replace with a real photo.`;
  }
  const base = sharp(src).resize({ width: img.w, height: img.h, fit: "cover", position: "attention" });
  await base.clone().webp({ quality: 80 }).toFile(path.join(OUT, `${img.file}.webp`));
  await sharp(src).resize({ width: 800, height: Math.round((img.h / img.w) * 800), fit: "cover", position: "attention" }).webp({ quality: 78 }).toFile(path.join(OUT, `${img.file}-800.webp`));
  credits.push(`- \`${img.file}.webp\` / \`${img.file}-800.webp\` — ${img.label} — ${source}`);
  console.log(`${img.file}.webp  ${src.length > 20000 ? "photo" : "placeholder"}`);
}
await writeFile(path.join(OUT, "CREDITS.md"), credits.join("\n") + "\n");
console.log("done →", OUT);
