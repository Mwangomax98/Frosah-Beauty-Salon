// Domain types shared by the API server and the React client.
// The server is the source of truth; the client uses these for typing and price previews.

export type Service = "car" | "stay";
export type Currency = "TZS" | "USD";

export type RentalType = "self_drive" | "with_driver";
export type DriverScope = "dar" | "upcountry";
export type Transmission = "manual" | "automatic";
export type DriveType = "2WD" | "4WD";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "unpaid" | "paid" | "deposit_paid" | "pay_on_arrival";
export type PaymentMethod = "online" | "on_arrival";
export type PropertyPaymentMode = "full_online" | "deposit" | "on_arrival";

export type ExtraPricing = "per_day" | "per_booking";
export type ExtraService = Service | "both";

/** Pickup / drop-off locations for Johnson Rentals. `custom` = hotel/BnB/address with a zone fee. */
export type PickupLocationCode =
  | "jnia"
  | "city_centre"
  | "masaki"
  | "mikocheni"
  | "kariakoo"
  | "kigamboni"
  | "custom";

export interface Vehicle {
  id: number;
  slug: string;
  name: string;
  category: string;
  seats: number;
  bags: number;
  transmission: Transmission;
  drive: DriveType;
  fuel: string;
  features: string[];
  images: string[];
  pricePerDayTzs: number;
  pricePerWeekTzs: number | null;
  pricePerMonthTzs: number | null;
  mileagePolicy: string;
  depositTzs: number;
  description: string;
  active: boolean;
}

export interface Property {
  id: number;
  slug: string;
  name: string;
  area: string;
  address: string;
  lat: number | null;
  lng: number | null;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  houseRules: string;
  description: string;
  images: string[];
  pricePerNightTzs: number;
  pricePerWeekTzs: number | null;
  pricePerMonthTzs: number | null;
  cleaningFeeTzs: number;
  minNights: number;
  paymentMode: PropertyPaymentMode;
  depositPercent: number;
  checkinInstructions: string;
  icalImportUrls: string[];
  active: boolean;
}

export interface SeasonalRate {
  id: number;
  targetType: Service; // car => vehicle, stay => property
  targetId: number;
  name: string;
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
  priceTzs: number; // per day / per night during the season
}

export interface Extra {
  id: number;
  service: ExtraService;
  code: string;
  name: string;
  description: string;
  priceTzs: number;
  pricing: ExtraPricing;
  active: boolean;
}

export interface DeliveryZone {
  id: number;
  name: string;
  feeTzs: number;
  active: boolean;
}

export interface PromoCode {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  service: ExtraService;
  validFrom: string | null;
  validTo: string | null;
  maxUses: number | null;
  uses: number;
  active: boolean;
}

export interface BlockedDate {
  id: number;
  targetType: Service;
  targetId: number;
  startDate: string;
  endDate: string; // inclusive
  reason: string;
  source: "manual" | "ical";
}

/** Site-wide settings editable from the admin dashboard. */
export interface Settings {
  usdRate: number; // TZS per 1 USD
  driverFeeDarTzs: number; // per day
  driverFeeUpcountryTzs: number; // per day
  bundleDiscountPercent: number;
  businessWhatsapp: string; // E.164 without "+", e.g. 2557XXXXXXXX
  vendorEmail: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  bnbBrandName: string;
}

export interface LineItem {
  code: string;
  label: string;
  qty: number;
  unitTzs: number;
  totalTzs: number;
}

export interface Quote {
  items: LineItem[];
  subtotalTzs: number;
  discountTzs: number;
  totalTzs: number;
  depositTzs: number; // amount payable now when deposit mode applies; else = totalTzs or 0
  nights?: number;
  days?: number;
  notes: string[];
}

export interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  specialRequests?: string;
}

export interface CarBookingInput {
  vehicleId: number;
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string; // HH:mm
  returnDate: string;
  returnTime: string;
  pickupLocation: PickupLocationCode;
  dropoffLocation: PickupLocationCode;
  pickupAddress?: string;
  dropoffAddress?: string;
  deliveryZoneId?: number | null;
  rentalType: RentalType;
  driverScope?: DriverScope;
  extras: { extraId: number; qty: number }[];
  passengers: number;
  flightNumber?: string;
  promoCode?: string;
  bundleWithBookingRef?: string;
  customer: CustomerDetails;
  paymentMethod: PaymentMethod;
  currency: Currency;
  acceptedTerms: boolean;
}

export interface StayBookingInput {
  propertyId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  arrivalTime?: string;
  extras: { extraId: number; qty: number }[];
  promoCode?: string;
  bundleWithBookingRef?: string;
  customer: CustomerDetails;
  paymentMethod: PaymentMethod;
  currency: Currency;
  acceptedTerms: boolean;
  acceptedHouseRules: boolean;
}

export interface Booking {
  id: number;
  reference: string;
  service: Service;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  currency: Currency;
  customer: CustomerDetails;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  vehicleId: number | null;
  propertyId: number | null;
  itemName: string;
  details: Record<string, unknown>;
  extras: { extraId: number; code: string; name: string; qty: number; totalTzs: number }[];
  quote: Quote;
  totalTzs: number;
  promoCode: string | null;
  bundleWithBookingId: number | null;
  documents: { kind: string; path: string; originalName: string }[];
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: number;
  bookingId: number;
  gateway: string;
  gatewayRef: string | null;
  amountTzs: number;
  status: "initiated" | "successful" | "failed" | "cancelled";
  createdAt: string;
}
