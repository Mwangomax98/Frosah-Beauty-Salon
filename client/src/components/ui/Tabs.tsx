import { useId, type KeyboardEvent, type ReactNode } from "react";

interface Tab<T extends string> {
  id: T;
  label: ReactNode;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  variant?: "ticket" | "plain";
}

/** Accessible tablist with arrow-key navigation. Panels are rendered by the caller with `tabPanelProps`. */
export function Tabs<T extends string>({ tabs, value, onChange, className = "", variant = "plain" }: Props<T>) {
  const base = useId();
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex((t) => t.id === value);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = (idx + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      onChange(tabs[next]!.id);
      (document.getElementById(`${base}-tab-${tabs[next]!.id}`) as HTMLElement | null)?.focus();
    }
  };
  return (
    <div role="tablist" aria-orientation="horizontal" onKeyDown={onKey} className={`flex ${className}`}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            id={`${base}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={
              variant === "ticket"
                ? `font-display flex-1 px-3 py-2.5 text-lg tracking-tight uppercase transition-colors ${active ? "bg-brand text-paper" : "bg-cream text-brand hover:bg-line/60"}`
                : `-mb-0.5 border-b-4 px-4 py-2 text-sm font-bold ${active ? "border-orange text-brand" : "border-transparent text-ink-soft hover:text-brand"}`
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function tabPanelProps(id: string) {
  return { role: "tabpanel" as const, id: `panel-${id}` };
}
