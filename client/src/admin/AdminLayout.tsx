import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "./auth";

const NAV = [
  ["/admin", "Dashboard", true],
  ["/admin/bookings", "Bookings"],
  ["/admin/calendar", "Calendar"],
  ["/admin/vehicles", "Vehicles"],
  ["/admin/properties", "Properties"],
  ["/admin/pricing", "Pricing"],
  ["/admin/extras", "Extras"],
  ["/admin/zones", "Delivery zones"],
  ["/admin/promos", "Promo codes"],
  ["/admin/settings", "Settings"],
] as const;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const cls = ({ isActive }: { isActive: boolean }) => `block border-l-4 px-4 py-2 text-sm font-bold ${isActive ? "border-spark bg-brand-deep text-paper" : "border-transparent text-paper/75 hover:bg-brand-deep hover:text-paper"}`;
  const menu = (
    <nav aria-label="Admin" className="flex-1 py-2">
      {NAV.map(([to, label, end]) => (
        <NavLink key={to} to={to} end={!!end} className={cls} onClick={() => setOpen(false)}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-spark focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-brand text-paper md:flex">
        <div className="border-b border-paper/15 px-4 py-4">
          <Logo sub="Admin" />
        </div>
        {menu}
        <div className="border-t border-paper/15 px-4 py-3 text-xs text-paper/70">
          <p className="truncate">{user?.email}</p>
          <div className="mt-2 flex gap-3">
            <NavLink to="/" className="hover:text-spark">
              View site
            </NavLink>
            <button type="button" onClick={() => logout().then(() => nav("/admin/login"))} className="hover:text-spark">
              Log out
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between bg-brand px-4 py-3 text-paper md:hidden">
          <Logo sub="Admin" />
          <button type="button" className="rounded-sm border border-paper/40 px-3 py-1.5 text-sm" aria-expanded={open} aria-controls="admin-mobile-nav" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Menu"}
          </button>
        </header>
        {open && (
          <div id="admin-mobile-nav" className="bg-brand text-paper md:hidden">
            {menu}
            <button type="button" onClick={() => logout().then(() => nav("/admin/login"))} className="block w-full px-4 py-3 text-left text-sm text-paper/75">
              Log out
            </button>
          </div>
        )}
        <main id="admin-main" className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
