import { haversineDistanceKm } from "@etukas/shared";

export interface OsrmRouteResult {
  coordinates: [number, number][]; // GeoJSON [lng, lat][]
  distanceKm: number;
  durationSeconds: number;
  isFallback: boolean;
}

const HEAVY_TRUCK_AVG_SPEED_KMH = 34;

/**
 * Fetches a driving route from the free public OSRM server.
 * Call ONLY once on initial load (and only re-fetch on large route deviations)
 * to stay well within public OSRM fair-use limits.
 */
export async function fetchOsrmRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  signal?: AbortSignal
): Promise<OsrmRouteResult> {
  const straightKm = haversineDistanceKm(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  const fallback: OsrmRouteResult = {
    coordinates: [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat]
    ],
    distanceKm: Math.max(0.2, Math.round(straightKm * 1.25 * 10) / 10),
    durationSeconds: Math.max(
      180,
      Math.round(((straightKm * 1.25) / HEAVY_TRUCK_AVG_SPEED_KMH) * 3600)
    ),
    isFallback: true
  };

  if (straightKm < 0.05) {
    return {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat]
      ],
      distanceKm: 0,
      durationSeconds: 0,
      isFallback: false
    };
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return fallback;
    const data = (await response.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: {
          coordinates?: [number, number][];
        };
      }>;
    };

    const route = data.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!route || !Array.isArray(coords) || coords.length < 2) {
      return fallback;
    }

    const distanceKm = Math.round(((route.distance ?? straightKm * 1000) / 1000) * 10) / 10;
    // Heavy trucks (sand/cement/bricks) typically move ~25% slower than passenger car OSRM estimates
    const durationSeconds = Math.round((route.duration ?? fallback.durationSeconds) * 1.25);

    return {
      coordinates: coords,
      distanceKm,
      durationSeconds,
      isFallback: false
    };
  } catch {
    return fallback;
  }
}

export function formatEtaDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 2) return "Arriving soon";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `~${rounded} min${rounded === 1 ? "" : "s"}`;
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins === 0 ? `~${hrs} hr${hrs === 1 ? "" : "s"}` : `~${hrs}h ${mins}m`;
}

export function formatLastSeenAgo(timestampMs: number, nowMs: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 60) return "Just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Last seen ${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `Last seen ${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return `Last seen ${hrs}h ${remMins}m ago`;
}
