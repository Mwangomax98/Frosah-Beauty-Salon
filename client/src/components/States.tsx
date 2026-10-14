import type { ReactNode } from "react";
import { errorMessage } from "@/lib/api";
import { Button } from "./ui/Button";

export function PageLoading() {
  return (
    <div className="container-x py-24 text-center" role="status" aria-live="polite">
      <span className="eyebrow">Pole pole…</span>
      <p className="mt-2 text-ink-soft">Loading</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-cream ${className}`} aria-hidden="true" />;
}

export function ErrorState({ error, retry, compact }: { error: unknown; retry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={`border-2 border-danger/40 bg-white ${compact ? "p-4" : "p-8"} text-center`}>
      <p className="font-bold text-danger">We couldn't load this.</p>
      <p className="mt-1 text-sm text-ink-soft">{errorMessage(error)}</p>
      {retry && (
        <Button variant="ghost" size="sm" className="mt-3" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-line bg-cream/50 p-8 text-center">
      <p className="text-xl">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}
