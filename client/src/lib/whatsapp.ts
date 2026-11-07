// WhatsApp booking: every "Book on WhatsApp" button opens a chat with the business number
// (Admin → Settings → Business WhatsApp; 0625 102 051 by default) with the details already typed in.
import type { RentalType, Vehicle } from "@bluesparks/shared";
import { RENTAL_TYPE_LABEL } from "@bluesparks/shared";
import { waLink } from "./format";
import { fmtDate } from "./format";

export interface CarWhatsappDetails {
  vehicle?: Pick<Vehicle, "name" | "model" | "year"> | null;
  rentalType?: RentalType;
  from?: string;
  to?: string;
  pickupTime?: string;
  returnTime?: string;
  pickup?: string;
  priceText?: string;
}

export function carWhatsappText(d: CarWhatsappDetails): string {
  const lines = ["Habari Blue Spark! I would like to book a car."];
  if (d.vehicle) lines.push(`Car: ${d.vehicle.name}${d.vehicle.year ? ` (${d.vehicle.year})` : ""}`);
  if (d.rentalType) lines.push(`Option: ${RENTAL_TYPE_LABEL[d.rentalType]}`);
  if (d.from) lines.push(`Pick-up: ${fmtDate(d.from)}${d.pickupTime ? ` at ${d.pickupTime}` : ""}`);
  if (d.to) lines.push(`Return: ${fmtDate(d.to)}${d.returnTime ? ` at ${d.returnTime}` : ""}`);
  if (d.pickup) lines.push(`Pick-up point: ${d.pickup}`);
  if (d.priceText) lines.push(`Price shown: ${d.priceText}`);
  lines.push("Is it available?");
  return lines.join("\n");
}

export function carWhatsappLink(number: string, d: CarWhatsappDetails): string {
  return waLink(number, carWhatsappText(d));
}

/** "0625 102 051" style display for a 255… number. */
export function localPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  const local = d.startsWith("255") ? `0${d.slice(3)}` : d;
  return local.length === 10 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
}
