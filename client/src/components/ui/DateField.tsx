import { Input } from "./Input";
import { today } from "@/lib/format";
import type { ReactNode } from "react";

interface Props {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  id?: string;
  className?: string;
  name?: string;
}

/** Native date input, min defaults to today (Dar time). */
export function DateField({ label, value, onChange, min, max, error, hint, required, id, className, name }: Props) {
  return <Input type="date" label={label} value={value} onChange={(e) => onChange(e.target.value)} min={min ?? today()} max={max} error={error} hint={hint} required={required} id={id} className={className} name={name} inputClassName="tabular" />;
}

export function TimeField({ label, value, onChange, error, id, className, name }: { label: ReactNode; value: string; onChange: (v: string) => void; error?: string; id?: string; className?: string; name?: string }) {
  return <Input type="time" label={label} value={value} onChange={(e) => onChange(e.target.value)} error={error} id={id} className={className} name={name} step={900} inputClassName="tabular" />;
}
