import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BlockedDate, Service } from "@bluesparks/shared";
import { addDays, eachDate, todayIso } from "@bluesparks/shared";
import { useAdminCalendar } from "../api";
import { PageHead } from "../components";
import { api, errorMessage } from "@/lib/api";
import { Input, Select, SegmentedRadio } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, Skeleton } from "@/components/States";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Calendar() {
  const [service, setService] = useState<Service>("car");
  const today = todayIso();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const from = `${ym}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${ym}-${String(daysInMonth).padStart(2, "0")}`;
  const days = useMemo(() => eachDate(from, to), [from, to]);
  const q = useAdminCalendar(service, from, to);
  const qc = useQueryClient();
  const { toast } = useToast();
  const items = q.data?.items ?? [];

  // drag-select for blocking
  const [drag, setDrag] = useState<{ itemId: number; start: string; end: string } | null>(null);
  const [modal, setModal] = useState<{ itemId: number; start: string; end: string } | null>(null);
  const [reason, setReason] = useState("Maintenance");

  const createBlock = useMutation({
    mutationFn: (body: { targetType: Service; targetId: number; startDate: string; endDate: string; reason: string }) => api.post<BlockedDate>("/admin/blocks", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-calendar"] });
      setModal(null);
      toast("Dates blocked", "ok");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const deleteBlock = useMutation({
    mutationFn: (id: number) => api.del(`/admin/blocks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-calendar"] });
      toast("Block removed", "ok");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const openForm = (e: FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    setModal({ itemId: Number(f.get("itemId")), start: String(f.get("start")), end: String(f.get("end")) });
  };

  return (
    <>
      <PageHead title="Calendar">Drag across a row to block dates. Hover a bar for details; click a booking bar to open it.</PageHead>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SegmentedRadio label="Service" name="service" value={service} onChange={setService} options={[{ value: "car", label: "Vehicles" }, { value: "stay", label: "Properties" }]} />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => shift(-1)} aria-label="Previous month">
            ←
          </Button>
          <span className="min-w-40 text-center font-display text-xl text-brand uppercase">
            {MONTHS[m - 1]} {y}
          </span>
          <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="Next month">
            →
          </Button>
        </div>
      </div>

      {q.isPending && <Skeleton className="mt-4 h-48" />}
      {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} compact />}
      {q.data && (
        <div className="table-wrap mt-4 border-2 border-line bg-white select-none" onMouseLeave={() => setDrag(null)}>
          <table className="border-collapse text-xs" style={{ minWidth: `${160 + days.length * 28}px` }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-cream px-2 py-1 text-left">Item</th>
                {days.map((d) => {
                  const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
                  return (
                    <th key={d} className={`w-7 px-0 py-1 text-center font-normal ${dow === 0 || dow === 6 ? "bg-cream" : ""} ${d === today ? "font-bold text-spark" : "text-ink-soft"}`}>
                      {Number(d.slice(-2))}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-line">
                  <th scope="row" className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-bold whitespace-nowrap text-brand">
                    {it.name}
                  </th>
                  {days.map((d) => {
                    const bk = it.bookings.find((b) => d >= b.startDate && d <= b.endDate && b.status !== "cancelled");
                    const bl = it.blocks.find((b) => d >= b.startDate && d <= b.endDate);
                    const inDrag = drag && drag.itemId === it.id && d >= (drag.start < drag.end ? drag.start : drag.end) && d <= (drag.start < drag.end ? drag.end : drag.start);
                    let cls = "h-8 w-7 border-l border-line/60 p-0 align-middle";
                    if (inDrag) cls += " bg-spark/40";
                    return (
                      <td
                        key={d}
                        className={cls}
                        onMouseDown={() => !bk && !bl && setDrag({ itemId: it.id, start: d, end: d })}
                        onMouseEnter={() => drag && drag.itemId === it.id && setDrag({ ...drag, end: d })}
                        onMouseUp={() => {
                          if (drag && drag.itemId === it.id) {
                            const s = drag.start < drag.end ? drag.start : drag.end;
                            const e = drag.start < drag.end ? drag.end : drag.start;
                            setDrag(null);
                            setModal({ itemId: it.id, start: s, end: e });
                          }
                        }}
                      >
                        {bk && (
                          <Link to={`/admin/bookings/${bk.id}`} title={`${bk.reference} · ${bk.customer.fullName} · ${bk.status}`} className={`block h-6 ${d === bk.startDate ? "ml-1 rounded-l-sm" : ""} ${d === bk.endDate ? "mr-1 rounded-r-sm" : ""} ${bk.status === "confirmed" ? "bg-brand" : bk.status === "completed" ? "bg-ink-soft" : "bg-spark"}`}>
                          <span className="sr-only">{bk.reference}</span>
                        </Link>
                        )}
                        {bl && !bk && (
                          <span title={`Blocked: ${bl.reason || "no reason"} (${bl.source})`} className="block h-6 bg-[repeating-linear-gradient(45deg,var(--color-ink-soft)_0_3px,transparent_3px_7px)]">
                            {d === bl.startDate && bl.source === "manual" && (
                              <button type="button" className="h-6 w-full text-[10px] font-bold text-danger" aria-label={`Remove block ${bl.reason}`} onClick={() => deleteBlock.mutate(bl.id)}>
                                ×
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-4 text-ink-soft" colSpan={days.length + 1}>
                    Nothing to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 flex flex-wrap gap-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-3 w-5 bg-spark" /> Pending
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-3 w-5 bg-brand" /> Confirmed
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-3 w-5 bg-ink-soft" /> Completed
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-3 w-5 bg-[repeating-linear-gradient(45deg,var(--color-ink-soft)_0_3px,transparent_3px_7px)]" /> Blocked (× removes a manual block)
        </span>
      </p>

      {/* Block form (keyboard-friendly alternative to drag) */}
      <form onSubmit={openForm} className="mt-6 grid gap-3 border-2 border-line bg-white p-4 sm:grid-cols-4" aria-label="Block dates">
        <Select label="Item" name="itemId" required options={items.map((i) => ({ value: String(i.id), label: i.name }))} placeholder="Choose…" />
        <Input label="From" name="start" type="date" required defaultValue={today} />
        <Input label="To (inclusive)" name="end" type="date" required defaultValue={addDays(today, 1)} />
        <div className="flex items-end">
          <Button type="submit" variant="brand" className="w-full">
            Block dates…
          </Button>
        </div>
      </form>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title="Block dates"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={createBlock.isPending} onClick={() => modal && createBlock.mutate({ targetType: service, targetId: modal.itemId, startDate: modal.start, endDate: modal.end, reason })}>
              Block
            </Button>
          </>
        }
      >
        {modal && (
          <div className="space-y-3 text-sm">
            <p>
              <b>{items.find((i) => i.id === modal.itemId)?.name}</b>: {modal.start} → {modal.end} (inclusive)
            </p>
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
      </Modal>
    </>
  );
}
