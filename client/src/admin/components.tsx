import { useState, type ReactNode } from "react";
import type { BookingStatus, PaymentStatus } from "@bluesparks/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiUrl, uploadWithProgress, errorMessage } from "@/lib/api";

export function PageHead({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-line pb-4">
      <div>
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {children && <p className="mt-1 text-sm text-ink-soft">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ s }: { s: BookingStatus }) {
  const cls: Record<BookingStatus, string> = { pending: "bg-[#fff1d6] text-warn", confirmed: "bg-[#dcefe3] text-ok", cancelled: "bg-[#f8dcda] text-danger", completed: "bg-cream text-ink-soft" };
  return <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-bold uppercase ${cls[s]}`}>{s}</span>;
}
export function PayBadge({ s }: { s: PaymentStatus }) {
  const cls: Record<PaymentStatus, string> = { unpaid: "bg-[#f8dcda] text-danger", paid: "bg-[#dcefe3] text-ok", deposit_paid: "bg-[#fff1d6] text-warn", pay_on_arrival: "bg-cream text-ink-soft" };
  return <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-bold uppercase ${cls[s]}`}>{s.replace(/_/g, " ")}</span>;
}

export function ConfirmButton({ label, onConfirm, title = "Are you sure?", body, variant = "danger", size = "sm" }: { label: string; onConfirm: () => void; title?: string; body?: ReactNode; variant?: "danger" | "primary" | "ghost"; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={variant}
              size="sm"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {label}
            </Button>
          </>
        }
      >
        <p className="text-sm">{body ?? "This cannot be undone."}</p>
      </Modal>
    </>
  );
}

/** Admin image uploader → POST /api/admin/uploads/image → { url }. Up/down reorder, remove. */
export function ImageList({ images, onChange }: { images: string[]; onChange: (v: string[]) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    const form = new FormData();
    form.append("image", file);
    setPct(0);
    try {
      const res = await uploadWithProgress<{ url: string }>("/admin/uploads/image", form, setPct);
      onChange([...images, apiUrl(res.url)]);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setPct(null);
    }
  };
  return (
    <div>
      <span className="label">Images</span>
      <ul className="space-y-2">
        {images.map((src, i) => (
          <li key={`${src}-${i}`} className="flex items-center gap-2 border border-line bg-white p-1.5">
            <img src={src} alt="" width="80" height="54" className="h-14 w-20 object-cover" loading="lazy" />
            <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{src}</span>
            <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
              ↑
            </Button>
            <Button variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move down">
              ↓
            </Button>
            <Button variant="danger" size="sm" onClick={() => onChange(images.filter((_, k) => k !== i))} aria-label="Remove image">
              ×
            </Button>
          </li>
        ))}
      </ul>
      <input type="file" accept="image/*" className="mt-2 block w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-brand file:px-3 file:py-1.5 file:font-bold file:text-paper" onChange={(e) => upload(e.target.files?.[0])} disabled={pct !== null} aria-label="Upload image" />
      {pct !== null && (
        <div className="mt-1 h-2 w-full bg-cream" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 bg-spark" style={{ width: `${pct}%` }} />
        </div>
      )}
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}

/** Checkbox grid for features/amenities. */
export function CheckGrid({ label, options, value, onChange, labels }: { label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void; labels?: Record<string, string> }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-spark" checked={value.includes(o)} onChange={(e) => onChange(e.target.checked ? [...value, o] : value.filter((x) => x !== o))} />
            {labels?.[o] ?? o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Comma/newline list editor (features, iCal URLs). */
export function ListEditor({ label, value, onChange, placeholder, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label className="label">
        {label}
        <textarea className="field mt-1 min-h-20 font-normal" value={value.join("\n")} placeholder={placeholder} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
      </label>
      <p className="mt-1 text-xs text-ink-soft">{hint ?? "One per line."}</p>
    </div>
  );
}

/** Simple SVG bar chart by month: two series (car/stay) side by side. No chart libs. */
export function BarChart({ data, fmt }: { data: { label: string; a: number; b: number }[]; fmt: (n: number) => string }) {
  const W = 720;
  const H = 220;
  const padL = 8;
  const padB = 28;
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  const gw = (W - padL) / Math.max(1, data.length);
  const bw = Math.min(28, gw * 0.36);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Revenue by month, cars versus stays">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padL} x2={W} y1={H - padB - (H - padB - 10) * f} y2={H - padB - (H - padB - 10) * f} stroke="var(--color-line)" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const x = padL + i * gw + gw / 2;
          const ha = ((H - padB - 10) * d.a) / max;
          const hb = ((H - padB - 10) * d.b) / max;
          return (
            <g key={d.label}>
              <rect x={x - bw - 2} y={H - padB - ha} width={bw} height={ha} fill="var(--color-brand)">
                <title>
                  {d.label} cars: {fmt(d.a)}
                </title>
              </rect>
              <rect x={x + 2} y={H - padB - hb} width={bw} height={hb} fill="var(--color-spark)">
                <title>
                  {d.label} stays: {fmt(d.b)}
                </title>
              </rect>
              <text x={x} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)" fontFamily="var(--font-sans)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-3 w-3 bg-brand" /> Cars
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-3 w-3 bg-spark" /> Stays
        </span>
        <span className="ml-auto">Peak {fmt(max)}</span>
      </figcaption>
    </figure>
  );
}

export function numInput(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}
export function toNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
export function toNumOrNull(s: string): number | null {
  return s.trim() === "" ? null : toNum(s);
}
