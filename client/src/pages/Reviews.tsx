import { useState } from "react";
import type { ReviewService } from "@bluesparks/shared";
import { useReviews, useSettings, FALLBACK_SETTINGS } from "@/lib/queries";
import { useSeo } from "@/lib/useSeo";
import { ReviewCard, ReviewForm, RatingSummary } from "@/components/Reviews";
import { Skeleton, ErrorState, EmptyState } from "@/components/States";
import { KangaDivider } from "@/components/KangaDivider";
import { businessJsonLd } from "@/lib/seoData";

export default function Reviews() {
  const [service, setService] = useState<ReviewService | "">("");
  const q = useReviews({ service: service || undefined, limit: 60 });
  const all = useReviews({ limit: 1 });
  const { data } = useSettings();
  const s = data ?? FALLBACK_SETTINGS;
  useSeo({
    title: "Customer reviews",
    description: "Reviews from Blue Spark customers: car hire (self drive and with driver) and short stays in Dar es Salaam.",
    jsonLd: all.data ? businessJsonLd({ phone: s.businessPhone, whatsapp: s.businessWhatsapp, address: s.businessAddress, instagram: s.instagramUrl, rating: all.data.summary }) : undefined,
  });

  return (
    <>
      <section className="bg-cream">
        <div className="container-x flex flex-wrap items-end justify-between gap-6 py-12 lg:py-16">
          <div>
            <p className="eyebrow">Maoni ya wateja</p>
            <h1 className="mt-2 text-6xl sm:text-7xl">Reviews.</h1>
            <p className="mt-4 max-w-xl text-ink-soft">Every review here comes from a customer and is checked by our team before it is published. We never edit what you say.</p>
          </div>
          {all.data && <RatingSummary summary={all.data.summary} />}
        </div>
        <KangaDivider />
      </section>

      <section className="container-x grid gap-10 py-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div role="group" aria-label="Filter reviews" className="flex flex-wrap gap-2">
            {(
              [
                ["", "All"],
                ["car", "Car hire"],
                ["stay", "Short stays"],
              ] as const
            ).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={service === v} onClick={() => setService(v)} className={`btn-sm ${service === v ? "btn-brand" : "btn-ghost"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {q.isPending && [1, 2, 3, 4].map((k) => <Skeleton key={k} className="h-48" />)}
            {q.isError && (
              <div className="sm:col-span-2">
                <ErrorState error={q.error} retry={() => q.refetch()} />
              </div>
            )}
            {q.data?.reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
            {q.data?.reviews.length === 0 && (
              <div className="sm:col-span-2">
                <EmptyState title="No reviews here yet">Be the first — the form is right there.</EmptyState>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <ReviewForm />
          </div>
        </div>
      </section>
    </>
  );
}
