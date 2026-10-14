/** Fixed paper-grain overlay (feTurbulence noise, ~4% opacity). Hidden for reduced-motion / print. */
export function PaperGrain() {
  return (
    <svg className="pointer-events-none fixed inset-0 z-[60] h-full w-full opacity-[0.045] mix-blend-multiply motion-reduce:hidden print:hidden" aria-hidden="true" focusable="false">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}
