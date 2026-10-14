import { Routes, Route } from "react-router";
import { AuthProvider, RequireAuth } from "./auth";
import AdminLayout from "./AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import Calendar from "./pages/Calendar";
import Vehicles from "./pages/Vehicles";
import Properties from "./pages/Properties";
import Pricing from "./pages/Pricing";
import { Extras, Zones, Promos } from "./pages/SimpleCrud";
import Settings from "./pages/Settings";
import { useSeo } from "@/lib/useSeo";

export default function AdminApp() {
  useSeo({ title: "Admin — Bluesparks", noindex: true });
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="properties" element={<Properties />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="extras" element={<Extras />} />
          <Route path="zones" element={<Zones />} />
          <Route path="promos" element={<Promos />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<p className="text-ink-soft">Not found.</p>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
