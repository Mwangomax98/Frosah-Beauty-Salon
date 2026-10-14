import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

export function Field({ label, hint, error, required, className = "", id, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && (
          <span className="ml-0.5 text-orange" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> & { id?: string; inputClassName?: string };

export function Input({ label, hint, error, required, className, id: givenId, inputClassName = "", ...rest }: InputProps) {
  const auto = useId();
  const id = givenId ?? auto;
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} id={id}>
      <input id={id} className={`field ${inputClassName}`} aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} required={required} {...rest} />
    </Field>
  );
}

type TextareaProps = FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id"> & { id?: string };

export function Textarea({ label, hint, error, required, className, id: givenId, ...rest }: TextareaProps) {
  const auto = useId();
  const id = givenId ?? auto;
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} id={id}>
      <textarea id={id} className="field min-h-28" aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} required={required} {...rest} />
    </Field>
  );
}

type SelectProps = FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id"> & {
    id?: string;
    options: { value: string; label: string; disabled?: boolean }[];
    placeholder?: string;
  };

export function Select({ label, hint, error, required, className, id: givenId, options, placeholder, ...rest }: SelectProps) {
  const auto = useId();
  const id = givenId ?? auto;
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className} id={id}>
      <select id={id} className="field appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%230B2545%22 stroke-width=%222%22 fill=%22none%22/></svg>')] bg-[length:12px_8px] bg-[right_0.75rem_center] bg-no-repeat pr-9" aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} required={required} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox({ label, error, id: givenId, className = "", ...rest }: { label: ReactNode; error?: string; id?: string; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id" | "type">) {
  const auto = useId();
  const id = givenId ?? auto;
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm">
        <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-orange" aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Pill-style radio group (used for self-drive/with driver, rental type, etc.) */
export function SegmentedRadio<T extends string>({ label, name, value, onChange, options, className = "" }: { label: ReactNode; name: string; value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; hint?: ReactNode }[]; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label key={o.value} className={`flex cursor-pointer flex-col rounded-sm border-2 px-3 py-2 text-sm font-bold transition-colors focus-within:outline-2 focus-within:outline-orange focus-within:outline-offset-2 ${active ? "border-brand bg-brand text-paper" : "border-line bg-white text-brand hover:border-brand"}`}>
              <input type="radio" name={name} value={o.value} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
              <span>{o.label}</span>
              {o.hint && <span className={`text-xs font-normal ${active ? "text-paper/80" : "text-ink-soft"}`}>{o.hint}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
