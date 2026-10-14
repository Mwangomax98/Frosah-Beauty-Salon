import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Settings, SiteImageKey, SiteImages } from "@bluesparks/shared";
import { useAdminSettings } from "../api";
import { PageHead } from "../components";
import { IMAGES } from "@/content/images";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, Skeleton } from "@/components/States";
import { api, apiUrl, errorMessage, uploadWithProgress } from "@/lib/api";

const SLOTS: { key: SiteImageKey; label: string; hint: string; fallback: string }[] = [
  { key: "heroDar", label: "Hero background — Dar es Salaam skyline or coast", hint: "Wide landscape, at least 1600 px wide. Shown faded behind the headline.", fallback: IMAGES.heroDar },
  { key: "heroCar", label: "Hero car — cut-out of a Johnson Rentals car", hint: "PNG with a transparent background, side view, facing right. Drives across the headline on scroll.", fallback: IMAGES.heroCar },
  { key: "heroStay", label: "Hero stay — apartment balcony or interior", hint: "Landscape. Revealed as the guest scrolls.", fallback: IMAGES.heroStay },
  { key: "airport", label: "Home — JNIA arrivals", hint: "Landscape 4:3.", fallback: IMAGES.airport },
  { key: "street", label: "Home — a Dar street or market", hint: "Landscape 16:10.", fallback: IMAGES.street },
  { key: "about1", label: "About — handing over the keys", hint: "Landscape 4:3.", fallback: IMAGES.about1 },
  { key: "about2", label: "About — Coco Beach at dusk", hint: "Landscape.", fallback: IMAGES.about2 },
];

export default function Photos() {
  const q = useAdminSettings();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [images, setImages] = useState<SiteImages>({});
  const [busy, setBusy] = useState<Partial<Record<SiteImageKey, number>>>({});
  useEffect(() => {
    if (q.data) setImages(q.data.siteImages ?? {});
  }, [q.data]);

  const save = useMutation({
    mutationFn: (siteImages: SiteImages) => api.put<Settings>("/admin/settings", { ...q.data!, siteImages }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast("Photos saved", "ok");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const upload = async (key: SiteImageKey, file: File | undefined) => {
    if (!file) return;
    const form = new FormData();
    form.append("image", file);
    setBusy((b) => ({ ...b, [key]: 0 }));
    try {
      const res = await uploadWithProgress<{ url: string }>("/admin/uploads/image", form, (pct) => setBusy((b) => ({ ...b, [key]: pct })));
      const next = { ...images, [key]: res.url };
      setImages(next);
      save.mutate(next);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy((b) => ({ ...b, [key]: undefined }));
    }
  };

  const reset = (key: SiteImageKey) => {
    const next = { ...images };
    delete next[key];
    setImages(next);
    save.mutate(next);
  };

  return (
    <>
      <PageHead title="Site photos">Replace the placeholder pictures on the home and About pages. Car and apartment photos are edited under Vehicles and Properties. JPEG, PNG or WebP up to 5 MB; we resize and convert automatically.</PageHead>
      {q.isPending && <Skeleton className="h-64" />}
      {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.data && (
        <ul className="grid max-w-5xl gap-4 sm:grid-cols-2">
          {SLOTS.map((slot) => {
            const custom = images[slot.key];
            const src = custom ? apiUrl(custom) : slot.fallback;
            const pct = busy[slot.key];
            return (
              <li key={slot.key} className="border-2 border-line bg-white p-4">
                <div className="aspect-[16/10] w-full overflow-hidden bg-cream">
                  <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />
                </div>
                <h2 className="mt-3 font-sans text-base font-bold normal-case tracking-normal text-ink">{slot.label}</h2>
                <p className="text-xs text-ink-soft">{slot.hint}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-soft">{custom ? "Your photo" : "Placeholder"}</p>
                {pct !== undefined && (
                  <div className="mt-2 h-1.5 w-full bg-cream" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                    <div className="h-full bg-spark" style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="btn-primary btn-sm cursor-pointer">
                    {custom ? "Replace photo" : "Upload photo"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pct !== undefined} onChange={(e) => upload(slot.key, e.target.files?.[0])} />
                  </label>
                  {custom && (
                    <Button variant="ghost" size="sm" onClick={() => reset(slot.key)} disabled={save.isPending}>
                      Back to placeholder
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
