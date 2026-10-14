import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Booking, Property, Quote, StayBookingInput, PaymentMethod } from "@bluesparks/shared";
import { addDays, daysBetween, quoteStay, COMPANY } from "@bluesparks/shared";
import { useSeo } from "@/lib/useSeo";
import { api, errorMessage, ApiError } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { useExtras, useProperties, useSettings, FALLBACK_SETTINGS } from "@/lib/queries";
import { DateField, TimeField } from "@/components/ui/DateField";
import { Select, Checkbox, Textarea } from "@/components/ui/Input";
import { PropertyCard } from "@/components/PropertyCard";
import { Skeleton, ErrorState, EmptyState } from "@/components/States";
import { useToast } from "@/components/ui/Toast";
import { fmtDate, tomorrow, img800 } from "@/lib/format";
import { IMAGES } from "@/content/images";
import { BookingShell, StepNav, SummaryBox, CustomerFields, DocumentUpload, QuoteTable, PaymentChoice, PromoField, TermsLine, FormAlert, useStep, type UploadedDoc, type CustomerForm } from "./shared";
import { stayDatesSchema, stayDetailsSchema, flatten, fromServer, type FieldErrors } from "./schemas";

const STEPS = ["Dates & guests", "Property", "Extras", "Your details", "Review & pay"];
const STEP_OF_FIELD = (stepOf: (keys: string[], n: number) => number | null) => stepOf(["checkIn", "checkOut", "guests", "dates"], 1) ?? stepOf(["propertyId"], 2) ?? stepOf(["extras"], 3) ?? stepOf(["fullName", "email", "phone", "country", "arrivalTime", "documents", "acceptedTerms", "acceptedHouseRules"], 4);

interface State {
  checkIn: string;
  checkOut: string;
  guests: string;
  propertySlug: string;
  extras: Record<number, number>;
  customer: CustomerForm;
  arrivalTime: string;
  documents: UploadedDoc[];
  acceptedTerms: boolean;
  acceptedHouseRules: boolean;
  promoCode: string;
  paymentMethod: PaymentMethod;
  bundleWithBookingRef: string;
  addCar: boolean;
}

