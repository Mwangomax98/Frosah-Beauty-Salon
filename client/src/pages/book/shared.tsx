import { useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { CustomerDetails, Quote, PaymentMethod } from "@bluesparks/shared";
import { COUNTRIES, ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from "@bluesparks/shared";
import { Stepper } from "@/components/ui/Stepper";
import { Input, Select, Textarea, SegmentedRadio } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { uploadWithProgress, errorMessage } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { PAYMENT_METHODS } from "@/content/site";
import type { FieldErrors } from "./schemas";

/* ---------- step in URL ---------- */
export function useStep(max: number): [number, (n: number) => void] {
  const [sp, setSp] = useSearchParams();
  const raw = Number(sp.get("step") ?? "1");
  const step = Number.isFinite(raw) ? Math.min(max, Math.max(1, raw)) : 1;
  const set = (n: number) => {
    const next = new URLSearchParams(sp);
    next.set("step", String(n));
    setSp(next);
    window.scrollTo({ top: 0 });
  };
  return [step, set];
}

/* ---------- layout ---------- */
export function BookingShell({ eyebrow, title, steps, step, onGoTo, children, aside }: { eyebrow: string; title: string; steps: string[]; step: number; onGoTo: (n: number) => void; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="container-x py-8 lg:py-12">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">{title}</h1>
      <div className="mt-6">
        <Stepper steps={steps} current={step - 1} onGoTo={(i) => onGoTo(i + 1)} />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">{children}</div>
        {aside && <aside className="lg:col-span-4">{aside}</aside>}
      </div>
    </section>
  );
}

export function StepNav({ onBack, onNext, nextLabel = "Continue", loading, disabled, backLabel = "Back" }: { onBack?: () => void; onNext?: () => void; nextLabel?: string; loading?: boolean; disabled?: boolean; backLabel?: string }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-line pt-6">
      {onBack ? (
        <Button variant="ghost" onClick={onBack}>
          ← {backLabel}
        </Button>
      ) : (
        <span />
      )}
      {onNext && (
        <Button type="submit" onClick={onNext} loading={loading} disabled={disabled} className="text-lg">
          {nextLabel} →
        </Button>
      )}
    </div>
  );
}

export function SummaryBox({ title, rows, children }: { title: string; rows: [string, ReactNode][]; children?: ReactNode }) {
  return (
    <div className="sticky top-24 border-2 border-brand bg-white p-5 shadow-hard">
      <p className="eyebrow">Your booking</p>
      <h2 className="mt-1 text-2xl">{title}</h2>
      <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}

/* ---------- customer fields ---------- */
export type CustomerForm = CustomerDetails;

export function CustomerFields({ value, onChange, errors }: { value: CustomerForm; onChange: (v: CustomerForm) => void; errors: FieldErrors }) {
  const set = (k: keyof CustomerForm) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Full name" required autoComplete="name" value={value.fullName} onChange={set("fullName")} error={errors.fullName} className="sm:col-span-2" />
      <Input label="Email" type="email" required autoComplete="email" value={value.email} onChange={set("email")} error={errors.email} hint="Your confirmation goes here." />
      <Input label="Phone / WhatsApp" type="tel" required autoComplete="tel" inputMode="tel" placeholder="+255 7xx xxx xxx" value={value.phone} onChange={set("phone")} error={errors.phone} hint="We send the check-in details on WhatsApp." />
      <Select label="Country" required autoComplete="country-name" value={value.country} onChange={set("country")} error={errors.country} placeholder="Choose…" options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
    </div>
  );
}

/* ---------- document upload ---------- */
export interface UploadedDoc {
  kind: string;
  path: string;
  originalName: string;
}

export function DocumentUpload({ kind, label, hint, docs, onChange, required }: { kind: "licence" | "id" | "passport"; label: string; hint?: string; docs: UploadedDoc[]; onChange: (d: UploadedDoc[]) => void; required?: boolean }) {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mine = docs.filter((d) => d.kind === kind);
  const id = `upload-${kind}`;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    if (!ALLOWED_UPLOAD_MIME.includes(file.type)) return setErr("Use a JPG, PNG, WebP or PDF.");
    if (file.size > MAX_UPLOAD_BYTES) return setErr(`Max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    setPct(0);
    try {
      const res = await uploadWithProgress<{ path: string; originalName: string }>("/uploads", form, setPct);
      onChange([...docs, { kind, path: res.path, originalName: res.originalName || file.name }]);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setPct(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="border-2 border-dashed border-line bg-white p-4">
      <label htmlFor={id} className="label">
        {label}
        {required && (
          <span className="ml-0.5 text-spark" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && <p className="mb-2 text-xs text-ink-soft">{hint}</p>}
      <ul className="mb-2 space-y-1 text-sm">
        {mine.map((d) => (
          <li key={d.path} className="flex items-center justify-between gap-2 bg-cream px-2 py-1">
            <span className="truncate">✓ {d.originalName}</span>
            <button type="button" className="text-xs font-bold text-danger" onClick={() => onChange(docs.filter((x) => x.path !== d.path))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <input ref={inputRef} id={id} type="file" accept={ALLOWED_UPLOAD_MIME.join(",")} className="block w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-brand file:px-3 file:py-1.5 file:font-bold file:text-paper hover:file:bg-brand-deep" onChange={(e) => onFile(e.target.files?.[0])} disabled={pct !== null} aria-describedby={err ? `${id}-err` : undefined} />
      {pct !== null && (
        <div className="mt-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
          <div className="h-2 w-full bg-cream">
            <div className="h-2 bg-spark transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-soft">Uploading… {pct}%</p>
        </div>
      )}
      {err && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {err}
        </p>
      )}
    </div>
  );
}

/* ---------- quote table ---------- */
export function QuoteTable({ quote, title = "Itemised price", depositLabel }: { quote: Quote; title?: string; depositLabel?: string }) {
  const { fmt, fmtBoth } = useCurrency();
  return (
    <div className="border-2 border-brand bg-white">
      <h3 className="border-b-2 border-brand bg-brand px-4 py-2 text-lg text-paper">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {quote.items.map((i) => (
            <tr key={i.code} className="border-b border-line">
              <td className="px-4 py-2">
                {i.label}
                {i.qty > 1 && i.code !== "vehicle" && i.code !== "stay" && <span className="text-ink-soft"> × {i.qty}</span>}
              </td>
              <td className="px-4 py-2 text-right font-bold tabular">{fmt(i.totalTzs)}</td>
            </tr>
          ))}
          {quote.discountTzs > 0 && (
            <tr className="border-b border-line text-ok">
              <td className="px-4 py-2">Discount</td>
              <td className="px-4 py-2 text-right font-bold tabular">−{fmt(quote.discountTzs)}</td>
            </tr>
          )}
          <tr>
            <td className="px-4 py-3 text-base font-bold">Total</td>
            <td className="px-4 py-3 text-right">
              <span className="font-display text-2xl text-spark">{fmt(quote.totalTzs)}</span>
              <span className="block text-xs text-ink-soft">{fmtBoth(quote.totalTzs)}</span>
            </td>
          </tr>
          {quote.depositTzs > 0 && quote.depositTzs < quote.totalTzs && (
            <tr className="border-t border-line bg-cream">
              <td className="px-4 py-2 font-bold">{depositLabel ?? "Payable now (deposit)"}</td>
              <td className="px-4 py-2 text-right font-bold tabular">{fmt(quote.depositTzs)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {quote.notes.length > 0 && (
        <ul className="border-t border-line px-4 py-2 text-xs text-ink-soft">
          {quote.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- payment choice ---------- */
export function PaymentChoice({ value, onChange, payNowLabel, payLaterLabel, payLaterHint, allowOnArrival = true }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void; payNowLabel: string; payLaterLabel: string; payLaterHint?: string; allowOnArrival?: boolean }) {
  return (
    <div>
      <SegmentedRadio
        label="How would you like to pay?"
        name="paymentMethod"
        value={value}
        onChange={onChange}
        options={[
          { value: "online", label: payNowLabel, hint: "Mobile money or card" },
          ...(allowOnArrival ? [{ value: "on_arrival" as const, label: payLaterLabel, hint: payLaterHint ?? "Cash or mobile money" }] : []),
        ]}
      />
      {value === "online" && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Accepted payment methods">
          {PAYMENT_METHODS.map((m) => (
            <li key={m} className="border border-brand px-2 py-0.5 text-xs font-bold tracking-wide text-brand uppercase">
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PromoField({ value, onChange, onApply, applied, error }: { value: string; onChange: (v: string) => void; onApply: () => void; applied?: boolean; error?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Input label="Promo code" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="flex-1" autoCapitalize="characters" error={error} hint={applied && !error ? "Code applied to the quote." : undefined} />
      <Button variant="ghost" onClick={onApply} disabled={!value} className="mt-6">
        {applied && !error ? "Applied" : "Apply"}
      </Button>
    </div>
  );
}

/** Top-of-form message for errors that don't map to a single field (conflict, bundle ref, rate limit). */
export function FormAlert({ errors }: { errors: Record<string, string> }) {
  const general = errors._ ?? errors.dates ?? errors.bundleWithBookingRef ?? errors.documents;
  if (!general) return null;
  return (
    <p role="alert" className="border-l-4 border-danger bg-white p-3 text-sm font-bold text-danger">
      {general}
    </p>
  );
}

export function TermsLine() {
  return (
    <>
      I have read and accept the{" "}
      <Link to="/terms" target="_blank" className="link-underline">
        terms &amp; conditions
      </Link>
      .
    </>
  );
}

export { Textarea };
