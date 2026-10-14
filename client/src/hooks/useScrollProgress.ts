import { useEffect, type RefObject } from "react";

/**
 * Writes a 0..1 scroll progress into a CSS custom property (`--p`) on the element.
 * mode "sticky": 0 when the element's top reaches the viewport top, 1 when its bottom reaches the viewport bottom
 *   (use with a tall section whose child is position: sticky).
 * mode "enter": 0 when the element enters from the bottom, 1 when it leaves at the top.
 * Does nothing under prefers-reduced-motion (CSS sets --p: 1 there, so the final state renders).
 * Pure rAF + scroll listener, no libraries.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, mode: "sticky" | "enter" = "sticky") {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      let p: number;
      if (mode === "sticky") {
        const total = r.height - vh;
        p = total <= 0 ? 1 : -r.top / total;
      } else {
        p = (vh - r.top) / (vh + r.height);
      }
      p = Math.min(1, Math.max(0, p));
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, mode]);
}
