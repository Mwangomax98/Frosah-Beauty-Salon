import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useSeo } from "@/lib/useSeo";
import { useSettings } from "@/lib/queries";
import { api, errorMessage } from "@/lib/api";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { waLink } from "@/lib/format";
import { localPhone } from "@/lib/whatsapp";
import { InstagramIcon } from "@/components/Footer";
import { flatten, type FieldErrors } from "./book/schemas";
import { useT } from "@/i18n";

const schema = z.object({
  name: z.string().trim().min(2, "Your name, please"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a phone number").max(20),
  message: z.string().trim().min(10, "Tell us a little more").max(2000),
});

export default function Contact() {
  useSeo({ title: "Contact Blue Spark", description: "WhatsApp or call Blue Spark on 0625 102 051, follow us on Instagram, or find our office on Google Maps in Masaki, Dar es Salaam. Car hire and short stays." });
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
  // Google Maps embed by address: no API key needed. The share link (Admin → Settings) opens the exact pin.
  const address = s?.businessAddress || "Masaki, Dar es Salaam";
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(`Blue Spark, ${address}, Tanzania`)}&output=embed`;
  const mapLink = s?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Tanzania`)}`;

  return (
    <section className="container-x py-14 lg:py-20">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-2 text-6xl sm:text-7xl">Say hello.</h1>
          <p className="mt-4 text-ink-soft">Fastest is WhatsApp. We answer 07:00–22:00, and for arrivals at odd hours we answer anyway.</p>
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap gap-3">
              <a href={waLink(s?.businessWhatsapp ?? "", "Habari Blue Spark! I would like to make a booking.")} target="_blank" rel="noopener" className="btn-primary text-lg">
                {t.common.whatsapp} · {localPhone(s?.businessWhatsapp ?? "")}
              </a>
              {s?.instagramUrl && (
                <a href={s.instagramUrl} target="_blank" rel="noopener" className="btn-ghost text-lg">
                  <InstagramIcon size={20} /> <span className="ml-2">Instagram</span>
                </a>
              )}
            </div>
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
              <div className="flex justify-between py-3">
                <dt className="text-ink-soft">WhatsApp</dt>
                <dd>
                  <a href={waLink(s?.businessWhatsapp ?? "")} target="_blank" rel="noopener" className="font-bold text-brand">
                    {localPhone(s?.businessWhatsapp ?? "")}
                  </a>
                </dd>
              </div>
              {s?.instagramUrl && (
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-ink-soft">Instagram</dt>
                  <dd className="truncate">
                    <a href={s.instagramUrl} target="_blank" rel="noopener" className="font-bold text-brand">
                      {s.instagramUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-ink-soft">Office</dt>
                <dd className="text-right font-bold text-brand">{s?.businessAddress}</dd>
              </div>
            </dl>
          </div>
          <iframe title="Google Map of the Blue Spark office" src={mapSrc} className="mt-6 aspect-[4/3] w-full border-2 border-brand" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          <a href={mapLink} target="_blank" rel="noopener" className="link-underline mt-2 inline-block text-sm font-bold text-brand">
            Open in Google Maps →
          </a>
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
