export const DEFAULT_DELIVERY_RADIUS_KM = 25;
export const MIN_DELIVERY_RADIUS_KM = 1;
export const MAX_DELIVERY_RADIUS_KM = 500;

/**
 * Computes great-circle distance in kilometers between two WGS84 coordinates
 * using the Haversine formula, rounded to 1 decimal place.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function resolveEffectiveDeliveryRadiusKm(
  productRadiusKm?: number | null,
  storeRadiusKm?: number | null
): number {
  if (typeof productRadiusKm === "number" && Number.isFinite(productRadiusKm) && productRadiusKm >= MIN_DELIVERY_RADIUS_KM) {
    return Math.min(MAX_DELIVERY_RADIUS_KM, Math.round(productRadiusKm));
  }
  if (typeof storeRadiusKm === "number" && Number.isFinite(storeRadiusKm) && storeRadiusKm >= MIN_DELIVERY_RADIUS_KM) {
    return Math.min(MAX_DELIVERY_RADIUS_KM, Math.round(storeRadiusKm));
  }
  return DEFAULT_DELIVERY_RADIUS_KM;
}

export function evaluateProductDeliveryRange(params: {
  customerLat?: number | null;
  customerLng?: number | null;
  customerCity?: string | null;
  storeLat?: unknown;
  storeLng?: unknown;
  storeCity?: string | null;
  productRadiusKm?: number | null;
  storeRadiusKm?: number | null;
}): {
  deliveryRadiusKm: number;
  distanceKm: number | null;
  isDeliverable: boolean;
} {
  const deliveryRadiusKm = resolveEffectiveDeliveryRadiusKm(
    params.productRadiusKm,
    params.storeRadiusKm
  );

  const cLat = parseCoordinate(params.customerLat);
  const cLng = parseCoordinate(params.customerLng);

  // If customer has not supplied coordinates, do not block visibility
  if (cLat === null || cLng === null) {
    return { deliveryRadiusKm, distanceKm: null, isDeliverable: true };
  }

  const sLat = parseCoordinate(params.storeLat);
  const sLng = parseCoordinate(params.storeLng);

  // Primary: exact Haversine radius check against partner/product delivery radius
  if (sLat !== null && sLng !== null) {
    const distanceKm = calculateDistanceKm(cLat, cLng, sLat, sLng);
    return {
      deliveryRadiusKm,
      distanceKm,
      isDeliverable: distanceKm <= deliveryRadiusKm
    };
  }

  // Fallback for legacy stores missing map coordinates: allow only on city match
  const normalizedCustomerCity = (params.customerCity ?? "").trim().toLowerCase();
  const normalizedStoreCity = (params.storeCity ?? "").trim().toLowerCase();
  if (normalizedCustomerCity && normalizedStoreCity) {
    const cityMatches =
      normalizedStoreCity.includes(normalizedCustomerCity) ||
      normalizedCustomerCity.includes(normalizedStoreCity);
    return { deliveryRadiusKm, distanceKm: null, isDeliverable: cityMatches };
  }

  return { deliveryRadiusKm, distanceKm: null, isDeliverable: false };
}

export function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string; meta?: { column?: string } };
  if (err.code !== "P2022") return false;
  const target = columnName.toLowerCase();
  const metaCol = String(err.meta?.column ?? "").toLowerCase();
  const msg = String(err.message ?? "").toLowerCase();
  return metaCol.includes(target) || msg.includes(target);
}
