import { useRef } from "react";
import { IMAGES } from "@/content/images";
import { useT } from "@/i18n";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { BookingCard } from "./BookingCard";
import { RouteMap } from "./RouteMap";
import { img800 } from "@/lib/format";

/**
 * Home hero. Desktop: a 230vh section with a sticky stage; scrolling moves the car across the
 * headline, draws the route and reveals the stay photo. Mobile: a compact first viewport
 * (headline + booking card, no scrolling needed) followed by the route block that animates as it enters.
 * All motion is driven by a single CSS variable `--p` (0..1); reduced motion pins it at 1.
 */
export function Hero({ stayName, stayHref }: { stayName?: string; stayHref?: string }) {
  const { t } = useT();
  const stageRef = useRef<HTMLDivElement>(null);
  const mobileRouteRef = useRef<HTMLDivElement>(null);
  useScrollProgress(stageRef, "sticky");
  useScrollProgress(mobileRouteRef, "enter");

  return (
    <>
      {/* ---------- Desktop / tablet landscape ---------- */}
      <section ref={stageRef} className="relative hidden lg:block motion-reduce:[--p:1]" style={{ height: "200vh" }} aria-labelledby="hero-title">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden bg-paper">
          {/* background: Dar coast photo, soft-faded */}
          <img src={IMAGES.heroDar} srcSet={`${img800(IMAGES.heroDar)} 800w, ${IMAGES.heroDar} 1600w`} sizes="100vw" alt="" width="1600" height="1000" fetchPriority="high" decoding="async" className="mask-fade-b absolute inset-x-0 top-0 h-[70%] w-full object-cover object-bottom opacity-[0.28]" />
          <div className="hero-glow absolute inset-0" aria-hidden="true" />

          <div className="container-x relative grid h-full grid-cols-12 gap-6">
            {/* Headline (z-0) */}
            <div className="relative z-0 col-span-7 flex flex-col justify-start pt-8">
              <h1 id="hero-title" className="font-display text-brand" style={{ fontSize: "clamp(4rem, 12.5vw, 12.5rem)" }}>
                <span className="block">{t.hero.land}</span>
                <span className="block text-orange">{t.hero.drive}</span>
                <span className="block">{t.hero.sleep}</span>
              </h1>
            </div>
            {/* Booking card + sub-line */}
            <div className="relative z-20 col-span-5 flex flex-col items-end pt-8">
              <BookingCard />
              <p className="mt-5 max-w-md text-right text-lg leading-snug text-ink-soft" style={{ opacity: "calc(1 - clamp(0, (var(--p, 1) - 0.4) / 0.25, 1))" }}>
                {t.hero.sub}
              </p>
            </div>
          </div>

          {/* Car cut-out (z-10) drives across the letters */}
          <img
            src={IMAGES.heroCar}
            alt="Toyota Land Cruiser Prado from the Johnson Rentals fleet"
            width="1600"
            height="700"
            fetchPriority="high"
            decoding="async"
            className="pointer-events-none absolute bottom-[27%] left-0 z-10 w-[40vw] max-w-2xl will-change-transform"
            style={{ transform: "translateX(calc(-4vw + var(--p, 1) * 52vw)) translateY(calc(var(--p, 1) * 3vh))" }}
          />

          {/* Route line across the bottom */}
          <div className="absolute inset-x-0 bottom-4 z-[5]">
            <div className="container-x">
              <RouteMap stayName={stayName} stayHref={stayHref} />
            </div>
          </div>

          {/* Stay photo reveals on scroll from the right */}
          <div className="absolute right-0 bottom-[41%] z-[4] h-[24%] w-[30%] overflow-hidden border-l-4 border-orange" style={{ clipPath: "inset(0 0 0 calc((1 - clamp(0, (var(--p, 1) - 0.6) / 0.25, 1)) * 100%))" }} aria-hidden="true">
            <img src={IMAGES.heroStay} srcSet={`${img800(IMAGES.heroStay)} 800w, ${IMAGES.heroStay} 1600w`} sizes="36vw" alt="" width="1600" height="1000" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            <span className="absolute bottom-3 left-3 bg-brand px-2 py-1 font-display text-sm tracking-wide text-paper uppercase">Then: your stay</span>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-[29%] left-1/2 z-[6] -translate-x-1/2 text-xs font-bold tracking-[0.2em] text-ink-soft uppercase" style={{ opacity: "calc(1 - clamp(0, var(--p, 1) / 0.15, 1))" }} aria-hidden="true">
            ↓ {t.hero.scroll}
          </div>
        </div>
      </section>

      {/* ---------- Mobile / tablet portrait ---------- */}
      <section className="relative lg:hidden" aria-label="Welcome">
        <div className="relative overflow-hidden bg-paper">
          <img src={IMAGES.heroDar} srcSet={`${img800(IMAGES.heroDar)} 800w, ${IMAGES.heroDar} 1600w`} sizes="100vw" alt="" width="1600" height="1000" fetchPriority="high" decoding="async" className="mask-fade-b absolute inset-x-0 top-0 h-56 w-full object-cover object-bottom opacity-[0.28]" />
          <div className="hero-glow absolute inset-0" aria-hidden="true" />
          <div className="container-x relative pt-5 pb-5">
            <div className="relative">
              <h1 className="relative z-0 font-display text-brand" style={{ fontSize: "clamp(3.6rem, 17vw, 7rem)" }}>
                <span className="block">{t.hero.land}</span>
                <span className="block text-orange">{t.hero.drive}</span>
                <span className="block">{t.hero.sleep}</span>
              </h1>
              {/* car cut-out tucked into the headline's lower right, in front of the letters */}
              <img src={img800(IMAGES.heroCar)} alt="" width="800" height="350" fetchPriority="high" decoding="async" className="pointer-events-none absolute right-[-6%] bottom-[-4%] z-10 w-[58%] max-w-xs" />
            </div>
            <p className="relative z-0 mt-3 max-w-[18rem] text-sm leading-snug text-ink-soft sm:text-base">{t.hero.sub}</p>
            <div className="relative z-20 mt-4">
              <BookingCard />
            </div>
          </div>
        </div>
        {/* Route block animates as it scrolls into view */}
        <div ref={mobileRouteRef} className="container-x pt-14 pb-6 motion-reduce:[--p:1]">
          <p className="eyebrow mb-2">From the plane to the pillow</p>
          <RouteMap vertical stayName={stayName} stayHref={stayHref} />
        </div>
      </section>
    </>
  );
}
