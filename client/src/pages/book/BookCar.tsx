import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Booking, CarBookingInput, Quote, Vehicle, PickupLocationCode, RentalType, DriverScope, PaymentMethod } from "@bluesparks/shared";
import { PICKUP_LOCATIONS, addDays, quoteCar, rentalDays, COMPANY } from "@bluesparks/shared";
import { useSeo } from "@/lib/useSeo";
import { api, errorMessage, ApiError } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { useDeliveryZones, useExtras, useSettings, useVehicles, FALLBACK_SETTINGS } from "@/lib/queries";
import { DateField, TimeField } from "@/components/ui/DateField";
import { Input, Select, Checkbox, SegmentedRadio, Textarea } from "@/components/ui/Input";
import { VehicleCard } from "@/components/VehicleCard";
import { Skeleton, ErrorState, EmptyState } from "@/components/States";
import { useToast } from "@/components/ui/Toast";
import { fmtDate, tomorrow } from "@/lib/format";
import { BookingShell, StepNav, SummaryBox, CustomerFields, DocumentUpload, QuoteTable, PaymentChoice, PromoField, TermsLine, FormAlert, useStep, type UploadedDoc, type CustomerForm } from "./shared";
import { carDatesSchema, carDetailsSchema, flatten, fromServer, type FieldErrors } from "./schemas";

const STEPS = ["Dates & places", "Rental type", "Vehicle", "Extras", "Your details", "Review & pay"];
const STEP_OF_FIELD = (stepOf: (keys: string[], n: number) => number | null) =>
  stepOf(["pickupDate", "returnDate", "pickupTime", "returnTime", "pickupLocation", "dropoffLocation", "pickupAddress", "dropoffAddress", "deliveryZoneId", "dates"], 1) ?? stepOf(["rentalType", "driverScope"], 2) ?? stepOf(["vehicleId"], 3) ?? stepOf(["extras"], 4) ?? stepOf(["fullName", "email", "phone", "country", "passengers", "flightNumber", "licence", "id", "documents", "acceptedTerms"], 5);

interface State {
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  pickupLocation: PickupLocationCode;
  dropoffLocation: PickupLocationCode;
  pickupAddress: string;
  dropoffAddress: string;
  deliveryZoneId: number | null;
  rentalType: RentalType;
  driverScope: DriverScope;
  vehicleSlug: string;
  extras: Record<number, number>;
  customer: CustomerForm;
  passengers: string;
  flightNumber: string;
  documents: UploadedDoc[];
  acceptedTerms: boolean;
  promoCode: string;
  paymentMethod: PaymentMethod;
  bundleWithBookingRef: string;
}

