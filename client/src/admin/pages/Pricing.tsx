import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SeasonalRate, Service, Settings } from "@bluesparks/shared";
import { useAdminProperties, useAdminRates, useAdminSettings, useAdminVehicles, useCrud } from "../api";
import { PageHead, ConfirmButton, numInput, toNum } from "../components";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, Skeleton } from "@/components/States";
import { api, errorMessage } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { fmtDate } from "@/lib/format";

export default function Pricing() {
  const rates = useAdminRates();
  const vehicles = useAdminVehicles();
  const properties = useAdminProperties();
  const settings = useAdminSettings();
  const crud = useCrud<SeasonalRate>("seasonal-rates", "/admin/seasonal-rates");
  const { toast } = useToast();
  const { fmt } = useCurrency();
  const qc = useQueryClient();
  const [targetType, setTargetType] = useState<Service>("car");

  const items = targetType === "car" ? vehicles.data ?? [] : properties.data ?? [];
  const nameOf = (r: SeasonalRate) => (r.targetType === "car" ? vehicles.data : properties.data)?.find((i) => i.id === r.targetId)?.name ?? `#${r.targetId}`;

  const addRate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    crud.create.mutate(
      { targetType, targetId: Number(f.get("targetId")), name: String(f.get("name")), startDate: String(f.get("startDate")), endDate: String(f.get("endDate")), priceTzs: Number(f.get("priceTzs")) },
      {
        onSuccess: () => {
          toast("Seasonal rate added", "ok");
          form.reset();
        },
        onError: (err) => toast(errorMessage(err), "error"),
      },
    );
  };

  const [fees, setFees] = useState<Partial<Settings> | null>(null);
  const s = fees ?? settings.data;
  const saveFees = useMutation({
    mutationFn: (body: Settings) => api.put<Settings>("/admin/settings", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      setFees(null);
      toast("Saved", "ok");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <>
      <PageHead title="Pricing">Seasonal rates override the base price per day/night for the dates given. Driver fees, bundle discount and the USD rate are site-wide.</PageHead>

      <section className="grid gap-4 border-2 border-line bg-white p-4 sm:grid-cols-4">
        <h2 className="text-xl sm:col-span-4">Site-wide rates</h2>
        {settings.isPending && <Skeleton className="h-10 sm:col-span-4" />}
        {settings.isError && <ErrorState error={settings.error} compact />}
        {s && (
          <>
            <Input label="Driver fee, Dar (TZS/day)" type="number" min={0} value={numInput(s.driverFeeDarTzs)} onChange={(e) => setFees({ ...settings.data, ...fees, driverFeeDarTzs: toNum(e.target.value) })} />
            <Input label="Driver fee, upcountry (TZS/day)" type="number" min={0} value={numInput(s.driverFeeUpcountryTzs)} onChange={(e) => setFees({ ...settings.data, ...fees, driverFeeUpcountryTzs: toNum(e.target.value) })} />
            <Input label="Bundle discount (%)" type="number" min={0} max={100} value={numInput(s.bundleDiscountPercent)} onChange={(e) => setFees({ ...settings.data, ...fees, bundleDiscountPercent: toNum(e.target.value) })} />
            <Input label="USD rate (TZS per $1)" type="number" min={1} value={numInput(s.usdRate)} onChange={(e) => setFees({ ...settings.data, ...fees, usdRate: toNum(e.target.value) })} />
            <div className="sm:col-span-4">
              <Button size="sm" disabled={!fees} loading={saveFees.isPending} onClick={() => settings.data && saveFees.mutate({ ...settings.data, ...fees })}>
                Save rates
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Seasonal rates</h2>
        <form onSubmit={addRate} className="mt-3 grid gap-3 border-2 border-line bg-white p-4 sm:grid-cols-6">
          <Select label="Service" value={targetType} onChange={(e) => setTargetType(e.target.value as Service)} options={[{ value: "car", label: "Vehicle" }, { value: "stay", label: "Property" }]} />
          <Select label="Item" name="targetId" required placeholder="Choose…" options={items.map((i) => ({ value: String(i.id), label: i.name }))} />
          <Input label="Season name" name="name" required placeholder="Christmas" />
          <Input label="From" name="startDate" type="date" required />
          <Input label="To (inclusive)" name="endDate" type="date" required />
          <Input label="Price (TZS/day)" name="priceTzs" type="number" min={0} required />
          <div className="sm:col-span-6">
            <Button type="submit" size="sm" variant="brand" loading={crud.create.isPending}>
              + Add seasonal rate
            </Button>
          </div>
        </form>
        <div className="table-wrap mt-4 border-2 border-line bg-white">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Service</th>
                <th>Item</th>
                <th>Season</th>
                <th>Dates</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rates.isPending && (
                <tr>
                  <td colSpan={6}>
                    <Skeleton className="h-8" />
                  </td>
                </tr>
              )}
              {rates.data?.map((r) => (
                <tr key={r.id}>
                  <td className="uppercase">{r.targetType}</td>
                  <td>{nameOf(r)}</td>
                  <td>{r.name}</td>
                  <td className="whitespace-nowrap">
                    {fmtDate(r.startDate, { weekday: false })} → {fmtDate(r.endDate, { weekday: false })}
                  </td>
                  <td className="tabular">{fmt(r.priceTzs)}</td>
                  <td>
                    <ConfirmButton label="Delete" title="Delete this seasonal rate?" onConfirm={() => crud.remove.mutate(r.id)} />
                  </td>
                </tr>
              ))}
              {rates.data?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-ink-soft">
                    No seasonal rates yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
