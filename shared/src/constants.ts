import type { PickupLocationCode } from "./types";

export const COMPANY = {
  name: "Bluesparks Holdings",
  carsBrand: "Johnson Rentals",
  /** Placeholder until the real BnB brand name is supplied. Admin can override via settings.bnbBrandName. */
  staysBrand: "Bluesparks Stays",
  city: "Dar es Salaam",
} as const;

export const PICKUP_LOCATIONS: { code: PickupLocationCode; label: string; hint: string }[] = [
  { code: "jnia", label: "Julius Nyerere International Airport (JNIA)", hint: "We meet you at arrivals" },
  { code: "city_centre", label: "City Centre / Posta", hint: "Samora Avenue area" },
  { code: "masaki", label: "Masaki / Oyster Bay", hint: "Peninsula" },
  { code: "mikocheni", label: "Mikocheni / Mbezi Beach", hint: "North coast" },
  { code: "kariakoo", label: "Kariakoo", hint: "Market district" },
  { code: "kigamboni", label: "Kigamboni", hint: "Across the bridge" },
  { code: "custom", label: "Hotel, BnB or other address", hint: "Delivery fee by zone" },
];

export const STAY_AREAS = [
  "Masaki",
  "Oyster Bay",
  "Mikocheni",
  "Mbezi Beach",
  "City Centre",
  "Upanga",
  "Kigamboni",
] as const;

export const COUNTRIES = [
  "Tanzania", "Kenya", "Uganda", "Rwanda", "Burundi", "Zambia", "Mozambique", "Malawi", "South Africa",
  "United Kingdom", "United States", "Germany", "France", "Netherlands", "Italy", "Spain", "Sweden", "Norway",
  "Denmark", "Switzerland", "Belgium", "Canada", "Australia", "India", "China", "Japan", "United Arab Emirates",
  "Oman", "Turkey", "Nigeria", "Ghana", "Ethiopia", "Egypt", "Other",
] as const;

export const AMENITIES = [
  "wifi", "ac", "parking", "kitchen", "pool", "generator", "security", "tv", "washer", "balcony", "sea_view", "gym",
] as const;

export const AMENITY_LABELS: Record<string, string> = {
  wifi: "Wi-Fi",
  ac: "Air conditioning",
  parking: "Parking",
  kitchen: "Kitchen",
  pool: "Pool",
  generator: "Backup generator",
  security: "24h security",
  tv: "Smart TV",
  washer: "Washing machine",
  balcony: "Balcony",
  sea_view: "Sea view",
  gym: "Gym",
};

export const BOOKING_REF_PREFIX = { car: "JR", stay: "BS" } as const;

/** Max upload size for licence / ID documents (bytes). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
