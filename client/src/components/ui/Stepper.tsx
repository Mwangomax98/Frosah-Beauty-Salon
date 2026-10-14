interface Props {
  steps: string[];
  current: number; // 0-based
  onGoTo?: (i: number) => void;
}

/** Progress rail for booking flows. Completed steps are clickable. */
export function Stepper({ steps, current, onGoTo }: Props) {
  return (
    <nav aria-label="Booking steps" className="no-print">
      <ol className="flex items-start gap-0 overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} className="flex min-w-[4.5rem] flex-1 flex-col items-start">
              <div className="flex w-full items-center">
                <button type="button" onClick={() => done && onGoTo?.(i)} disabled={!done} aria-current={active ? "step" : undefined} className={`font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none ${active ? "bg-spark text-white" : done ? "bg-brand text-paper hover:bg-brand-deep" : "border-2 border-line bg-white text-ink-soft"} ${done ? "" : "cursor-default"}`}>
                  {i + 1}
                </button>
                {i < steps.length - 1 && <span className={`mx-1 h-0.5 flex-1 ${done ? "bg-brand" : "bg-line"}`} aria-hidden="true" />}
              </div>
              <span className={`mt-1.5 pr-2 text-[11px] leading-tight font-bold tracking-wide uppercase sm:text-xs ${active ? "text-spark" : done ? "text-brand" : "text-ink-soft"}`}>{s}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
