import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useSeo } from "@/lib/useSeo";
import { useSettings } from "@/lib/queries";
import { api, errorMessage } from "@/lib/api";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { waLink } from "@/lib/format";
import { flatten, type FieldErrors } from "./book/schemas";
import { useT } from "@/i18n";

const schema = z.object({
  name: z.string().trim().min(2, "Your name, please"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a phone number").max(20),
  message: z.string().trim().min(10, "Tell us a little more").max(2000),
});

// Masaki peninsula, Dar es Salaam
const MASAKI = { lat: -6.7556, lng: 39.2765 };

export default function Contact() {
  useSeo({ title: "Contact Blue Spark Holdings", description: "WhatsApp, call or email Blue Spark Holdings in Masaki, Dar es Salaam. Car hire and short stays." });
  const { t } = useT();
  const { data: s } = useSettings();
  const [f, setF] = useState({ name: "", email: "", phone: "", message: "" });
  const [website, setWebsite] = useState(""); // honeypot: must stay empty
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState(false);
  const m = useMutation({ mutationFn: (body: typeof f) => api.post<{ ok: true }>("/contact", { ...body, website }), onSuccess: () => setSent(true) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) return setErrors(flatten(r.error));
    setErrors({});
    m.mutate(r.data);
  };
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${MASAKI.lng - 0.02},${MASAKI.lat - 0.014},${MASAKI.lng + 0.02},${MASAKI.lat + 0.014}&layer=mapnik&marker=${MASAKI.lat},${MASAKI.lng}`;

  return (
    <section className="container-x py-14 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-2 text-6xl sm:text-7xl">Say hello.</h1>
          <p className="mt-4 text-ink-soft">Fastest is WhatsApp. We answer 07:00–22:00, and for arrivals at odd hours we answer anyway.</p>
          <div className="mt-6 space-y-3">
            <a href={waLink(s?.businessWhatsapp ?? "", "Habari Blue Spark!")} target="_blank" rel="noopener" className="btn-primary w-full text-lg sm:w-auto">
              {t.common.whatsapp}
            </a>
            <dl className="divide-y divide-line border-y border-line text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-ink-soft">Phone</dt>
                <dd>
                  <a href={`tel:${(s?.businessPhone ?? "").replace(/\s/g, "")}`} className="font-bold text-brand">
                    {s?.businessPhone}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-ink-soft">Email</dt>
                <dd>
                  <a href={`mailto:${s?.businessEmail}`} className="font-bold text-brand">
                    {s?.businessEmail}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-ink-soft">Office</dt>
                <dd className="text-right font-bold text-brand">{s?.businessAddress}</dd>
              </div>
            </dl>
          </div>
          <iframe title="Map of our office in Masaki" src={mapSrc} className="mt-6 aspect-[4/3] w-full border-2 border-brand" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          {sent ? (
            <div className="border-2 border-brand bg-white p-8 shadow-hard" role="status">
              <p className="eyebrow">Asante</p>
              <h2 className="mt-2 text-4xl">Got it.</h2>
              <p className="mt-3 text-ink-soft">We'll reply to {f.email} or on {f.phone}, usually within the hour during the day.</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="relative space-y-4 border-2 border-brand bg-white p-6 shadow-hard sm:p-8" aria-label="Contact form">
              <h2 className="text-3xl">Or write to us</h2>
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>
              <Input label={t.form.fullName} required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t.form.email} type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
                <Input label={t.form.phone} type="tel" required autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={errors.phone} />
              </div>
              <Textarea label={t.form.message} required value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} error={errors.message} />
              {m.isError && (
                <p role="alert" className="text-sm font-bold text-danger">
                  {errorMessage(m.error)}
                </p>
              )}
              <Button type="submit" loading={m.isPending} className="w-full text-lg">
                {t.form.send}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
