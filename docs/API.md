# Bluesparks API contract

Base URL: `/api`. JSON in/out. Money is always integer **TZS** in the API; the client converts to USD for display using `settings.usdRate`. Dates are `YYYY-MM-DD`, times `HH:mm`.

Errors: `{ "error": { "code": string, "message": string, "fields"?: Record<string,string> } }` with 4xx/5xx.

Types live in `shared/src/types.ts`; pricing in `shared/src/pricing.ts` (server recomputes every quote — client values are never trusted).

## Public

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/settings` | | `PublicSettings` = `Settings` minus `vendorEmail` |
| GET | `/vehicles` | `?from&to&pickupTime&returnTime` (optional) | `Vehicle[]` — when dates given, only available vehicles |
| GET | `/vehicles/:slug` | | `Vehicle & { blocked: {start,end}[] }` (next 180 days of unavailable ranges) |
| GET | `/properties` | `?checkIn&checkOut&guests&area` (optional) | `Property[]` (never includes `icalImportUrls`) — only available when dates given |
| GET | `/properties/:slug` | | `Property & { blocked: {start,end}[] }` |
| GET | `/extras` | `?service=car\|stay` | `Extra[]` (active) |
| GET | `/delivery-zones` | | `DeliveryZone[]` (active) |
| POST | `/quote/car` | `CarBookingInput` subset (no customer needed) + `promoCode?` + `bundleWithBookingRef?` | `Quote` |
| POST | `/quote/stay` | `StayBookingInput` subset | `Quote` |
| POST | `/uploads` | multipart `file` + `kind` (`licence`\|`id`\|`passport`) | `{ path, originalName }` — path is an opaque token to attach to a booking |
| POST | `/bookings/car` | `CarBookingInput & { documents: {kind,path,originalName}[] }` | `{ booking: Booking, payment?: { redirectUrl } }` |
| POST | `/bookings/stay` | `StayBookingInput & { documents }` | same |
| GET | `/bookings/:reference?email=` | | `Booking` (requires matching customer email) |
| GET | `/payments/verify?tx_ref=` | | `{ status, booking }` — redirect target after gateway |
| POST | `/payments/webhook/:gateway` | gateway payload | `200` |
| GET | `/ical/:propertyId/:token.ics` | | iCal feed of confirmed/pending stays + manual blocks for Airbnb/Booking.com import |
| POST | `/contact` | `{name,email,phone,message}` | `{ ok: true }` (emails vendor) |

Availability rules (server enforced inside a transaction with `SELECT ... FOR UPDATE` on the item row):
- Stay: `[checkIn, checkOut)` must not overlap any booking with status `pending|confirmed` on that property, or any `blocked_dates` row (inclusive end → treat as `[start, end+1)`).
- Car: `[pickupDate, returnDate+1)` must not overlap existing car bookings' `[start, end+1)` (one-day turnaround buffer) or blocks.
- Double-click protection: same email + same item + same dates within 2 minutes returns the existing booking.

Booking creation side effects (fire-and-forget, logged to `notification_log`):
1. Vendor email with full details (to `settings.vendorEmail`).
2. Customer confirmation email (reference, itemised price, check-in instructions for stays).
3. WhatsApp: if `WHATSAPP_CLOUD_TOKEN` + `WHATSAPP_PHONE_ID` set, send a template-free text via Meta Cloud API; always also return `whatsappLink` (click-to-chat `https://wa.me/<business>?text=...`) in the booking response for the confirmation page.

Payments: `PAYMENT_GATEWAY=mock|flutterwave`. `online` → create `payments` row with `tx_ref = <reference>-<n>` and return `redirectUrl`. Mock gateway redirects straight to `/payments/verify?tx_ref=…&mock=success`. Verify marks `payment_status=paid` (or `deposit_paid` when amount < total) and `status=confirmed`. `on_arrival` → `payment_status=pay_on_arrival`, `status=pending`.

## Admin (`/api/admin`, JWT in `Authorization: Bearer`, httpOnly cookie also accepted)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{email,password}` → `{ token, user }`; rate-limited |
| POST | `/auth/logout` | |
| GET | `/auth/me` | |
| GET | `/bookings` | `?service&status&paymentStatus&from&to&q&page&pageSize` → `{ items, total }` |
| GET | `/bookings/:id` | |
| PATCH | `/bookings/:id` | `{ status?, paymentStatus?, adminNotes?, startDate?, endDate?, startTime?, endTime?, customer? }` — date edits re-check availability |
| GET | `/bookings.csv` | same filters → CSV download |
| GET | `/reports/revenue` | `?from&to` → `{ car: {count,totalTzs,paidTzs}, stay: {...}, byMonth: [...] }` |
| GET | `/calendar` | `?service&from&to` → bookings + blocks per item for the calendar views |
| GET/POST | `/blocks`, DELETE `/blocks/:id` | manual blocked dates |
| GET/POST/PATCH/DELETE | `/vehicles[/:id]` | full `Vehicle` incl. inactive |
| GET/POST/PATCH/DELETE | `/properties[/:id]` | full `Property` incl. `icalImportUrls`; response includes `icalExportUrl` |
| POST | `/properties/:id/ical-sync` | pull all import URLs now → `{ imported }` (also runs on a 30-min interval) |
| GET/POST/PATCH/DELETE | `/seasonal-rates[/:id]` | |
| GET/POST/PATCH/DELETE | `/extras[/:id]` | |
| GET/POST/PATCH/DELETE | `/delivery-zones[/:id]` | |
| GET/POST/PATCH/DELETE | `/promo-codes[/:id]` | |
| GET/PUT | `/settings` | full `Settings` |
| POST | `/uploads/image` | multipart image → `{ url }` (served from `/uploads/images/…`, re-encoded to WebP) |
| GET | `/documents/:token` | streams a customer's uploaded licence/ID (admin only) |

Auth: bcrypt password hashes, JWT (8h). Login limited to 10 attempts / 15 min per IP. First admin created by `npm run db:setup` from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env.

Security: helmet, CORS limited to `CLIENT_ORIGIN`, zod validation on every body/query, multer with MIME + magic-byte check and random filenames stored outside the web root (`server/uploads/private`), express-rate-limit on public POSTs, no card data ever touches the server (gateway-hosted checkout).
