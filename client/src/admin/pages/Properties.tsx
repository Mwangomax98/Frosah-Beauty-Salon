import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Property } from "@bluesparks/shared";
import { AMENITIES, AMENITY_LABELS, STAY_AREAS } from "@bluesparks/shared";
import { useAdminProperties, useCrud, type AdminProperty } from "../api";
import { PageHead, ConfirmButton, ImageList, ListEditor, CheckGrid, numInput, toNum, toNumOrNull } from "../components";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, Skeleton } from "@/components/States";
import { api, errorMessage } from "@/lib/api";
import { useCurrency } from "@/lib/currency";

const EMPTY: Omit<AdminProperty, "id"> = { slug: "", name: "", area: "Masaki", address: "", lat: null, lng: null, bedrooms: 1, beds: 1, bathrooms: 1, maxGuests: 2, amenities: ["wifi", "ac", "generator"], houseRules: "No smoking indoors. No parties. Quiet after 22:00. Visitors until 22:00.", description: "", images: [], pricePerNightTzs: 0, pricePerWeekTzs: null, pricePerMonthTzs: null, cleaningFeeTzs: 0, minNights: 1, paymentMode: "deposit", depositPercent: 30, checkinInstructions: "", icalImportUrls: [], active: true };

export default function Properties() {
  const q = useAdminProperties();
  const crud = useCrud<AdminProperty>("properties", "/admin/properties");
  const { toast } = useToast();
  const { fmt } = useCurrency();
  const [editing, setEditing] = useState<(Omit<AdminProperty, "id"> & { id?: number }) | null>(null);
  const sync = useMutation({
    mutationFn: (id: number) => api.post<{ imported: number; removed?: number; errors?: string[] }>(`/admin/properties/${id}/ical-sync`),
    onSuccess: (r) => toast(`Synced: ${r.imported} imported${r.removed ? `, ${r.removed} removed` : ""}${r.errors?.length ? `, ${r.errors.length} error(s)` : ""}`, r.errors?.length ? "error" : "ok"),
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const save = async () => {
    if (!editing) return;
    try {
      const { icalExportUrl: _x, icalToken: _t, ...rest } = editing as typeof editing & { icalToken?: string };
      void _x;
      void _t;
      const body = { ...rest, slug: rest.slug || rest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") };
      if (editing.id) await crud.update.mutateAsync({ ...body, id: editing.id });
      else await crud.create.mutateAsync(body);
      toast("Saved", "ok");
      setEditing(null);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const set = (p: Partial<Property>) => setEditing((e) => (e ? { ...e, ...p } : e));

  return (
    <>
      <PageHead
        title="Properties"
        actions={
          <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
            + New property
          </Button>
        }
      >
        {q.data?.length ?? "…"} listed
      </PageHead>
      {q.isPending && <Skeleton className="h-40" />}
      {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.data && (
        <div className="table-wrap border-2 border-line bg-white">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Property</th>
                <th>Area</th>
                <th>Sleeps</th>
                <th>Night</th>
                <th>Cleaning</th>
                <th>Min</th>
                <th>Payment</th>
                <th>iCal</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id}>
                  <td className="flex items-center gap-2">
                    {p.images[0] && <img src={p.images[0]} alt="" width="56" height="42" className="h-10 w-14 object-cover" loading="lazy" />}
                    <span>
                      <b>{p.name}</b>
                      <span className="block text-xs text-ink-soft">/{p.slug}</span>
                    </span>
                  </td>
                  <td>{p.area}</td>
                  <td>{p.maxGuests}</td>
                  <td className="tabular">{fmt(p.pricePerNightTzs)}</td>
                  <td className="tabular">{fmt(p.cleaningFeeTzs)}</td>
                  <td>{p.minNights}n</td>
                  <td>{p.paymentMode === "deposit" ? `${p.depositPercent}% deposit` : p.paymentMode.replace("_", " ")}</td>
                  <td>
                    {p.icalImportUrls?.length ?? 0} feeds{" "}
                    <Button variant="ghost" size="sm" onClick={() => sync.mutate(p.id)} loading={sync.isPending && sync.variables === p.id}>
                      Sync now
                    </Button>
                  </td>
                  <td>{p.active ? "Yes" : "No"}</td>
                  <td className="whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ ...p })}>
                      Edit
                    </Button>{" "}
                    <ConfirmButton label="Delete" title={`Delete ${p.name}?`} onConfirm={() => crud.remove.mutate(p.id, { onError: (e) => toast(errorMessage(e), "error") })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.name}` : "New property"}
        wide
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
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Input label="Name" required value={editing.name} onChange={(e) => set({ name: e.target.value })} />
            <Input label="Slug" value={editing.slug} onChange={(e) => set({ slug: e.target.value })} hint="Leave blank to generate." />
            <Select label="Area" value={editing.area} onChange={(e) => set({ area: e.target.value })} options={STAY_AREAS.map((a) => ({ value: a, label: a }))} />
            <Input label="Address" value={editing.address} onChange={(e) => set({ address: e.target.value })} />
            <Input label="Latitude" type="number" step="any" value={numInput(editing.lat)} onChange={(e) => set({ lat: toNumOrNull(e.target.value) })} hint="e.g. -6.7556" />
            <Input label="Longitude" type="number" step="any" value={numInput(editing.lng)} onChange={(e) => set({ lng: toNumOrNull(e.target.value) })} hint="e.g. 39.2765" />
            <div className="grid grid-cols-4 gap-2 sm:col-span-2">
              <Input label="Bedrooms" type="number" min={0} value={numInput(editing.bedrooms)} onChange={(e) => set({ bedrooms: toNum(e.target.value) })} />
              <Input label="Beds" type="number" min={0} value={numInput(editing.beds)} onChange={(e) => set({ beds: toNum(e.target.value) })} />
              <Input label="Bathrooms" type="number" min={0} value={numInput(editing.bathrooms)} onChange={(e) => set({ bathrooms: toNum(e.target.value) })} />
              <Input label="Max guests" type="number" min={1} value={numInput(editing.maxGuests)} onChange={(e) => set({ maxGuests: toNum(e.target.value) })} />
            </div>
            <Input label="Price per night (TZS)" type="number" min={0} required value={numInput(editing.pricePerNightTzs)} onChange={(e) => set({ pricePerNightTzs: toNum(e.target.value) })} />
            <Input label="Cleaning fee (TZS)" type="number" min={0} value={numInput(editing.cleaningFeeTzs)} onChange={(e) => set({ cleaningFeeTzs: toNum(e.target.value) })} />
            <Input label="Per week (TZS, optional)" type="number" min={0} value={numInput(editing.pricePerWeekTzs)} onChange={(e) => set({ pricePerWeekTzs: toNumOrNull(e.target.value) })} />
            <Input label="Per month (TZS, optional)" type="number" min={0} value={numInput(editing.pricePerMonthTzs)} onChange={(e) => set({ pricePerMonthTzs: toNumOrNull(e.target.value) })} />
            <Input label="Minimum nights" type="number" min={1} value={numInput(editing.minNights)} onChange={(e) => set({ minNights: toNum(e.target.value) })} />
            <div className="grid grid-cols-2 gap-2">
              <Select label="Payment mode" value={editing.paymentMode} onChange={(e) => set({ paymentMode: e.target.value as Property["paymentMode"] })} options={[{ value: "full_online", label: "Full online" }, { value: "deposit", label: "Deposit" }, { value: "on_arrival", label: "On arrival" }]} />
              <Input label="Deposit %" type="number" min={0} max={100} value={numInput(editing.depositPercent)} onChange={(e) => set({ depositPercent: toNum(e.target.value) })} disabled={editing.paymentMode !== "deposit"} />
            </div>
            <Textarea label="Description" className="sm:col-span-2" value={editing.description} onChange={(e) => set({ description: e.target.value })} />
            <Textarea label="House rules" className="sm:col-span-2" value={editing.houseRules} onChange={(e) => set({ houseRules: e.target.value })} />
            <Textarea label="Check-in instructions" className="sm:col-span-2" value={editing.checkinInstructions} onChange={(e) => set({ checkinInstructions: e.target.value })} hint="Sent to the guest after confirmation: gate code, caretaker's name, Wi-Fi." />
            <div className="sm:col-span-2">
              <CheckGrid label="Amenities" options={AMENITIES} value={editing.amenities} onChange={(amenities) => set({ amenities })} labels={AMENITY_LABELS} />
            </div>
            <div className="sm:col-span-2">
              <ImageList images={editing.images} onChange={(images) => set({ images })} />
            </div>
            <div className="sm:col-span-2">
              <ListEditor label="iCal import URLs (Airbnb, Booking.com)" value={editing.icalImportUrls} onChange={(icalImportUrls) => set({ icalImportUrls })} placeholder="https://www.airbnb.com/calendar/ical/…" hint="One per line. Synced every 30 minutes and on 'Sync now'." />
            </div>
            {editing.icalExportUrl && (
              <div className="sm:col-span-2">
                <span className="label">iCal export URL (paste into Airbnb / Booking.com)</span>
                <div className="flex gap-2">
                  <input readOnly className="field font-mono text-xs" value={editing.icalExportUrl} aria-label="iCal export URL" onFocus={(e) => e.target.select()} />
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(editing.icalExportUrl!).then(() => toast("Copied", "ok"))}>
                    Copy
                  </Button>
                </div>
              </div>
            )}
            <Checkbox label="Active (shown on the site)" checked={editing.active} onChange={(e) => set({ active: e.target.checked })} />
          </form>
        )}
      </Modal>
    </>
  );
}