export default function BookStay() {
  const { data: settings } = useSettings();
  const s = settings ?? FALLBACK_SETTINGS;
  useSeo({ title: `Book a stay — ${s.bnbBrandName}`, noindex: true });
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const { fmt, currency } = useCurrency();
  const [step, setStep] = useStep(STEPS.length);

  const [f, setF] = useState<State>(() => ({
    checkIn: sp.get("checkIn") ?? tomorrow(),
    checkOut: sp.get("checkOut") ?? addDays(sp.get("checkIn") ?? tomorrow(), 2),
    guests: sp.get("guests") ?? "2",
    propertySlug: sp.get("property") ?? "",
    extras: {},
    customer: { fullName: "", email: "", phone: "", country: "" },
    arrivalTime: "",
    documents: [],
    acceptedTerms: false,
    acceptedHouseRules: false,
    promoCode: "",
    paymentMethod: "online",
    bundleWithBookingRef: sp.get("bundleWith") ?? "",
    addCar: false,
  }));
  const patch = (p: Partial<State>) => setF((x) => ({ ...x, ...p }));
  const [errors, setErrors] = useState<FieldErrors>({});

  const datesValid = stayDatesSchema.safeParse(f).success;
  const properties = useProperties(datesValid ? { checkIn: f.checkIn, checkOut: f.checkOut, guests: Number(f.guests) } : undefined);
  const extras = useExtras("stay");
  const property: Property | undefined = useMemo(() => properties.data?.find((p) => p.slug === f.propertySlug), [properties.data, f.propertySlug]);
  const nights = daysBetween(f.checkIn, f.checkOut);

  const preview: Quote | null = useMemo(() => {
    if (!property) return null;
    return quoteStay({ checkIn: f.checkIn, checkOut: f.checkOut, guests: Number(f.guests), extras: Object.entries(f.extras).map(([id, qty]) => ({ extraId: Number(id), qty })), promoCode: f.promoCode || undefined }, { property, settings: { ...s, vendorEmail: "" }, extras: extras.data ?? [], seasonalRates: [], bundleEligible: !!f.bundleWithBookingRef });
  }, [property, f, s, extras.data]);

  const quoteBody = () => ({
    propertyId: property?.id,
    checkIn: f.checkIn,
    checkOut: f.checkOut,
    guests: Number(f.guests),
    arrivalTime: f.arrivalTime || undefined,
    extras: Object.entries(f.extras)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ extraId: Number(id), qty })),
    bundleWithBookingRef: f.bundleWithBookingRef || undefined,
  });
  const [promoApplied, setPromoApplied] = useState("");
  const [promoError, setPromoError] = useState<string | undefined>();
  const serverQuote = useQuery({
    queryKey: ["quote-stay", quoteBody(), promoApplied, f.customer.email],
    queryFn: async () => {
      try {
        return await api.post<Quote>("/quote/stay", { ...quoteBody(), promoCode: promoApplied || undefined, customer: f.customer.email ? { email: f.customer.email } : undefined });
      } catch (e) {
        if (e instanceof ApiError && e.status === 400 && (e.fields.promoCode || e.fields.bundleWithBookingRef)) {
          if (e.fields.promoCode) {
            setPromoError(e.fields.promoCode);
            setPromoApplied("");
          }
          if (e.fields.bundleWithBookingRef) {
            setErrors((x) => ({ ...x, bundleWithBookingRef: e.fields.bundleWithBookingRef! }));
            patch({ bundleWithBookingRef: "" });
          }
          return api.post<Quote>("/quote/stay", { ...quoteBody(), promoCode: undefined, bundleWithBookingRef: e.fields.bundleWithBookingRef ? undefined : quoteBody().bundleWithBookingRef });
        }
        throw e;
      }
    },
    enabled: step === 5 && !!property,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: (body: StayBookingInput & { documents: UploadedDoc[] }) => api.post<{ booking: Booking; payment?: { redirectUrl: string } }>("/bookings/stay", body),
    onSuccess: (res) => {
      if (res.payment?.redirectUrl) {
        window.location.assign(res.payment.redirectUrl);
        return;
      }
      const q = new URLSearchParams({ email: res.booking.customer.email });
      if (f.addCar) q.set("addCar", "1");
      nav(`/booking/${res.booking.reference}?${q}`);
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

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    setErrors({});
    if (step === 1) {
      const r = stayDatesSchema.safeParse(f);
      if (!r.success) return setErrors(flatten(r.error));
    }
    if (step === 2) {
      if (!property) return setErrors({ property: "Choose a place to continue" });
      if (nights < property.minNights) return setErrors({ property: `${property.name} has a minimum stay of ${property.minNights} nights.` });
      if (Number(f.guests) > property.maxGuests) return setErrors({ property: `${property.name} sleeps up to ${property.maxGuests}.` });
    }
    if (step === 4) {
      const r = stayDetailsSchema.safeParse({ ...f.customer, arrivalTime: f.arrivalTime, acceptedTerms: f.acceptedTerms, acceptedHouseRules: f.acceptedHouseRules });
      if (!r.success) return setErrors(flatten(r.error));
    }
    if (step === 5) {
      if (!property) return;
      submit.mutate({
        propertyId: property.id,
        checkIn: f.checkIn,
        checkOut: f.checkOut,
        guests: Number(f.guests),
        arrivalTime: f.arrivalTime || undefined,
        extras: quoteBody().extras,
        promoCode: promoApplied && !promoError ? promoApplied : undefined,
        bundleWithBookingRef: f.bundleWithBookingRef || undefined,
        customer: { ...f.customer, specialRequests: f.customer.specialRequests || undefined },
        paymentMethod: property.paymentMode === "on_arrival" ? "on_arrival" : f.paymentMethod,
        currency,
        acceptedTerms: true,
        acceptedHouseRules: true,
        documents: f.documents,
      });
      return;
    }
    setStep(step + 1);
  };
  const back = () => setStep(Math.max(1, step - 1));

  const aside = (
    <SummaryBox
      title={property ? property.name : "Short stay"}
      rows={[
        ["Check-in", fmtDate(f.checkIn, { weekday: true, year: false })],
        ["Check-out", fmtDate(f.checkOut, { weekday: true, year: false })],
        ["Nights", String(Math.max(0, nights))],
        ["Guests", f.guests],
        ...(property ? ([["Area", property.area]] as [string, string][]) : []),
        ...(f.bundleWithBookingRef ? ([["Bundle", `with ${f.bundleWithBookingRef}`]] as [string, string][]) : []),
      ]}
    >
      {preview && preview.totalTzs > 0 && (
        <p className="mt-3 text-right">
          <span className="text-xs text-ink-soft">Estimate</span>
          <span className="block font-display text-3xl text-orange">{fmt(preview.totalTzs)}</span>
          <span className="text-xs text-ink-soft">Final price confirmed at review</span>
        </p>
      )}
    </SummaryBox>
  );

  const payMode = property?.paymentMode ?? "full_online";

  return (
    <BookingShell eyebrow={s.bnbBrandName || COMPANY.staysBrand} title="Book a stay" steps={STEPS} step={step} onGoTo={setStep} aside={aside}>
      <form onSubmit={next} noValidate>
        <FormAlert errors={errors} />
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <DateField label="Check-in" required value={f.checkIn} onChange={(v) => patch({ checkIn: v, checkOut: f.checkOut <= v ? addDays(v, 1) : f.checkOut })} error={errors.checkIn} />
              <DateField label="Check-out" required value={f.checkOut} onChange={(v) => patch({ checkOut: v })} min={addDays(f.checkIn, 1)} error={errors.checkOut} />
              <Select label="Guests" required value={f.guests} onChange={(e) => patch({ guests: e.target.value })} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} error={errors.guests} />
            </div>
            <p className="text-sm text-ink-soft">Check-in from 14:00, check-out by 11:00. {nights > 0 && <b className="text-ink">{nights} night{nights > 1 ? "s" : ""}.</b>}</p>
            <StepNav onNext={() => undefined} nextLabel="See what's free" />
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm text-ink-soft" aria-live="polite">
              {properties.isPending ? "Checking the calendars…" : `${properties.data?.length ?? 0} places free ${fmtDate(f.checkIn, { weekday: false, year: false })} → ${fmtDate(f.checkOut, { weekday: false, year: false })} for ${f.guests} guest${Number(f.guests) > 1 ? "s" : ""}.`}
            </p>
            {errors.property && (
              <p role="alert" className="mt-2 text-sm font-bold text-danger">
                {errors.property}
              </p>
            )}
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {properties.isPending && [1, 2, 3, 4].map((k) => <Skeleton key={k} className="aspect-[3/4]" />)}
              {properties.isError && (
                <div className="sm:col-span-2">
                  <ErrorState error={properties.error} retry={() => properties.refetch()} compact />
                </div>
              )}
              {properties.data?.map((p) => (
                <PropertyCard key={p.id} p={p} compact onChoose={() => patch({ propertySlug: p.slug })} chosen={p.slug === f.propertySlug} />
              ))}
              {properties.data?.length === 0 && (
                <div className="sm:col-span-2">
                  <EmptyState title="Nothing free for those dates">Try a night either side, or WhatsApp us.</EmptyState>
                </div>
              )}
            </div>
            <StepNav onBack={back} onNext={() => undefined} disabled={!property} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <ul className="divide-y-2 divide-line border-y-2 border-line">
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
                      <span className="block text-xs font-normal text-ink-soft">{x.pricing === "per_day" ? "per night" : "per booking"}</span>
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

            {/* Cross-sell: add a car */}
            <div className="grid overflow-hidden border-2 border-brand bg-white sm:grid-cols-12">
              <img src={img800(IMAGES.cars[1]!)} alt="" width="800" height="533" loading="lazy" className="h-full w-full object-cover sm:col-span-4" />
              <div className="p-5 sm:col-span-8">
                <p className="eyebrow">Add a car</p>
                <h3 className="mt-1 text-2xl">A car for the same dates, {s.bundleDiscountPercent}% off.</h3>
                <p className="mt-2 text-sm text-ink-soft">Tick this and after you confirm the stay we'll take you straight to the car booking with your dates filled in and the bundle discount applied. Picked up at JNIA or parked in the compound, as you like.</p>
                <Checkbox className="mt-3" label={<b>Yes, I want a car {fmtDate(f.checkIn, { weekday: false, year: false })} → {fmtDate(f.checkOut, { weekday: false, year: false })}</b>} checked={f.addCar} onChange={(e) => patch({ addCar: e.target.checked })} />
              </div>
            </div>
            <StepNav onBack={back} onNext={() => undefined} />
          </div>
        )}

        {step === 4 && property && (
          <div className="space-y-6">
            <CustomerFields value={f.customer} onChange={(customer) => patch({ customer })} errors={errors} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TimeField label="Expected arrival time" value={f.arrivalTime} onChange={(v) => patch({ arrivalTime: v })} error={errors.arrivalTime} />
              <Select label="Guests" required value={f.guests} onChange={(e) => patch({ guests: e.target.value })} options={Array.from({ length: property.maxGuests }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
            </div>
            <Textarea label="Special requests" value={f.customer.specialRequests ?? ""} onChange={(e) => patch({ customer: { ...f.customer, specialRequests: e.target.value } })} hint="Cot, extra towels, a SIM card waiting — tell us." />
            <DocumentUpload kind="passport" label="Passport or national ID" hint="Required by the immigration office for guest registration. You can also show it at check-in." docs={f.documents} onChange={(documents) => patch({ documents })} />
            <details className="border-2 border-line bg-cream p-4">
              <summary className="font-bold text-brand">House rules for {property.name}</summary>
              <p className="mt-2 text-sm whitespace-pre-line text-ink-soft">{property.houseRules}</p>
            </details>
            <Checkbox label={<b>I accept the house rules.</b>} checked={f.acceptedHouseRules} onChange={(e) => patch({ acceptedHouseRules: e.target.checked })} error={errors.acceptedHouseRules} />
            <Checkbox label={<TermsLine />} checked={f.acceptedTerms} onChange={(e) => patch({ acceptedTerms: e.target.checked })} error={errors.acceptedTerms} />
            <StepNav onBack={back} onNext={() => undefined} nextLabel="Review" />
          </div>
        )}

        {step === 5 && property && (
          <div className="space-y-6">
            {serverQuote.isPending && <Skeleton className="h-48" />}
            {serverQuote.isError && <ErrorState error={serverQuote.error} retry={() => serverQuote.refetch()} compact />}
            {serverQuote.data && <QuoteTable quote={serverQuote.data} depositLabel={payMode === "deposit" ? `Deposit now (${property.depositPercent}%)` : undefined} />}
            <PromoField value={f.promoCode} onChange={(v) => { patch({ promoCode: v }); setPromoError(undefined); }} onApply={() => { setPromoError(undefined); setPromoApplied(f.promoCode); }} applied={!!promoApplied && promoApplied === f.promoCode} error={promoError} />
            {payMode === "on_arrival" ? (
              <p className="border-l-4 border-orange bg-cream p-4 text-sm">This place is paid on arrival: nothing to pay now. Cash, M-Pesa, Tigo Pesa, Airtel Money or Halopesa at check-in.</p>
            ) : (
              <PaymentChoice value={f.paymentMethod} onChange={(v) => patch({ paymentMethod: v })} payNowLabel={payMode === "deposit" ? `Pay ${property.depositPercent}% deposit now` : "Pay in full now"} payLaterLabel="Reserve, pay on arrival" allowOnArrival={payMode !== "full_online"} />
            )}
            {payMode === "deposit" && f.paymentMethod === "online" && <p className="text-sm text-ink-soft">The balance is paid at check-in.</p>}
            <dl className="grid gap-2 border-2 border-line bg-cream p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-ink-soft uppercase">Guest</dt>
                <dd>{f.customer.fullName} · {f.customer.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-soft uppercase">Arrival</dt>
                <dd>{f.arrivalTime || "Not specified"}</dd>
              </div>
              {f.addCar && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold text-ink-soft uppercase">Bundle</dt>
                  <dd>After confirming, you'll continue to book a car for the same dates with {s.bundleDiscountPercent}% off.</dd>
                </div>
              )}
            </dl>
            <p className="text-xs text-ink-soft">
              By confirming you agree to the <Link to="/terms" className="link-underline">terms</Link> and the house rules above.
            </p>
            <StepNav onBack={back} onNext={() => undefined} nextLabel={payMode !== "on_arrival" && f.paymentMethod === "online" ? "Continue to payment" : "Confirm reservation"} loading={submit.isPending} disabled={!serverQuote.data} />
          </div>
        )}
      </form>
    </BookingShell>
  );
}
