// Admin data hooks. All under /api/admin, token attached by lib/api.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BlockedDate, Booking, DeliveryZone, Extra, Payment, PromoCode, Property, SeasonalRate, Settings, Vehicle, Service } from "@bluesparks/shared";
import { API_BASE, api, getAdminToken, qs } from "@/lib/api";

export type AdminProperty = Property & { icalExportUrl?: string; icalToken?: string };
export interface BookingFilters {
  service?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}
export interface RevenueReport {
  from: string;
  to: string;
  car: { count: number; totalTzs: number; paidTzs: number };
  stay: { count: number; totalTzs: number; paidTzs: number };
  byMonth: { month: string; car: { count: number; totalTzs: number }; stay: { count: number; totalTzs: number } }[];
}
export interface CalendarItem {
  id: number;
  service: Service;
  name: string;
  slug: string;
  bookings: Booking[];
  blocks: BlockedDate[];
}
export interface CalendarData {
  from: string;
  to: string;
  items: CalendarItem[];
}
export interface AdminBookingDetail extends Booking {
  payments?: Payment[];
  notifications?: { id: number; channel: string; status: string; createdAt: string; error?: string | null }[];
}

export function useAdminBookings(f: BookingFilters) {
  return useQuery({ queryKey: ["admin-bookings", f], queryFn: ({ signal }) => api.get<{ items: Booking[]; total: number; page: number; pageSize: number }>("/admin/bookings", { ...f }, signal) });
}
export function useAdminBooking(id: string | undefined) {
  return useQuery({ queryKey: ["admin-booking", id], queryFn: () => api.get<AdminBookingDetail>(`/admin/bookings/${id}`), enabled: !!id });
}
export function useRevenue(params?: { from?: string; to?: string }) {
  return useQuery({ queryKey: ["admin-revenue", params], queryFn: () => api.get<RevenueReport>("/admin/reports/revenue", params) });
}
export function useAdminCalendar(service: Service, from: string, to: string) {
  return useQuery({ queryKey: ["admin-calendar", service, from, to], queryFn: () => api.get<CalendarData>("/admin/calendar", { service, from, to }) });
}
export function useAdminList<T>(key: string, path: string) {
  return useQuery({ queryKey: ["admin", key], queryFn: () => api.get<T[]>(path) });
}
export const useAdminVehicles = () => useAdminList<Vehicle>("vehicles", "/admin/vehicles");
export const useAdminProperties = () => useAdminList<AdminProperty>("properties", "/admin/properties");
export const useAdminExtras = () => useAdminList<Extra>("extras", "/admin/extras");
export const useAdminZones = () => useAdminList<DeliveryZone>("delivery-zones", "/admin/delivery-zones");
export const useAdminPromos = () => useAdminList<PromoCode>("promo-codes", "/admin/promo-codes");
export const useAdminRates = () => useAdminList<SeasonalRate>("seasonal-rates", "/admin/seasonal-rates");
export const useAdminSettings = () => useQuery({ queryKey: ["admin", "settings"], queryFn: () => api.get<Settings>("/admin/settings") });

/** Generic create/update/delete for a resource; invalidates its list. */
export function useCrud<T extends { id: number }>(key: string, path: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", key] });
    qc.invalidateQueries({ queryKey: [key] }); // public lists
    qc.invalidateQueries({ queryKey: ["settings"] });
  };
  const create = useMutation({ mutationFn: (body: Partial<T>) => api.post<T>(path, body), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, ...body }: Partial<T> & { id: number }) => api.patch<T>(`${path}/${id}`, body), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number) => api.del<unknown>(`${path}/${id}`), onSuccess: invalidate });
  return { create, update, remove };
}

export function csvUrl(f: BookingFilters) {
  const token = getAdminToken();
  return `${API_BASE}/api/admin/bookings.csv${qs({ ...f, page: undefined, pageSize: undefined, ...(token ? { token } : {}) })}`;
}
