import { useQuery } from "@tanstack/react-query";
import { marketplaceApi, type Technician } from "../services/api";
import { queryKeys } from "../lib/queryKeys";

export interface UseTechniciansParams {
  category?: string;
  q?: string;
  lat?: number;
  lng?: number;
  maxDistance?: number;
  maxCharge?: number;
  sort?: string;
}

export function useTechnicians(params: UseTechniciansParams = {}) {
  const normalizedParams = {
    category: params.category && params.category !== "all" ? params.category : undefined,
    q: params.q?.trim() || undefined,
    lat: params.lat,
    lng: params.lng,
    maxDistance: params.maxDistance,
    maxCharge: params.maxCharge,
    sort: params.sort
  };

  return useQuery<Technician[]>({
    queryKey: queryKeys.technicians.list(normalizedParams),
    queryFn: async ({ signal }) => {
      const res = await marketplaceApi.getTechnicians(normalizedParams, { signal });
      return Array.isArray(res) ? res : [];
    },
    staleTime: 60 * 1000
  });
}

export function useTechnicianProfile(id?: string, lat?: number, lng?: number) {
  return useQuery<Technician>({
    queryKey: queryKeys.technicians.detail(id || ""),
    queryFn: ({ signal }) => marketplaceApi.getTechnician(id!, lat, lng, { signal }),
    enabled: Boolean(id),
    staleTime: 3 * 60 * 1000
  });
}

