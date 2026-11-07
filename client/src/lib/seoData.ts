// schema.org structured data so Google can show Blue Spark's cars, prices and ratings in search results.
import type { ReviewSummary, Vehicle } from "@bluesparks/shared";
import { COMPANY } from "@bluesparks/shared";

const origin = () => (typeof window === "undefined" ? "https://bluesparks.co.tz" : window.location.origin);
const abs = (src: string) => (src.startsWith("http") ? src : `${origin()}${src}`);

/** A car offered two ways (self drive / with driver), each as its own Offer with a daily price in TZS. */
export function carJsonLd(v: Vehicle, withDriverDay?: number) {
  const offers = [
    { "@type": "Offer", name: "Self drive", price: v.pricePerDayTzs, priceCurrency: "TZS", unitText: "DAY", availability: "https://schema.org/InStock" },
  ];
  const driver = withDriverDay ?? v.priceWithDriverPerDayTzs;
  if (driver) offers.push({ "@type": "Offer", name: "With driver", price: driver, priceCurrency: "TZS", unitText: "DAY", availability: "https://schema.org/InStock" });
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: v.name,
    model: v.model || undefined,
    vehicleModelDate: v.year ? String(v.year) : undefined,
    bodyType: v.category,
    seatingCapacity: v.seats,
    fuelType: v.fuel,
    vehicleTransmission: v.transmission === "automatic" ? "Automatic" : "Manual",
    driveWheelConfiguration: v.drive === "4WD" ? "https://schema.org/FourWheelDriveConfiguration" : undefined,
    description: v.description,
    image: v.images.map(abs),
    url: `${origin()}/cars/${v.slug}`,
    brand: { "@type": "Brand", name: v.name.split(" ")[0] },
    offers,
  };
}

export function businessJsonLd(opts: { phone: string; whatsapp: string; address: string; instagram?: string; rating?: ReviewSummary }) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: `${COMPANY.name} — ${COMPANY.carsBrand}`,
    url: origin(),
    logo: `${origin()}/brand/logo-full.webp`,
    image: `${origin()}/images/placeholders/hero-car.webp`,
    telephone: opts.phone,
    address: { "@type": "PostalAddress", streetAddress: opts.address, addressLocality: COMPANY.city, addressCountry: "TZ" },
    areaServed: ["Dar es Salaam", "Tanzania"],
    priceRange: "TZS",
    sameAs: [opts.instagram, `https://wa.me/${opts.whatsapp}`].filter(Boolean),
    aggregateRating: opts.rating && opts.rating.count > 0 ? { "@type": "AggregateRating", ratingValue: opts.rating.average, reviewCount: opts.rating.count, bestRating: 5 } : undefined,
  };
}

export function faqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}
