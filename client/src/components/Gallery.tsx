import { useState } from "react";
import { srcSet } from "@/lib/format";

/** Simple gallery: large image + thumbnail strip, keyboard accessible. */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const main = images[i] ?? images[0];
  if (!main) return null;
  return (
    <div>
      <div className="aspect-[3/2] overflow-hidden border-2 border-brand bg-cream">
        <img src={main} srcSet={srcSet(main)} sizes="(min-width: 1024px) 60vw, 100vw" alt={`${alt} — photo ${i + 1}`} width="1600" height="1067" loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} decoding="async" className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {images.map((src, k) => (
            <li key={k} className="shrink-0">
              <button type="button" onClick={() => setI(k)} aria-pressed={k === i} aria-label={`Show photo ${k + 1}`} className={`block h-16 w-24 overflow-hidden border-2 ${k === i ? "border-spark" : "border-transparent hover:border-brand"}`}>
                <img src={src} srcSet={srcSet(src)} sizes="96px" alt="" width="96" height="64" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