export default function BookCar() {
  useSeo({ title: "Book a car — Johnson Rentals", noindex: true });
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const { fmt, currency } = useCurrency();
  const [step, setStep] = useStep(STEPS.length);
  const { data: settings } = useSettings();
  const s = settings ?? FALLBACK_SETTINGS;

  const [f, setF] = useState<State>(() => ({
    pickupDate: sp.get("from") ?? tomorrow(),
    pickupTime: "10:00",
    returnDate: sp.get("to") ?? addDays(sp.get("from") ?? tomorrow(), 3),
    returnTime: "10:00",
    pickupLocation: "jnia",
    dropoffLocation: "jnia",
    pickupAddress: "",
    dropoffAddress: "",
    deliveryZoneId: null,
    rentalType: sp.get("rentalType") === "with_driver" ? "with_driver" : "self_drive",
    driverScope: "dar",
    vehicleSlug: sp.get("vehicle") ?? "",
    extras: {},
    customer: { fullName: "", email: "", phone: "", country: "" },
    passengers: "2",
    flightNumber: "",
    documents: [],
    acceptedTerms: false,
    promoCode: "",
    paymentMethod: "online",
    bundleWithBookingRef: sp.get("bundleWith") ?? "",
  }));
  const patch = (p: Partial<State>) => setF((x) => ({ ...x, ...p }));
  const [errors, setErrors] = useState<FieldErrors>({});

  const datesValid = carDatesSchema.safeParse({ ...f, deliveryZoneId: f.deliveryZoneId }).success;
  const vehicles = useVehicles(datesValid ? { from: f.pickupDate, to: f.returnDate, pickupTime: f.pickupTime, returnTime: f.returnTime } : undefined);
  const zones = useDeliveryZones();
  const extras = useExtras("car");
  const vehicle: Vehicle | undefined = useMemo(() => vehicles.data?.find((v) => v.slug === f.vehicleSlug), [vehicles.data, f.vehicleSlug]);
  const days = rentalDays(f.pickupDate, f.pickupTime, f.returnDate, f.returnTime);
  const needsZone = f.pickupLocation === "custom" || f.dropoffLocation === "custom";

  // live client-side preview (server quote is authoritative on step 6)
  const preview: Quote | null = useMemo(() => {
    if (!vehicle) return null;
    return quoteCar(
      { ...f, extras: Object.entries(f.extras).map(([id, qty]) => ({ extraId: Number(id), qty })), promoCode: f.promoCode || undefined },
      { vehicle, settings: { ...s, vendorEmail: "" }, extras: extras.data ?? [], zones: zones.data ?? [], seasonalRates: [], bundleEligible: !!f.bundleWithBookingRef },
    );
  }, [vehicle, f, s, extras.data, zones.data]);

  const quoteBody = () => ({
    vehicleId: vehicle?.id,
    pickupDate: f.pickupDate,
    pickupTime: f.pickupTime,
    returnDate: f.returnDate,
    returnTime: f.returnTime,
    pickupLocation: f.pickupLocation,
    dropoffLocation: f.dropoffLocation,
    pickupAddress: f.pickupAddress || undefined,
    dropoffAddress: f.dropoffAddress || undefined,
    deliveryZoneId: needsZone ? f.deliveryZoneId : null,
    rentalType: f.rentalType,
    driverScope: f.rentalType === "with_driver" ? f.driverScope : undefined,
    extras: Object.entries(f.extras)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ extraId: Number(id), qty })),
    promoCode: f.promoCode || undefined,
    bundleWithBookingRef: f.bundleWithBookingRef || undefined,
  });

  const [promoApplied, setPromoApplied] = useState("");
  const [promoError, setPromoError] = useState<string | undefined>();
  const serverQuote = useQuery({
    queryKey: ["quote-car", quoteBody(), promoApplied, f.customer.email],
    queryFn: async () => {
      try {
        return await api.post<Quote>("/quote/car", { ...quoteBody(), promoCode: promoApplied || undefined, customer: f.customer.email ? { email: f.customer.email } : undefined });
      } catch (e) {
        // Unknown promo or bundle ref: show inline and re-quote without it rather than blocking the form.
        if (e instanceof ApiError && e.status === 400 && (e.fields.promoCode || e.fields.bundleWithBookingRef)) {
          if (e.fields.promoCode) {
            setPromoError(e.fields.promoCode);
            setPromoApplied("");
          }
          if (e.fields.bundleWithBookingRef) {
            setErrors((x) => ({ ...x, bundleWithBookingRef: e.fields.bundleWithBookingRef! }));
            patch({ bundleWithBookingRef: "" });
          }
          return api.post<Quote>("/quote/car", { ...quoteBody(), promoCode: undefined, bundleWithBookingRef: e.fields.bundleWithBookingRef ? undefined : quoteBody().bundleWithBookingRef });
        }
        throw e;
      }
    },
    enabled: step === 6 && !!vehicle,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: (body: CarBookingInput & { documents: UploadedDoc[] }) => api.post<{ booking: Booking; payment?: { redirectUrl: string } }>("/bookings/car", body),
    onSuccess: (res) => {
      if (res.payment?.redirectUrl) {
        window.location.assign(res.payment.redirectUrl);
        return;
      }
      nav(`/booking/${res.booking.reference}?email=${encodeURIComponent(res.booking.customer.email)}`);
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        const f = fromServer(e.fields);
        if (e.status === 409) f._ = f.dates ?? "Those dates were just taken. Please pick different dates.";
        if (!Object.keys(f).length) f._ = e.message;
        setErrors(f);
        // send the user back to the step that owns the failing field
        const k = Object.keys(f);
        const stepOf = (keys: string[], n: number) => (k.some((x) => keys.includes(x)) ? n : null);
        const target = STEP_OF_FIELD(stepOf);
        if (target) setStep(target);
      }
      toast(errorMessage(e), "error");
    },
  });

  // if a vehicle was pre-selected but is not available on the chosen dates, say so
  useEffect(() => {
    if (vehicles.data && f.vehicleSlug && !vehicle && step > 3) setStep(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.data]);

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    setErrors({});
    if (step === 1) {
      const r = carDatesSchema.safeParse({ ...f, deliveryZoneId: needsZone ? f.deliveryZoneId : null });
      if (!r.success) return setErrors(flatten(r.error));
    }
    if (step === 3 && !vehicle) return setErrors({ vehicle: "Choose a car to continue" });
    if (step === 5) {
      const r = carDetailsSchema.safeParse({ ...f.customer, passengers: f.passengers, flightNumber: f.flightNumber, acceptedTerms: f.acceptedTerms, documents: f.documents });
      if (!r.success) return setErrors(flatten(r.error));
      if (f.rentalType === "self_drive" && !f.documents.some((d) => d.kind === "licence")) return setErrors({ licence: "Upload your driving licence for self-drive" });
      if (!f.documents.some((d) => d.kind === "id" || d.kind === "passport")) return setErrors({ id: "Upload a passport or national ID" });
    }
    if (step === 6) {
      if (!vehicle) return;
      submit.mutate({
        ...(quoteBody() as Omit<CarBookingInput, "customer" | "paymentMethod" | "currency" | "acceptedTerms" | "passengers" | "vehicleId">),
        vehicleId: vehicle.id,
        passengers: Number(f.passengers),
        flightNumber: f.flightNumber || undefined,
        promoCode: promoApplied && !promoError ? promoApplied : undefined,
        customer: { ...f.customer, specialRequests: f.customer.specialRequests || undefined },
        paymentMethod: f.paymentMethod,
        currency,
        acceptedTerms: true,
        documents: f.documents,
      });
      return;
    }
    setStep(step + 1);
  };
  const back = () => setStep(Math.max(1, step - 1));

  const aside = (
    <SummaryBox
      title={vehicle ? vehicle.name : "Car hire"}
      rows={[
        ["Pick-up", `${fmtDate(f.pickupDate, { weekday: true, year: false })}, ${f.pickupTime}`],
        ["Return", `${fmtDate(f.returnDate, { weekday: true, year: false })}, ${f.returnTime}`],
        ["Days", String(days)],
        ["Type", f.rentalType === "with_driver" ? `With driver (${f.driverScope === "dar" ? "Dar" : "upcountry"})` : "Self-drive"],
        ...(f.bundleWithBookingRef ? ([["Bundle", `with ${f.bundleWithBookingRef}`]] as [string, string][]) : []),
      ]}
    >
      {preview && preview.totalTzs > 0 && (
        <p className="mt-3 text-right">
          <span className="text-xs text-ink-soft">Estimate</span>
          <span className="block font-display text-3xl text-spark">{fmt(preview.totalTzs)}</span>
          <span className="text-xs text-ink-soft">Final price confirmed at review</span>
        </p>
      )}
    </SummaryBox>
  );

  return (
    <BookingShell eyebrow={COMPANY.carsBrand} title="Book a car" steps={STEPS} step={step} onGoTo={setStep} aside={aside}>
      <form onSubmit={next} noValidate>
        <FormAlert errors={errors} />
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField label="Pick-up date" required value={f.pickupDate} onChange={(v) => patch({ pickupDate: v, returnDate: f.returnDate < v ? addDays(v, 1) : f.returnDate })} error={errors.pickupDate} />
              <TimeField label="Pick-up time" value={f.pickupTime} onChange={(v) => patch({ pickupTime: v })} error={errors.pickupTime} />
              <DateField label="Return date" required value={f.returnDate} onChange={(v) => patch({ returnDate: v })} min={f.pickupDate} error={errors.returnDate} />
              <TimeField label="Return time" value={f.returnTime} onChange={(v) => patch({ returnTime: v })} error={errors.returnTime} />
            </div>
            <p className="text-sm text-ink-soft">A rental day is 24 hours from pick-up, with one hour of grace on the return. {days > 0 && <b className="text-ink">That's {days} day{days > 1 ? "s" : ""}.</b>}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Pick-up point" required value={f.pickupLocation} onChange={(e) => patch({ pickupLocation: e.target.value as PickupLocationCode })} options={PICKUP_LOCATIONS.map((l) => ({ value: l.code, label: l.label }))} hint={PICKUP_LOCATIONS.find((l) => l.code === f.pickupLocation)?.hint} error={errors.pickupLocation} />
              <Select label="Drop-off point" required value={f.dropoffLocation} onChange={(e) => patch({ dropoffLocation: e.target.value as PickupLocationCode })} options={PICKUP_LOCATIONS.map((l) => ({ value: l.code, label: l.label }))} hint={PICKUP_LOCATIONS.find((l) => l.code === f.dropoffLocation)?.hint} error={errors.dropoffLocation} />
              {f.pickupLocation === "custom" && <Input label="Pick-up address" required value={f.pickupAddress} onChange={(e) => patch({ pickupAddress: e.target.value })} error={errors.pickupAddress} placeholder="Hotel name or street, e.g. Hyatt Regency, Kivukoni" />}
              {f.dropoffLocation === "custom" && <Input label="Drop-off address" required value={f.dropoffAddress} onChange={(e) => patch({ dropoffAddress: e.target.value })} error={errors.dropoffAddress} />}
              {needsZone && (
                <Select
                  label="Delivery zone"
                  required
                  value={f.deliveryZoneId ? String(f.deliveryZoneId) : ""}
                  onChange={(e) => patch({ deliveryZoneId: e.target.value ? Number(e.target.value) : null })}
                  placeholder={zones.isPending ? "Loading zones…" : "Choose zone"}
                  options={(zones.data ?? []).map((z) => ({ value: String(z.id), label: `${z.name} — ${fmt(z.feeTzs)} per leg` }))}
                  error={errors.deliveryZoneId}
                  hint="Charged once per custom leg (delivery and/or collection)."
                />
              )}
            </div>
            <StepNav onNext={() => undefined} nextLabel="See available cars" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <SegmentedRadio
              label="Who's driving?"
              name="rentalType"
              value={f.rentalType}
              onChange={(v) => patch({ rentalType: v })}
              options={[
                { value: "self_drive", label: "Self-drive", hint: "You drive. Licence + ID required." },
                { value: "with_driver", label: "With driver", hint: `+${fmt(s.driverFeeDarTzs)}/day in Dar · +${fmt(s.driverFeeUpcountryTzs)}/day upcountry` },
              ]}
            />
            {f.rentalType === "with_driver" && (
              <SegmentedRadio
                label="Where are you going?"
                name="driverScope"
                value={f.driverScope}
                onChange={(v) => patch({ driverScope: v })}
                options={[
                  { value: "dar", label: "Within Dar es Salaam", hint: "Up to 12 hours a day, driver goes home at night" },
                  { value: "upcountry", label: "Upcountry", hint: "Driver's meals and lodging included in the fee" },
                ]}
              />
            )}
            <div className="border-l-4 border-spark bg-cream p-4 text-sm">
              {f.rentalType === "self_drive" ? (
                <>
                  <p className="font-bold text-brand">Self-drive requirements</p>
                  <ul className="mt-1 list-disc pl-5 text-ink-soft">
                    <li>Driver aged 23 or over with at least two years on the licence.</li>
                    <li>Original licence (English or with translation), valid for 90 days from entry. Tanzanian and EAC licences welcome.</li>
                    <li>Passport or national ID, and a refundable deposit held until the car returns.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-bold text-brand">With a driver</p>
                  <p className="mt-1 text-ink-soft">Our drivers are licensed, know the back way around Ubungo at rush hour, and speak English and Swahili. Fuel for the trip is on you; the driver's fee covers his time, and his lodging if you go upcountry. No deposit needed.</p>
                </>
              )}
            </div>
            <StepNav onBack={back} onNext={() => undefined} />
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-sm text-ink-soft" aria-live="polite">
              {vehicles.isPending ? "Checking what's free…" : `${vehicles.data?.length ?? 0} cars free ${fmtDate(f.pickupDate, { weekday: false, year: false })} → ${fmtDate(f.returnDate, { weekday: false, year: false })}.`} Weekly and monthly rates apply automatically when cheaper.
            </p>
            {errors.vehicle && (
              <p role="alert" className="mt-2 text-sm font-bold text-danger">
                {errors.vehicle}
              </p>
            )}
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {vehicles.isPending && [1, 2, 3, 4].map((k) => <Skeleton key={k} className="aspect-[3/4]" />)}
              {vehicles.isError && (
                <div className="sm:col-span-2">
                  <ErrorState error={vehicles.error} retry={() => vehicles.refetch()} compact />
                </div>
              )}
              {vehicles.data?.map((v) => (
                <VehicleCard key={v.id} v={v} compact onChoose={() => patch({ vehicleSlug: v.slug })} chosen={v.slug === f.vehicleSlug} />
              ))}
              {vehicles.data?.length === 0 && (
                <div className="sm:col-span-2">
                  <EmptyState title="Nothing free on those dates">Go back and shift a day, or WhatsApp us.</EmptyState>
                </div>
              )}
            </div>
            <StepNav onBack={back} onNext={() => undefined} disabled={!vehicle} />
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="text-sm text-ink-soft">Optional. Per-day extras are charged for each of your {days} day{days > 1 ? "s" : ""}.</p>
            <ul className="mt-4 divide-y-2 divide-line border-y-2 border-line">
              {extras.isPending && <Skeleton className="h-24" />}
              {extras.data?.map((x) => {
                const qty = f.extras[x.id] ?? 0;
                return (
                  <li key={x.id} className="grid grid-cols-12 items-center gap-3 py-4">
                    <div className="col-span-8 sm:col-span-7">
                      <p className="font-bold text-brand">{x.name}</p>
                      <p className="text-sm text-ink-soft">{x.description}</p>
                    </div>
                    <p className="col-span-4 text-right text-sm font-bold sm:col-span-2">
                      {fmt(x.priceTzs)}
                      <span className="block text-xs font-normal text-ink-soft">{x.pricing === "per_day" ? "per day" : "per booking"}</span>
                    </p>
                    <div className="col-span-12 flex items-center justify-end gap-2 sm:col-span-3" role="group" aria-label={`${x.name} quantity`}>
                      <button type="button" className="btn-ghost btn-sm" onClick={() => patch({ extras: { ...f.extras, [x.id]: Math.max(0, qty - 1) } })} aria-label="Fewer" disabled={qty === 0}>
                        −
                      </button>
                      <span className="w-6 text-center font-bold tabular" aria-live="polite">
                        {qty}
                      </span>
                      <button type="button" className="btn-ghost btn-sm" onClick={() => patch({ extras: { ...f.extras, [x.id]: Math.min(9, qty + 1) } })} aria-label="More">
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
              {extras.data?.length === 0 && <li className="py-4 text-sm text-ink-soft">No extras available right now.</li>}
            </ul>
            <StepNav onBack={back} onNext={() => undefined} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <CustomerFields value={f.customer} onChange={(customer) => patch({ customer })} errors={errors} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Flight number" value={f.flightNumber} onChange={(e) => patch({ flightNumber: e.target.value })} hint="If we're meeting you at JNIA — we track the flight." placeholder="e.g. QR1351" error={errors.flightNumber} />
              <Input label="Passengers" type="number" min={1} max={14} required value={f.passengers} onChange={(e) => patch({ passengers: e.target.value })} error={errors.passengers} />
            </div>
            <Textarea label="Special requests" value={f.customer.specialRequests ?? ""} onChange={(e) => patch({ customer: { ...f.customer, specialRequests: e.target.value } })} hint="Child seat, cool box, a stop at a bureau de change — tell us." error={errors.specialRequests} />
            <div className="grid gap-4 sm:grid-cols-2">
              {f.rentalType === "self_drive" && <DocumentUpload kind="licence" label="Driving licence" required hint="Front of the card, clear photo or scan." docs={f.documents} onChange={(documents) => patch({ documents })} />}
              <DocumentUpload kind="passport" label="Passport or national ID" required hint="Photo page. Tanzanian NIDA cards are fine (use this box)." docs={f.documents} onChange={(documents) => patch({ documents })} />
            </div>
            {(errors.licence || errors.id) && (
              <p role="alert" className="text-sm font-bold text-danger">
                {errors.licence ?? errors.id}
              </p>
            )}
            <Checkbox label={<TermsLine />} checked={f.acceptedTerms} onChange={(e) => patch({ acceptedTerms: e.target.checked })} error={errors.acceptedTerms} />
            <StepNav onBack={back} onNext={() => undefined} nextLabel="Review" />
          </div>
        )}

        {step === 6 && vehicle && (
          <div className="space-y-6">
            {serverQuote.isPending && <Skeleton className="h-48" />}
            {serverQuote.isError && <ErrorState error={serverQuote.error} retry={() => serverQuote.refetch()} compact />}
            {serverQuote.data && <QuoteTable quote={serverQuote.data} />}
            <PromoField value={f.promoCode} onChange={(v) => { patch({ promoCode: v }); setPromoError(undefined); }} onApply={() => { setPromoError(undefined); setPromoApplied(f.promoCode); }} applied={!!promoApplied && promoApplied === f.promoCode} error={promoError} />
            <PaymentChoice value={f.paymentMethod} onChange={(v) => patch({ paymentMethod: v })} payNowLabel="Pay online now" payLaterLabel="Reserve, pay on collection" payLaterHint="Cash or mobile money when you collect the keys" />
            <dl className="grid gap-2 border-2 border-line bg-cream p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-ink-soft uppercase">Driver</dt>
                <dd>{f.customer.fullName} · {f.customer.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-soft uppercase">Pick-up</dt>
                <dd>{PICKUP_LOCATIONS.find((l) => l.code === f.pickupLocation)?.label}{f.pickupAddress ? ` — ${f.pickupAddress}` : ""}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-soft uppercase">Drop-off</dt>
                <dd>{PICKUP_LOCATIONS.find((l) => l.code === f.dropoffLocation)?.label}{f.dropoffAddress ? ` — ${f.dropoffAddress}` : ""}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-soft uppercase">Documents</dt>
                <dd>{f.documents.map((d) => d.originalName).join(", ") || "—"}</dd>
              </div>
            </dl>
            <StepNav onBack={back} onNext={() => undefined} nextLabel={f.paymentMethod === "online" ? "Continue to payment" : "Confirm reservation"} loading={submit.isPending} disabled={!serverQuote.data} />
          </div>
        )}
      </form>
    </BookingShell>
  );
}
