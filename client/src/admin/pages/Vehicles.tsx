import { useState } from "react";
import type { Vehicle } from "@bluesparks/shared";
import { useAdminVehicles, useCrud } from "../api";
import { PageHead, ConfirmButton, ImageList, ListEditor, numInput, toNum, toNumOrNull } from "../components";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, Skeleton } from "@/components/States";
import { errorMessage } from "@/lib/api";
import { useCurrency } from "@/lib/currency";

const EMPTY: Omit<Vehicle, "id"> = { slug: "", name: "", category: "SUV", seats: 5, bags: 3, transmission: "automatic", drive: "4WD", fuel: "Diesel", features: [], images: [], pricePerDayTzs: 0, pricePerWeekTzs: null, pricePerMonthTzs: null, mileagePolicy: "Unlimited within Dar es Salaam; 250 km/day upcountry, TZS 500 per extra km.", depositTzs: 0, description: "", active: true };

export default function Vehicles() {
  const q = useAdminVehicles();
  const crud = useCrud<Vehicle>("vehicles", "/admin/vehicles");
  const { toast } = useToast();
  const { fmt } = useCurrency();
  const [editing, setEditing] = useState<(Omit<Vehicle, "id"> & { id?: number }) | null>(null);

  const save = async () => {
    if (!editing) return;
    try {
      const body = { ...editing, slug: editing.slug || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") };
      if (editing.id) await crud.update.mutateAsync({ ...body, id: editing.id });
      else await crud.create.mutateAsync(body);
      toast("Saved", "ok");
      setEditing(null);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const set = (p: Partial<Vehicle>) => setEditing((e) => (e ? { ...e, ...p } : e));

  return (
    <>
      <PageHead
        title="Vehicles"
        actions={
          <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
            + New vehicle
          </Button>
        }
      >
        {q.data?.length ?? "…"} in the fleet
      </PageHead>
      {q.isPending && <Skeleton className="h-40" />}
      {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.data && (
        <div className="table-wrap border-2 border-line bg-white">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Category</th>
                <th>Seats</th>
                <th>Day</th>
                <th>Week</th>
                <th>Month</th>
                <th>Deposit</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((v) => (
                <tr key={v.id}>
                  <td className="flex items-center gap-2">
                    {v.images[0] && <img src={v.images[0]} alt="" width="56" height="38" className="h-9 w-14 object-cover" loading="lazy" />}
                    <span>
                      <b>{v.name}</b>
                      <span className="block text-xs text-ink-soft">/{v.slug}</span>
                    </span>
                  </td>
                  <td>{v.category}</td>
                  <td>{v.seats}</td>
                  <td className="tabular">{fmt(v.pricePerDayTzs)}</td>
                  <td className="tabular">{v.pricePerWeekTzs ? fmt(v.pricePerWeekTzs) : "—"}</td>
                  <td className="tabular">{v.pricePerMonthTzs ? fmt(v.pricePerMonthTzs) : "—"}</td>
                  <td className="tabular">{fmt(v.depositTzs)}</td>
                  <td>{v.active ? "Yes" : "No"}</td>
                  <td className="whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ ...v })}>
                      Edit
                    </Button>{" "}
                    <ConfirmButton label="Delete" title={`Delete ${v.name}?`} body="Existing bookings keep their record; the car disappears from the site." onConfirm={() => crud.remove.mutate(v.id, { onError: (e) => toast(errorMessage(e), "error") })} />
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
        title={editing?.id ? `Edit ${editing.name}` : "New vehicle"}
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
            <Input label="Slug" value={editing.slug} onChange={(e) => set({ slug: e.target.value })} hint="Leave blank to generate from the name." />
            <Input label="Category" value={editing.category} onChange={(e) => set({ category: e.target.value })} placeholder="SUV, Van, Hatchback, Pickup" />
            <Input label="Fuel" value={editing.fuel} onChange={(e) => set({ fuel: e.target.value })} />
            <Input label="Seats" type="number" min={1} value={numInput(editing.seats)} onChange={(e) => set({ seats: toNum(e.target.value) })} />
            <Input label="Bags" type="number" min={0} value={numInput(editing.bags)} onChange={(e) => set({ bags: toNum(e.target.value) })} />
            <Select label="Transmission" value={editing.transmission} onChange={(e) => set({ transmission: e.target.value as Vehicle["transmission"] })} options={[{ value: "automatic", label: "Automatic" }, { value: "manual", label: "Manual" }]} />
            <Select label="Drive" value={editing.drive} onChange={(e) => set({ drive: e.target.value as Vehicle["drive"] })} options={[{ value: "2WD", label: "2WD" }, { value: "4WD", label: "4WD" }]} />
            <Input label="Price per day (TZS)" type="number" min={0} required value={numInput(editing.pricePerDayTzs)} onChange={(e) => set({ pricePerDayTzs: toNum(e.target.value) })} />
            <Input label="Deposit (TZS)" type="number" min={0} value={numInput(editing.depositTzs)} onChange={(e) => set({ depositTzs: toNum(e.target.value) })} />
            <Input label="Price per week (TZS, optional)" type="number" min={0} value={numInput(editing.pricePerWeekTzs)} onChange={(e) => set({ pricePerWeekTzs: toNumOrNull(e.target.value) })} />
            <Input label="Price per month (TZS, optional)" type="number" min={0} value={numInput(editing.pricePerMonthTzs)} onChange={(e) => set({ pricePerMonthTzs: toNumOrNull(e.target.value) })} />
            <Textarea label="Description" className="sm:col-span-2" value={editing.description} onChange={(e) => set({ description: e.target.value })} />
            <Textarea label="Mileage policy" className="sm:col-span-2" value={editing.mileagePolicy} onChange={(e) => set({ mileagePolicy: e.target.value })} />
            <div className="sm:col-span-2">
              <ListEditor label="Features" value={editing.features} onChange={(features) => set({ features })} placeholder={"Air conditioning\nBluetooth\nRoof rack"} />
            </div>
            <div className="sm:col-span-2">
              <ImageList images={editing.images} onChange={(images) => set({ images })} />
            </div>
            <Checkbox label="Active (shown on the site)" checked={editing.active} onChange={(e) => set({ active: e.target.checked })} />
          </form>
        )}
      </Modal>
    </>
  );
}
