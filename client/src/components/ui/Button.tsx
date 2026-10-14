import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

type Variant = "primary" | "brand" | "ghost" | "paper" | "danger";
const cls: Record<Variant, string> = {
  primary: "btn-primary",
  brand: "btn-brand",
  ghost: "btn-ghost",
  paper: "btn-paper",
  danger: "btn-danger",
};

interface Base {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonProps = Base & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({ variant = "primary", size = "md", loading, children, className = "", disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${cls[variant]} ${size === "sm" ? "btn-sm" : ""} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

type LinkButtonProps = Base & { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href">;

export function LinkButton({ variant = "primary", size = "md", children, className = "", to, ...rest }: LinkButtonProps) {
  const c = `${cls[variant]} ${size === "sm" ? "btn-sm" : ""} ${className}`;
  if (/^https?:|^mailto:|^tel:/.test(to)) {
    return (
      <a href={to} className={c} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={c} {...rest}>
      {children}
    </Link>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
