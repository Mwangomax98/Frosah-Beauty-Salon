import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { Review, ReviewService, ReviewSummary } from "@bluesparks/shared";
import { api, errorMessage } from "@/lib/api";
import { useReviews } from "@/lib/queries";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/States";
import { flatten, type FieldErrors } from "@/pages/book/schemas";

const SERVICE_LABEL: Record<ReviewService, string> = { car: "Car hire", stay: "Short stay", general: "Blue Spark" };

export function Stars({ value, size = "text-xl" }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <span className={`${size} leading-none tracking-tight text-spark`} role="img" aria-label={`${value} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function ReviewCard({ r }: { r: Review }) {
  return (
    <figure className="flex h-full flex-col border-2 border-brand bg-white p-5">
      <Stars value={r.rating} />
      <blockquote className="mt-3 flex-1 text-[17px]">“{r.comment}”</blockquote>
      <figcaption className="mt-4 text-sm">
        <b className="text-brand">{r.name}</b>
        {r.location && <span className="text-ink-soft"> · {r.location}</span>}
        <span className="block text-xs text-ink-soft">
          {SERVICE_LABEL[r.service]} · {new Date(r.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
        </span>
      </figcaption>
    </figure>
  );
}

export function RatingSummary({ summary }: { summary: ReviewSummary }) {
  if (!summary.count) return null;
  return (
    <p className="flex items-center gap-3">
      <span className="font-display text-5xl text-brand">{summary.average.toFixed(1)}</span>
      <span>
        <Stars value={summary.average} />
        <span className="block text-sm text-ink-soft">
          from {summary.count} review{summary.count === 1 ? "" : "s"}
        </span>
      </span>
    </p>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Your name, please").max(120),
  location: z.string().trim().max(120),
  service: z.enum(["car", "stay", "general"]),
  rating: z.number().int().min(1, "Pick 1 to 5 stars").max(5),
  comment: z.string().trim().min(10, "Tell us a little more").max(2000),
});

export function ReviewForm() {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", location: "", service: "car" as ReviewService, rating: 0, comment: "" });
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<FieldErrors>({});
  const m = useMutation({
    mutationFn: (body: typeof f) => api.post<{ ok: true }>("/reviews", { ...body, website }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) return setErrors(flatten(r.error));
    setErrors({});
    m.mutate(r.data);
  };

  if (m.isSuccess) {
    return (
      <div className="border-2 border-brand bg-white p-6 shadow-hard" role="status">
        <p className="eyebrow">Asante sana</p>
        <h3 className="mt-1 text-3xl">Thank you for the review.</h3>
        <p className="mt-2 text-ink-soft">It will appear here once our team has checked it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="relative grid gap-4 border-2 border-brand bg-white p-6 shadow-hard" aria-label="Write a review">
      <h3 className="text-3xl">Write a review</h3>
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-bold">Your rating</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={f.rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setF({ ...f, rating: n })}
              className={`text-4xl leading-none ${n <= f.rating ? "text-spark" : "text-line hover:text-spark/60"}`}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating && (
          <p role="alert" className="mt-1 text-sm font-bold text-danger">
            {errors.rating}
          </p>
        )}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Your name" required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
        <Input label="Where are you from?" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="e.g. Arusha, Nairobi, London" error={errors.location} />
      </div>
      <Select
        label="What did you use?"
        value={f.service}
        onChange={(e) => setF({ ...f, service: e.target.value as ReviewService })}
        options={[
          { value: "car", label: "Car hire" },
          { value: "stay", label: "Short stay" },
          { value: "general", label: "Something else" },
        ]}
      />
      <Textarea label="Your review" required value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} error={errors.comment} />
      {m.isError && (
        <p role="alert" className="text-sm font-bold text-danger">
          {errorMessage(m.error)}
        </p>
      )}
      <Button type="submit" loading={m.isPending}>
        Send review
      </Button>
    </form>
  );
}

/** Home page strip: latest approved reviews + link to the reviews page. */
export function ReviewsStrip() {
  const q = useReviews({ limit: 3 });
  return (
    <section className="container-x py-16 lg:py-24" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Maoni ya wateja</p>
          <h2 id="reviews-title" className="mt-2 text-5xl sm:text-6xl">
            What customers say.
          </h2>
        </div>
        {q.data && <RatingSummary summary={q.data.summary} />}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {q.isPending && [1, 2, 3].map((k) => <Skeleton key={k} className="h-48" />)}
        {q.data?.reviews.map((r) => <ReviewCard key={r.id} r={r} />)}
        {(q.isError || q.data?.reviews.length === 0) && (
          <div className="border-2 border-dashed border-line p-6 md:col-span-3">
            <p className="text-lg">Rented a car or stayed with us? Be the first to leave a review.</p>
          </div>
        )}
      </div>
      <Link to="/reviews" className="btn-brand mt-8">
        All reviews · write one →
      </Link>
    </section>
  );
}
