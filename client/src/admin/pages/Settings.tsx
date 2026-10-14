import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Settings as S } from "@bluesparks/shared";
import { useAdminSettings } from "../api";
import { PageHead, numInput, toNum } from "../components";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, Skeleton } from "@/components/States";
import { api, errorMessage, ApiError } from "@/lib/api";

export default function Settings() {
  const q = useAdminSettings();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState<S | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data) setF(q.data);
  }, [q.data]);
  const save = useMutation({
    mutationFn: (body: S) => api.put<S>("/admin/settings", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      setErrors({});
      toast("Settings saved", "ok");
    },
    onError: (e) => {
      if (e instanceof ApiError) setErrors(e.fields);
      toast(errorMessage(e), "error");
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (f) save.mutate({ ...f, businessWhatsapp: f.businessWhatsapp.replace(/[^0-9]/g, "") });
  };
  const set = (k: keyof S, v: string | number) => setF((x) => (x ? { ...x, [k]: v } : x));

  return (
    <>
      <PageHead title="Settings">Contact details shown on the site, where booking emails go, and the BnB brand name.</PageHead>
      {q.isPending && <Skeleton className="h-64" />}
      {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {f && (
        <form onSubmit={submit} className="grid max-w-3xl gap-4 border-2 border-line bg-white p-5 sm:grid-cols-2">
          <Input label="BnB brand name" required value={f.bnbBrandName} onChange={(e) => set("bnbBrandName", e.target.value)} hint="Shown everywhere the stays brand appears." error={errors.bnbBrandName} className="sm:col-span-2" />
          <Input label="Business WhatsApp (digits only, e.g. 2557XXXXXXXX)" required inputMode="numeric" value={f.businessWhatsapp} onChange={(e) => set("businessWhatsapp", e.target.value.replace(/[^0-9]/g, ""))} error={errors.businessWhatsapp} />
          <Input label="Business phone (shown on site)" required value={f.businessPhone} onChange={(e) => set("businessPhone", e.target.value)} error={errors.businessPhone} />
          <Input label="Vendor email (receives booking notifications)" type="email" required value={f.vendorEmail} onChange={(e) => set("vendorEmail", e.target.value)} error={errors.vendorEmail} />
          <Input label="Public email (shown on site)" type="email" required value={f.businessEmail} onChange={(e) => set("businessEmail", e.target.value)} error={errors.businessEmail} />
          <Input label="Address" required value={f.businessAddress} onChange={(e) => set("businessAddress", e.target.value)} error={errors.businessAddress} className="sm:col-span-2" />
          <Input label="USD rate (TZS per $1)" type="number" min={1} value={numInput(f.usdRate)} onChange={(e) => set("usdRate", toNum(e.target.value))} error={errors.usdRate} />
          <Input label="Bundle discount (%)" type="number" min={0} max={100} value={numInput(f.bundleDiscountPercent)} onChange={(e) => set("bundleDiscountPercent", toNum(e.target.value))} error={errors.bundleDiscountPercent} />
          <Input label="Driver fee, Dar (TZS/day)" type="number" min={0} value={numInput(f.driverFeeDarTzs)} onChange={(e) => set("driverFeeDarTzs", toNum(e.target.value))} />
          <Input label="Driver fee, upcountry (TZS/day)" type="number" min={0} value={numInput(f.driverFeeUpcountryTzs)} onChange={(e) => set("driverFeeUpcountryTzs", toNum(e.target.value))} />
          <div className="sm:col-span-2">
            <Button type="submit" loading={save.isPending}>
              Save settings
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
