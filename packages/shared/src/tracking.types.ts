import { z } from "zod";

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
  address?: string;
}

export interface TruckLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  bearing: number;
  speedKmh: number;
  timestamp: number;
}

export interface TripSessionInfo {
  orderId: string;
  orderNumber?: string;
  storeName?: string;
  customerName?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  status?: string;
  storeLocation: GeoPoint;
  customerLocation: GeoPoint;
  lastKnownLocation: TruckLocationPayload | null;
  isActive: boolean;
  expiresAt?: string;
}

export interface TrackingLinkResponse {
  orderId: string;
  token: string;
  trackingUrl: string;
  whatsappShareUrl: string;
  expiresAt: string;
  isActive: boolean;
}

export const driverLocationSnapshotSchema = z.object({
  token: z.string().trim().min(16).max(128),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  bearing: z.coerce.number().min(0).max(360).default(0),
  speedKmh: z.coerce.number().min(0).max(200).default(0),
  timestamp: z.coerce.number().int().positive().optional()
});

export const driverEndTripSchema = z.object({
  token: z.string().trim().min(16).max(128)
});

export const generateTrackingLinkSchema = z.object({
  clientOrigin: z.string().trim().url().optional(),
  expiresInHours: z.coerce.number().int().min(1).max(72).optional()
});

export type DriverLocationSnapshotInput = z.infer<typeof driverLocationSnapshotSchema>;
export type DriverEndTripInput = z.infer<typeof driverEndTripSchema>;
export type GenerateTrackingLinkInput = z.infer<typeof generateTrackingLinkSchema>;

export const TRACKING_CHANNEL_PREFIX = "order-tracking:";
export const TRACKING_EVENT_RIDER_LOCATION = "rider_location";
export const TRACKING_EVENT_TRIP_ENDED = "trip_ended";

export function getOrderTrackingChannelName(orderId: string): string {
  return `${TRACKING_CHANNEL_PREFIX}${orderId}`;
}

/**
 * Vehicle Live Tracking becomes enabled once vehicle loading starts
 * (LOADING_VEHICLE / PREPARING / ASSIGNED_DRIVER / DISPATCHED).
 */
export function isVehicleTrackingEnabledStatus(status?: string | null): boolean {
  if (!status) return false;
  return (
    status === "LOADING_VEHICLE" ||
    status === "PREPARING" ||
    status === "ASSIGNED_DRIVER" ||
    status === "DISPATCHED"
  );
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Great-circle Haversine distance in meters between two WGS84 points.
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Great-circle Haversine distance in kilometers rounded to 1 decimal place.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return Math.round((haversineDistanceMeters(lat1, lng1, lat2, lng2) / 1000) * 10) / 10;
}

/**
 * Computes initial compass bearing (0..360 degrees, 0 = North, clockwise)
 * from (lat1, lng1) to (lat2, lng2).
 */
export function computeCompassBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (lat1 === lat2 && lng1 === lng2) return 0;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Interpolates between two compass bearings along the shortest arc (0..360).
 */
export function interpolateBearing(fromDeg: number, toDegVal: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const start = ((fromDeg % 360) + 360) % 360;
  const end = ((toDegVal % 360) + 360) % 360;
  let delta = end - start;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return (start + delta * clampedT + 360) % 360;
}

/**
 * Computes minimum distance in meters from a point to a GeoJSON LineString
 * (array of [lng, lat] coordinates). Used to decide if the vehicle deviated
 * significantly from the cached OSRM route before making another OSRM call.
 */
export function minDistanceToPolylineMeters(
  point: { lat: number; lng: number },
  coordinates: ReadonlyArray<readonly [number, number]>
): number {
  if (!coordinates || coordinates.length === 0) return Infinity;
  let minDist = Infinity;
  for (let i = 0; i < coordinates.length; i++) {
    const [lng, lat] = coordinates[i];
    const dist = haversineDistanceMeters(point.lat, point.lng, lat, lng);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}
