import { useEffect } from "react";

interface Seo {
  title: string;
  description?: string;
  noindex?: boolean;
  image?: string;
  /** Structured data (schema.org) for this page, rendered as <script type="application/ld+json">. */
  jsonLd?: object | object[];
}

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Per-route <title> + meta. Tiny on purpose — no helmet dependency. */
export function useSeo({ title, description, noindex, image, jsonLd }: Seo) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const full = title.includes("Blue Spark") ? title : `${title} — Blue Spark, Dar es Salaam`;
    document.title = full;
    setMeta('meta[property="og:title"]', "property", "og:title", full);
    if (description) {
      setMeta('meta[name="description"]', "name", "description", description);
      setMeta('meta[property="og:description"]', "property", "og:description", description);
    }
    if (image) setMeta('meta[property="og:image"]', "property", "og:image", image.startsWith("http") ? image : `${window.location.origin}${image}`);
    setMeta('meta[property="og:url"]', "property", "og:url", `${window.location.origin}${window.location.pathname}`);
    setMeta('meta[name="robots"]', "name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    const canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canon) canon.href = `${window.location.origin}${window.location.pathname}`;
  }, [title, description, noindex, image]);

  useEffect(() => {
    if (!ld) return;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.dataset.page = "1";
    el.textContent = ld;
    document.head.appendChild(el);
    return () => el.remove();
  }, [ld]);
}
