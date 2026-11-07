import { useState, type ReactNode } from "react";
import type { DeliveryZone, Extra, PromoCode, Review } from "@bluesparks/shared";
import { useAdminExtras, useAdminPromos, useAdminReviews, useAdminZones, useCrud } from "../api";
import { PageHead, ConfirmButton, numInput, toNum, toNumOrNull } from "../components";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, Skeleton } from "@/components/States";
import { errorMessage } from "@/lib/api";
import { useCurrency } from "@/lib/currency";

/** Generic list + modal form for small resources. */
function CrudPage<T extends { id: number }>({ title, intro, query, crud, columns, empty, form, label }: { title: string; intro?: string; query: { data?: T[]; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }; crud: ReturnType<typeof useCrud<T>>; columns: { h: string; cell: (r: T) => ReactNode }[]; empty: Omit<T, "id">; form: (v: Omit<T, "id"> & { id?: number }, set: (p: Partial<T>) => void) => ReactNode; label: (r: T) => string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<(Omit<T, "id"> & { id?: number }) | null>(null);
  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) await crud.update.mutateAsync({ ...(editing as T), id: editing.id });
      else await crud.create.mutateAsync(editing as Partial<T>);
      toast("Saved", "ok");
      setEditing(null);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  return (
    <>
      <PageHead
        title={title}
        actions={
          <Button size="sm" onClick={() => setEditing({ ...empty })}>
            + New
          </Button>
        }
      >
        {intro}
      </PageHead>
      {query.isPending && <Skeleton className="h-32" />}
      {query.isError && <ErrorState error={query.error} retry={() => query.refetch()} />}
      {query.data && (
        <div className="table-wrap border-2 border-line bg-white">
          <table className="table-admin">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.h}>{c.h}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => (
                    <td key={c.h}>{c.cell(r)}</td>
                  ))}
                  <td className="whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ ...r })}>
                      Edit
                    </Button>{" "}
                    <ConfirmButton label="Delete" title={`Delete ${label(r)}?`} onConfirm={() => crud.remove.mutate(r.id, { onError: (e) => toast(errorMessage(e), "error") })} />
                  </td>
                </tr>
              ))}
              {query.data.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="text-ink-soft">
                    None yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit" : "New"}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={crud.create.isPending || crud.update.isPending}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {form(editing, (p) => setEditing((x) => (x ? { ...x, ...p } : x)))}
          </form>
        )}
      </Modal>
    </>
  );
}

