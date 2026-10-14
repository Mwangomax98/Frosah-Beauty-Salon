// React Query hooks for the public API.
import { useQuery } from "@tanstack/react-query";
import type { DeliveryZone, Extra, Property, Settings, Vehicle } from "@bluesparks/shared";
import { api, apiUrl } from "./api";
import { IMAGES } from "@/content/images";

export type PublicSettings = Omit<Settings, "vendorEmail">;
export type Blocked = { start: string; end: string };

export const FALLBACK_SETTINGS: PublicSettings = {
  usdRate: 2600,
  driverFeeDarTzs: 50000,
  driverFeeUpcountryTzs: 80000,
  bundleDiscountPercent: 10,
  businessWhatsapp: "255700000000", // PLACEHOLDER until settings load
  businessEmail: "hello@bluesparks.co.tz",
  businessPhone: "+255 700 000 000",
  businessAddress: "Masaki, Dar es Salaam",
  bnbBrandName: "Blue Spark Stays",
  siteImages: {},
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<PublicSettings>("/settings"),
    staleTime: 5 * 60_000,
    placeholderData: FALLBACK_SETTINGS,
  });
}

/** Bundled placeholder photos, overridden by anything the owner uploaded in Admin → Site photos. */
export function useSiteImages() {
  const { data } = useSettings();
  const uploaded = data?.siteImages ?? {};
  return {
    ...IMAGES,
    ...Object.fromEntries(Object.entries(uploaded).filter(([, v]) => !!v).map(([k, v]) => [k, apiUrl(v as string)])),
  } as typeof IMAGES;
}

export function useVehicles(params?: { from?: string; to?: string; pickupTime?: string; returnTime?: string }) {
  return useQuery({
    queryKey: ["vehicles", params ?? {}],
    queryFn: ({ signal }) => api.get<Vehicle[]>("/vehicles", params, signal),
  });
}

export function useVehicle(slug: string | undefined) {
  return useQuery({
    queryKey: ["vehicle", slug],
    queryFn: ({ signal }) => api.get<Vehicle & { blocked: Blocked[] }>(`/vehicles/${slug}`, undefined, signal),
    enabled: !!slug,
  });
}

export function useProperties(params?: { checkIn?: string; checkOut?: string; guests?: number; area?: string }) {
  return useQuery({
    queryKey: ["properties", params ?? {}],
    queryFn: ({ signal }) => api.get<Property[]>("/properties", params, signal),
  });
}

export function useProperty(slug: string | undefined) {
  return useQuery({
    queryKey: ["property", slug],
    queryFn: ({ signal }) => api.get<Property & { blocked: Blocked[] }>(`/properties/${slug}`, undefined, signal),
    enabled: !!slug,
  });
}

export function useExtras(service: "car" | "stay") {
  return useQuery({
    queryKey: ["extras", service],
    queryFn: ({ signal }) => api.get<Extra[]>("/extras", { service }, signal),
  });
}

export function useDeliveryZones() {
  return useQuery({
    queryKey: ["delivery-zones"],
    queryFn: ({ signal }) => api.get<DeliveryZone[]>("/delivery-zones", undefined, signal),
  });
}
