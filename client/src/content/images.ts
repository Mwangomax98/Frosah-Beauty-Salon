// One place to swap in the owner's own photography.
// Each key maps to a 1600w WebP; an "-800.webp" sibling is used for small screens via srcSet.
// Files live in client/public/images/placeholders/ — see CREDITS.md there.
const base = "/images/placeholders";

export const IMAGES = {
  heroDar: `${base}/hero-dar.webp`, // Dar es Salaam skyline / coast, background of the hero
  heroCar: `${base}/hero-car.webp`, // cut-out car (transparent background) layered over the headline
  heroStay: `${base}/hero-stay.webp`, // BnB balcony / interior, revealed on scroll
  airport: `${base}/airport.webp`,
  street: `${base}/street.webp`,
  about1: `${base}/about-1.webp`,
  about2: `${base}/about-2.webp`,
  cars: [1, 2, 3, 4, 5, 6].map((n) => `${base}/car-${n}.webp`),
  stays: [1, 2, 3, 4, 5].map((n) => `${base}/stay-${n}.webp`),
} as const;

export const FALLBACK_CAR = IMAGES.cars[0];
export const FALLBACK_STAY = IMAGES.stays[0];