export function Extras() {
  const q = useAdminExtras();
  const crud = useCrud<Extra>("extras", "/admin/extras");
  const { fmt } = useCurrency();
  return (
    <CrudPage<Extra>
      title="Extras"
      intro="Add-ons offered during booking: child seats, airport pickup, early check-in…"
      query={q}
      crud={crud}
      label={(r) => r.name}
      columns={[
        { h: "Name", cell: (r) => <b>{r.name}</b> },
        { h: "Code", cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { h: "Service", cell: (r) => r.service },
        { h: "Price", cell: (r) => fmt(r.priceTzs) },
        { h: "Pricing", cell: (r) => r.pricing.replace("_", " ") },
        { h: "Active", cell: (r) => (r.active ? "Yes" : "No") },
      ]}
      empty={{ service: "car", code: "", name: "", description: "", priceTzs: 0, pricing: "per_booking", active: true }}
      form={(v, set) => (
        <>
          <Input label="Name" required value={v.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label="Code" required value={v.code} onChange={(e) => set({ code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} hint="Short unique id, e.g. child_seat" />
          <Textarea label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Service" value={v.service} onChange={(e) => set({ service: e.target.value as Extra["service"] })} options={[{ value: "car", label: "Car" }, { value: "stay", label: "Stay" }, { value: "both", label: "Both" }]} />
            <Input label="Price (TZS)" type="number" min={0} value={numInput(v.priceTzs)} onChange={(e) => set({ priceTzs: toNum(e.target.value) })} />
            <Select label="Pricing" value={v.pricing} onChange={(e) => set({ pricing: e.target.value as Extra["pricing"] })} options={[{ value: "per_booking", label: "Per booking" }, { value: "per_day", label: "Per day/night" }]} />
          </div>
          <Checkbox label="Active" checked={v.active} onChange={(e) => set({ active: e.target.checked })} />
        </>
      )}
    />
  );
}

export function Zones() {
  const q = useAdminZones();
  const crud = useCrud<DeliveryZone>("delivery-zones", "/admin/delivery-zones");
  const { fmt } = useCurrency();
  return (
    <CrudPage<DeliveryZone>
      title="Delivery zones"
      intro="Fee per leg for delivering or collecting a car at a custom address."
      query={q}
      crud={crud}
      label={(r) => r.name}
      columns={[
        { h: "Zone", cell: (r) => <b>{r.name}</b> },
        { h: "Fee per leg", cell: (r) => fmt(r.feeTzs) },
        { h: "Active", cell: (r) => (r.active ? "Yes" : "No") },
      ]}
      empty={{ name: "", feeTzs: 0, active: true }}
      form={(v, set) => (
        <>
          <Input label="Zone name" required value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="Masaki / Oyster Bay" />
          <Input label="Fee (TZS)" type="number" min={0} value={numInput(v.feeTzs)} onChange={(e) => set({ feeTzs: toNum(e.target.value) })} />
          <Checkbox label="Active" checked={v.active} onChange={(e) => set({ active: e.target.checked })} />
        </>
      )}
    />
  );
}

export function Promos() {
  const q = useAdminPromos();
  const crud = useCrud<PromoCode>("promo-codes", "/admin/promo-codes");
  const { fmt } = useCurrency();
  return (
    <CrudPage<PromoCode>
      title="Promo codes"
      intro="Percent or fixed-amount discounts. Uses are counted when a booking is created."
      query={q}
      crud={crud}
      label={(r) => r.code}
      columns={[
        { h: "Code", cell: (r) => <span className="font-mono font-bold">{r.code}</span> },
        { h: "Discount", cell: (r) => (r.type === "percent" ? `${r.value}%` : fmt(r.value)) },
        { h: "Service", cell: (r) => r.service },
        { h: "Valid", cell: (r) => `${r.validFrom ?? "…"} → ${r.validTo ?? "…"}` },
        { h: "Uses", cell: (r) => `${r.uses}${r.maxUses ? ` / ${r.maxUses}` : ""}` },
        { h: "Active", cell: (r) => (r.active ? "Yes" : "No") },
      ]}
      empty={{ code: "", type: "percent", value: 10, service: "both", validFrom: null, validTo: null, maxUses: null, uses: 0, active: true }}
      form={(v, set) => (
        <>
          <Input label="Code" required value={v.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Type" value={v.type} onChange={(e) => set({ type: e.target.value as PromoCode["type"] })} options={[{ value: "percent", label: "Percent" }, { value: "fixed", label: "Fixed TZS" }]} />
            <Input label="Value" type="number" min={0} value={numInput(v.value)} onChange={(e) => set({ value: toNum(e.target.value) })} />
            <Select label="Service" value={v.service} onChange={(e) => set({ service: e.target.value as PromoCode["service"] })} options={[{ value: "both", label: "Both" }, { value: "car", label: "Car" }, { value: "stay", label: "Stay" }]} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Valid from" type="date" value={v.validFrom ?? ""} onChange={(e) => set({ validFrom: e.target.value || null })} />
            <Input label="Valid to" type="date" value={v.validTo ?? ""} onChange={(e) => set({ validTo: e.target.value || null })} />
            <Input label="Max uses" type="number" min={0} value={numInput(v.maxUses)} onChange={(e) => set({ maxUses: toNumOrNull(e.target.value) })} hint="Blank = unlimited" />
          </div>
          <Checkbox label="Active" checked={v.active} onChange={(e) => set({ active: e.target.checked })} />
        </>
      )}
    />
  );
}

export function Reviews() {
  const q = useAdminReviews();
  const crud = useCrud<Review>("reviews", "/admin/reviews");
  const { toast } = useToast();
  const pending = q.data?.filter((r) => !r.approved).length ?? 0;
  return (
    <CrudPage<Review>
      title="Customer reviews"
      intro={`Reviews sent from the website wait here until you approve them${pending ? ` — ${pending} waiting` : ""}. You can also add reviews customers sent on WhatsApp, Instagram or Google (with their permission).`}
      query={q}
      crud={crud}
      label={(r) => `the review by ${r.name}`}
      columns={[
        {
          h: "Status",
          cell: (r) =>
            r.approved ? (
              <span className="font-bold text-ok">Published</span>
            ) : (
              <Button size="sm" onClick={() => crud.update.mutate({ id: r.id, approved: true }, { onSuccess: () => toast("Review published", "ok"), onError: (e) => toast(errorMessage(e), "error") })}>
                Approve
              </Button>
            ),
        },
        { h: "Rating", cell: (r) => <span className="text-spark">{"★".repeat(r.rating)}</span> },
        { h: "Name", cell: (r) => <><b>{r.name}</b>{r.location && <span className="block text-xs text-ink-soft">{r.location}</span>}</> },
        { h: "Service", cell: (r) => r.service },
        { h: "Review", cell: (r) => <span className="line-clamp-3 max-w-md">{r.comment}</span> },
        { h: "Date", cell: (r) => new Date(r.createdAt).toLocaleDateString("en-GB") },
      ]}
      empty={{ name: "", location: "", service: "car", rating: 5, comment: "", approved: true, createdAt: "" }}
      form={(v, set) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Customer name" required value={v.name} onChange={(e) => set({ name: e.target.value })} />
            <Input label="Location" value={v.location} onChange={(e) => set({ location: e.target.value })} placeholder="Arusha" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Service" value={v.service} onChange={(e) => set({ service: e.target.value as Review["service"] })} options={[{ value: "car", label: "Car hire" }, { value: "stay", label: "Short stay" }, { value: "general", label: "General" }]} />
            <Select label="Rating" value={String(v.rating)} onChange={(e) => set({ rating: Number(e.target.value) })} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) }))} />
          </div>
          <Textarea label="Review" required value={v.comment} onChange={(e) => set({ comment: e.target.value })} hint="Exactly as the customer wrote it." />
          <Checkbox label="Published on the website" checked={v.approved} onChange={(e) => set({ approved: e.target.checked })} />
        </>
      )}
    />
  );
}
