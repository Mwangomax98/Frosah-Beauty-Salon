import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Kind = "ok" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}
interface Ctx {
  toast: (text: string, kind?: Kind) => void;
}
const C = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const n = useRef(0);
  const toast = useCallback((text: string, kind: Kind = "info") => {
    const id = ++n.current;
    setItems((s) => [...s, { id, kind, text }]);
    window.setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <C.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={`pointer-events-auto max-w-md rounded-sm border-2 px-4 py-2.5 text-sm font-medium shadow-hard [animation:toast-in_.15s_ease-out] ${t.kind === "error" ? "border-danger bg-white text-danger" : t.kind === "ok" ? "border-brand bg-brand text-paper" : "border-brand bg-paper text-brand"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </C.Provider>
  );
}

export function useToast(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useToast outside ToastProvider");
  return v;
}
