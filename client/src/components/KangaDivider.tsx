/**
 * Kanga/kitenge-inspired geometric divider: a repeating row of triangles and diamonds
 * in brand + orange. Use sparingly (2–3 times per page at most).
 */
export function KangaDivider({ className = "", invert = false }: { className?: string; invert?: boolean }) {
  const a = invert ? "var(--color-paper)" : "var(--color-brand)";
  const b = "var(--color-orange)";
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg width="100%" height="22" viewBox="0 0 1200 22" preserveAspectRatio="none" className="block">
        <defs>
          <pattern id="kanga" width="48" height="22" patternUnits="userSpaceOnUse">
            <polygon points="0,22 12,0 24,22" fill={a} />
            <polygon points="24,22 36,0 48,22" fill={b} />
            <polygon points="12,6 18,11 12,16 6,11" fill="var(--color-cream)" />
            <rect x="0" y="20" width="48" height="2" fill={a} />
          </pattern>
        </defs>
        <rect width="1200" height="22" fill="url(#kanga)" />
      </svg>
    </div>
  );
}
