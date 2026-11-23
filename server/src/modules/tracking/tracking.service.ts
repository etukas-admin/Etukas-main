import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type DriverLocationSnapshotInput,
  type GeoPoint,
  type TrackingLinkResponse,
  type TripSessionInfo,
  type TruckLocationPayload
} from "@etukas/shared";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/http.js";
import { parseCoordinate } from "../../utils/geo.js";
import {
  buildTrackingMetadata,
  findOrderById,
  normalizeDeliveryStatus,
  saveOrder,
  type OrderRecord
} from "../orders/orders.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_FILE_PATH = path.resolve(__dirname, "../../../data/tracking-sessions.json");

const TERMINAL_ORDER_STATUSES = new Set(["DELIVERED", "CANCELLED", "REJECTED"]);
const DEFAULT_LINK_EXPIRY_HOURS = 24;

export interface StoredTripSession {
  token: string;
  orderId: string;
  isActive: boolean;
  startedAt?: string | null;
  endedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

const sessionsMemoryStore = new Map<string, StoredTripSession>();

function initSessionsStore(): void {
  try {
    if (fs.existsSync(SESSIONS_FILE_PATH)) {
      const raw = fs.readFileSync(SESSIONS_FILE_PATH, "utf8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && typeof item.token === "string" && typeof item.orderId === "string") {
            sessionsMemoryStore.set(item.token, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[tracking] Failed to load fallback tracking sessions:", err);
  }
}

function persistSessionsToDisk(): void {
  if (process.env.VITEST) return;
  try {
    const dir = path.dirname(SESSIONS_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      SESSIONS_FILE_PATH,
      JSON.stringify(Array.from(sessionsMemoryStore.values()), null, 2),
      "utf8"
    );
  } catch {
    // Expected on read-only serverless filesystems (e.g., Vercel); PostgreSQL is primary store
  }
}

initSessionsStore();

const CITY_FALLBACK_COORDS: Record<string, { lat: number; lng: number }> = {
  kakinada: { lat: 16.9891, lng: 82.2475 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  vizag: { lat: 17.6868, lng: 83.2185 },
  vijayawada: { lat: 16.5062, lng: 80.648 },
  rajahmundry: { lat: 17.0005, lng: 81.804 },
  guntur: { lat: 16.3067, lng: 80.4365 },
  tirupati: { lat: 13.6288, lng: 79.4192 },
  warangal: { lat: 17.9689, lng: 79.5941 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 }
};

function resolveCityFallbackCoord(city?: string | null): { lat: number; lng: number } {
  const normalized = (city || "").trim().toLowerCase();
  for (const [key, coords] of Object.entries(CITY_FALLBACK_COORDS)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }
  // Default Etukas hub (Kakinada, AP)
  return { lat: 16.9891, lng: 82.2475 };
}

function resolveClientBaseOrigin(requestedOrigin?: string): string {
  const configuredOrigins = env.CLIENT_URL.split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (requestedOrigin) {
    try {
      const parsed = new URL(requestedOrigin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        const clean = parsed.origin.replace(/\/+$/, "");
        if (
          env.NODE_ENV !== "production" ||
          configuredOrigins.includes(clean) ||
          clean === "https://etukas.com" ||
          clean === "https://www.etukas.com" ||
          clean.endsWith(".vercel.app")
        ) {
          return clean;
        }
      }
    } catch {
      // Ignore malformed origin
    }
  }

  return configuredOrigins[0] || "https://etukas.com";
}

function formatAddressSummary(addr?: OrderRecord["deliveryAddress"]): string {
  if (!addr) return "Customer Construction Site";
  return [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode]
    .filter(Boolean)
    .join(", ");
}

export function buildWhatsappShareUrl(params: {
  order: OrderRecord;
  trackingUrl: string;
}): string {
  const { order, trackingUrl } = params;
  const orderCode = order.orderNumber || order.id;
  const siteSummary = [order.deliveryAddress?.line1, order.deliveryAddress?.city]
    .filter(Boolean)
    .join(", ");

  const lines = [
    `🚛 Etukas Live Delivery Tracking`,
    `Order: #${orderCode}`,
    order.vehicleNumber ? `Vehicle: ${order.vehicleNumber}` : null,
    `Pickup: ${order.storeName}`,
    siteSummary ? `Drop Site: ${siteSummary}` : null,
    ``,
    `దయచేసి ఈ లింక్ ఓపెన్ చేసి "Start Trip (లారీ బయలుదేరింది)" నొక్కండి:`,
    `Open this link & tap "Start Trip" to share live truck location:`,
    trackingUrl
  ].filter((line): line is string => line !== null);

  const message = lines.join("\n");
  const rawDriverDigits = (order.driverPhone || "").replace(/\D/g, "");
  let whatsappTarget = "";
  if (rawDriverDigits.length === 10) {
    whatsappTarget = `91${rawDriverDigits}`;
  } else if (rawDriverDigits.length >= 11 && rawDriverDigits.length <= 15) {
    whatsappTarget = rawDriverDigits;
  }

  return `https://wa.me/${whatsappTarget}?text=${encodeURIComponent(message)}`;
}

async function resolveOrderRoutePoints(order: OrderRecord): Promise<{
  storeLocation: GeoPoint;
  customerLocation: GeoPoint;
  dbLastKnownLocation: TruckLocationPayload | null;
}> {
  let storeLat: number | null = parseCoordinate(order.storeLocation?.lat);
  let storeLng: number | null = parseCoordinate(order.storeLocation?.lng);
  let storeAddress = order.storeLocation?.address || "";

  let custLat: number | null = parseCoordinate(order.deliveryAddress?.latitude);
  let custLng: number | null = parseCoordinate(order.deliveryAddress?.longitude);
  let dbLastKnownLocation: TruckLocationPayload | null = order.lastKnownLocation ?? null;

  try {
    const dbOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: order.id }, { id: order.orderNumber }]
      },
      include: {
        store: {
          select: {
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            latitude: true,
            longitude: true
          }
        },
        address: {
          select: {
            line1: true,
            city: true,
            state: true,
            postalCode: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    if (dbOrder) {
      if (storeLat === null) storeLat = parseCoordinate(dbOrder.store?.latitude);
      if (storeLng === null) storeLng = parseCoordinate(dbOrder.store?.longitude);
      if (!storeAddress && dbOrder.store) {
        storeAddress = [
          dbOrder.store.addressLine1,
          dbOrder.store.city,
          dbOrder.store.state,
          dbOrder.store.postalCode
        ]
          .filter(Boolean)
          .join(", ");
      }

      if (custLat === null) custLat = parseCoordinate(dbOrder.address?.latitude);
      if (custLng === null) custLng = parseCoordinate(dbOrder.address?.longitude);

      const dbAny = dbOrder as unknown as {
        lastLat?: number | null;
        lastLng?: number | null;
        lastBearing?: number | null;
        lastSpeedKmh?: number | null;
        lastSeenAt?: Date | string | null;
      };
      const lat = parseCoordinate(dbAny.lastLat);
      const lng = parseCoordinate(dbAny.lastLng);
      if (lat !== null && lng !== null) {
        const ts = dbAny.lastSeenAt ? new Date(dbAny.lastSeenAt).getTime() : Date.now();
        if (!dbLastKnownLocation || ts >= dbLastKnownLocation.timestamp) {
          dbLastKnownLocation = {
            orderId: order.id,
            lat,
            lng,
            bearing: parseCoordinate(dbAny.lastBearing) ?? 0,
            speedKmh: parseCoordinate(dbAny.lastSpeedKmh) ?? 0,
            timestamp: Number.isFinite(ts) ? ts : Date.now()
          };
        }
      }
    }
  } catch {
    // Graceful fallback if DB is offline or columns not migrated yet
    try {
      if (order.storeId && (storeLat === null || storeLng === null)) {
        const dbStore = await prisma.store.findUnique({
          where: { id: order.storeId },
          select: {
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            latitude: true,
            longitude: true
          }
        });
        if (dbStore) {
          if (storeLat === null) storeLat = parseCoordinate(dbStore.latitude);
          if (storeLng === null) storeLng = parseCoordinate(dbStore.longitude);
          if (!storeAddress) {
            storeAddress = [dbStore.addressLine1, dbStore.city, dbStore.state, dbStore.postalCode]
              .filter(Boolean)
              .join(", ");
          }
        }
      }
    } catch {
      // Ignore offline DB
    }
  }

  const cityCenter = resolveCityFallbackCoord(order.deliveryAddress?.city);

  // Ensure both pickup & drop pins always have valid WGS84 coordinates
  if (storeLat === null || storeLng === null) {
    storeLat = Number((cityCenter.lat - 0.032).toFixed(6));
    storeLng = Number((cityCenter.lng - 0.028).toFixed(6));
  }
  if (custLat === null || custLng === null) {
    custLat = Number((cityCenter.lat + 0.025).toFixed(6));
    custLng = Number((cityCenter.lng + 0.022).toFixed(6));
  }

  return {
    storeLocation: {
      lat: storeLat,
      lng: storeLng,
      label: order.storeName || "Pickup Store",
      address: storeAddress || `${order.storeName}, ${order.deliveryAddress?.city || "Depot"}`
    },
    customerLocation: {
      lat: custLat,
      lng: custLng,
      label: order.deliveryAddress?.contactName || order.customerName || "Delivery Site",
      address: formatAddressSummary(order.deliveryAddress)
    },
    dbLastKnownLocation
  };
}

function buildTripSessionInfo(
  order: OrderRecord,
  points: {
    storeLocation: GeoPoint;
    customerLocation: GeoPoint;
    dbLastKnownLocation: TruckLocationPayload | null;
  },
  isActive: boolean,
  expiresAt?: string
): TripSessionInfo {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    storeName: order.storeName,
    customerName: order.customerName,
    vehicleNumber: order.vehicleNumber,
    driverName: order.driverName,
    driverPhone: order.driverPhone,
    status: normalizeDeliveryStatus(order.status),
    storeLocation: points.storeLocation,
    customerLocation: points.customerLocation,
    lastKnownLocation: points.dbLastKnownLocation ?? order.lastKnownLocation ?? null,
    isActive,
    expiresAt
  };
}

async function syncOrderMetadataToDb(order: OrderRecord): Promise<void> {
  try {
    await prisma.order.updateMany({
      where: {
        OR: [{ id: order.id }, { id: order.orderNumber }]
      },
      data: {
        trackingMetadata: buildTrackingMetadata(order) as any
      }
    });
  } catch {
    // Non-fatal fallback
  }
}

/**
 * Generates a secure random hex token mapped to the orderId, persists it in PostgreSQL
 * (with graceful fallback to trackingMetadata + local store), and returns trackingUrl + WhatsApp URL.
 */
export async function generateTrackingLink(
  order: OrderRecord,
  options: { clientOrigin?: string; expiresInHours?: number } = {}
): Promise<TrackingLinkResponse> {
  const status = normalizeDeliveryStatus(order.status);
  if (TERMINAL_ORDER_STATUSES.has(status)) {
    throw new HttpError(
      409,
      "ORDER_TERMINAL_STATE",
      `Cannot generate a live tracking link because this order is already ${status.toLowerCase()}.`
    );
  }

  const token = crypto.randomBytes(24).toString("hex");
  const hours = options.expiresInHours ?? DEFAULT_LINK_EXPIRY_HOURS;
  const now = new Date();
  const expiresAtDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const expiresAtIso = expiresAtDate.toISOString();

  // Deactivate previous sessions in memory store for this order
  for (const existing of sessionsMemoryStore.values()) {
    if (existing.orderId === order.id && existing.isActive) {
      existing.isActive = false;
      existing.endedAt = now.toISOString();
    }
  }

  const sessionRecord: StoredTripSession = {
    token,
    orderId: order.id,
    isActive: true,
    startedAt: null,
    endedAt: null,
    expiresAt: expiresAtIso,
    createdAt: now.toISOString()
  };
  sessionsMemoryStore.set(token, sessionRecord);
  persistSessionsToDisk();

  // Persist in PostgreSQL DeliveryTripSession table
  try {
    await prisma.deliveryTripSession.updateMany({
      where: { orderId: order.id, isActive: true },
      data: { isActive: false, endedAt: now }
    });
    await prisma.deliveryTripSession.create({
      data: {
        token,
        orderId: order.id,
        isActive: true,
        expiresAt: expiresAtDate
      }
    });
  } catch (err) {
    console.warn("[tracking] Prisma DeliveryTripSession persistence fallback:", (err as Error)?.message || err);
  }

  // Also mirror active session reference on order metadata for serverless resilience
  order.activeTripToken = token;
  order.activeTripExpiresAt = expiresAtIso;
  order.activeTripIsActive = true;
  order.updatedAt = now.toISOString();
  saveOrder(order);
  await syncOrderMetadataToDb(order);

  const baseOrigin = resolveClientBaseOrigin(options.clientOrigin);
  const trackingUrl = `${baseOrigin}/driver/live?token=${encodeURIComponent(token)}`;
  const whatsappShareUrl = buildWhatsappShareUrl({ order, trackingUrl });

  return {
    orderId: order.id,
    token,
    trackingUrl,
    whatsappShareUrl,
    expiresAt: expiresAtIso,
    isActive: true
  };
}

async function lookupSessionByToken(token: string): Promise<StoredTripSession | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  // 1. Primary: PostgreSQL DeliveryTripSession
  try {
    const dbSession = await prisma.deliveryTripSession.findUnique({
      where: { token: cleanToken }
    });
    if (dbSession) {
      const record: StoredTripSession = {
        token: dbSession.token,
        orderId: dbSession.orderId,
        isActive: dbSession.isActive,
        startedAt: dbSession.startedAt ? dbSession.startedAt.toISOString() : null,
        endedAt: dbSession.endedAt ? dbSession.endedAt.toISOString() : null,
        expiresAt: dbSession.expiresAt.toISOString(),
        createdAt: dbSession.createdAt.toISOString()
      };
      sessionsMemoryStore.set(record.token, record);
      return record;
    }
  } catch {
    // Fallback if table not migrated or DB offline
  }

  // 2. Secondary: local memory/disk store
  const mem = sessionsMemoryStore.get(cleanToken);
  if (mem) return mem;

  // 3. Tertiary: search Order.trackingMetadata in PostgreSQL (in case DeliveryTripSession migration not yet applied)
  try {
    const recentOrders = await prisma.order.findMany({
      where: {
        status: { notIn: ["CANCELLED", "REJECTED"] }
      },
      select: { id: true, trackingMetadata: true, status: true, createdAt: true },
      orderBy: { updatedAt: "desc" },
      take: 100
    });
    for (const row of recentOrders) {
      const meta = row.trackingMetadata as Record<string, unknown> | null;
      if (meta && meta.activeTripToken === cleanToken) {
        const record: StoredTripSession = {
          token: cleanToken,
          orderId: row.id,
          isActive: Boolean(meta.activeTripIsActive ?? true),
          expiresAt:
            typeof meta.activeTripExpiresAt === "string"
              ? meta.activeTripExpiresAt
              : new Date(Date.now() + DEFAULT_LINK_EXPIRY_HOURS * 3600_000).toISOString(),
          createdAt: row.createdAt.toISOString()
        };
        sessionsMemoryStore.set(cleanToken, record);
        return record;
      }
    }
  } catch {
    // Ignore DB offline
  }

  return null;
}

function isSessionExpired(session: StoredTripSession): boolean {
  const expMs = new Date(session.expiresAt).getTime();
  return !Number.isFinite(expMs) || expMs <= Date.now();
}

/**
 * Validates driver token and returns TripSessionInfo.
 * Returns 404 if token does not exist, or 410 Gone if order is delivered/cancelled/rejected or token expired/inactive.
 */
export async function getDriverTripSession(token: string): Promise<TripSessionInfo> {
  const session = await lookupSessionByToken(token);
  if (!session) {
    throw new HttpError(404, "INVALID_TRACKING_TOKEN", "Tracking link is invalid or not found.");
  }

  const order = await findOrderById(session.orderId);
  if (!order) {
    throw new HttpError(404, "ORDER_NOT_FOUND", "Associated order could not be found.");
  }

  const status = normalizeDeliveryStatus(order.status);
  if (TERMINAL_ORDER_STATUSES.has(status) || !session.isActive || isSessionExpired(session)) {
    await deactivateOrderTripSessions(order.id);
    throw new HttpError(
      410,
      "TRIP_SESSION_GONE",
      status === "DELIVERED"
        ? "This order has already been delivered. Live tracking is closed."
        : "This tracking link has expired or the trip has ended."
    );
  }

  const points = await resolveOrderRoutePoints(order);
  return buildTripSessionInfo(order, points, true, session.expiresAt);
}

/**
 * Validates driver token and persists lastLat, lastLng, lastBearing, lastSpeedKmh, lastSeenAt
 * onto the Order record as a durable fallback against highway signal drops & page refreshes.
 */
export async function saveDriverLocationSnapshot(
  input: DriverLocationSnapshotInput
): Promise<{ saved: true; orderId: string; lastKnownLocation: TruckLocationPayload }> {
  const session = await lookupSessionByToken(input.token);
  if (!session) {
    throw new HttpError(404, "INVALID_TRACKING_TOKEN", "Tracking token is invalid.");
  }

  const order = await findOrderById(session.orderId);
  if (!order) {
    throw new HttpError(404, "ORDER_NOT_FOUND", "Associated order could not be found.");
  }

  const status = normalizeDeliveryStatus(order.status);
  if (TERMINAL_ORDER_STATUSES.has(status) || !session.isActive || isSessionExpired(session)) {
    await deactivateOrderTripSessions(order.id);
    throw new HttpError(
      410,
      "TRIP_SESSION_GONE",
      "This trip is no longer active because the order was delivered or the session expired."
    );
  }

  const timestamp = input.timestamp ?? Date.now();
  const seenDate = new Date(timestamp);

  const locationPayload: TruckLocationPayload = {
    orderId: order.id,
    lat: input.lat,
    lng: input.lng,
    bearing: input.bearing,
    speedKmh: input.speedKmh,
    timestamp
  };

  order.lastKnownLocation = locationPayload;
  order.updatedAt = new Date().toISOString();
  saveOrder(order);

  if (!session.startedAt) {
    session.startedAt = seenDate.toISOString();
    sessionsMemoryStore.set(session.token, session);
    persistSessionsToDisk();
  }

  // Persist columns + trackingMetadata in PostgreSQL
  try {
    await prisma.order.updateMany({
      where: {
        OR: [{ id: order.id }, { id: order.orderNumber }]
      },
      data: {
        lastLat: locationPayload.lat,
        lastLng: locationPayload.lng,
        lastBearing: locationPayload.bearing,
        lastSpeedKmh: locationPayload.speedKmh,
        lastSeenAt: seenDate,
        trackingMetadata: buildTrackingMetadata(order) as any
      }
    });
  } catch {
    // Graceful fallback if new columns aren't migrated yet — still persist in trackingMetadata
    await syncOrderMetadataToDb(order);
  }

  try {
    await prisma.deliveryTripSession.updateMany({
      where: { token: session.token, startedAt: null },
      data: { startedAt: seenDate }
    });
  } catch {
    // Non-fatal
  }

  return {
    saved: true,
    orderId: order.id,
    lastKnownLocation: locationPayload
  };
}

/**
 * Allows the driver to explicitly end their trip from the mobile web page.
 */
export async function endDriverTrip(token: string): Promise<{ ended: true; orderId: string }> {
  const session = await lookupSessionByToken(token);
  if (!session) {
    throw new HttpError(404, "INVALID_TRACKING_TOKEN", "Tracking token is invalid.");
  }

  const order = await findOrderById(session.orderId);
  if (!order) {
    throw new HttpError(404, "ORDER_NOT_FOUND", "Associated order could not be found.");
  }

  if (!session.isActive || isSessionExpired(session)) {
    throw new HttpError(410, "TRIP_SESSION_GONE", "This trip has already ended.");
  }

  await deactivateOrderTripSessions(order.id);

  // Record driver trip completion note without altering payment/order accounting
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status: normalizeDeliveryStatus(order.status),
    timestamp: new Date().toISOString(),
    note: "Driver ended live GPS sharing trip.",
    actor: order.driverName ? `Driver (${order.driverName})` : "Driver"
  });
  order.updatedAt = new Date().toISOString();
  saveOrder(order);
  await syncOrderMetadataToDb(order);

  return { ended: true, orderId: order.id };
}

/**
 * Marks all DeliveryTripSession records for an order as inactive (e.g., when status changes to DELIVERED).
 */
export async function deactivateOrderTripSessions(orderId: string): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();

  let changed = false;
  for (const session of sessionsMemoryStore.values()) {
    if (session.orderId === orderId && session.isActive) {
      session.isActive = false;
      session.endedAt = nowIso;
      changed = true;
    }
  }
  if (changed) {
    persistSessionsToDisk();
  }

  try {
    await prisma.deliveryTripSession.updateMany({
      where: { orderId, isActive: true },
      data: { isActive: false, endedAt: now }
    });
  } catch {
    // Non-fatal if DB offline or migration pending
  }

  const order = await findOrderById(orderId);
  if (order && order.activeTripIsActive) {
    order.activeTripIsActive = false;
    saveOrder(order);
    await syncOrderMetadataToDb(order);
  }
}

/**
 * Returns live TripSessionInfo for an authenticated customer, seller, or admin viewing the tracking map.
 */
export async function getOrderTrackingSessionForViewer(order: OrderRecord): Promise<TripSessionInfo> {
  const status = normalizeDeliveryStatus(order.status);
  const isTerminal = TERMINAL_ORDER_STATUSES.has(status);
  let hasActiveSession = false;
  let expiresAt: string | undefined = order.activeTripExpiresAt;

  if (!isTerminal) {
    try {
      const dbSession = await prisma.deliveryTripSession.findFirst({
        where: {
          orderId: order.id,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });
      if (dbSession) {
        hasActiveSession = true;
        expiresAt = dbSession.expiresAt.toISOString();
      }
    } catch {
      // Fallback to memory / metadata
    }

    if (!hasActiveSession) {
      for (const s of sessionsMemoryStore.values()) {
        if (s.orderId === order.id && s.isActive && !isSessionExpired(s)) {
          hasActiveSession = true;
          expiresAt = s.expiresAt;
          break;
        }
      }
    }

    if (
      !hasActiveSession &&
      order.activeTripIsActive &&
      order.activeTripExpiresAt &&
      new Date(order.activeTripExpiresAt).getTime() > Date.now()
    ) {
      hasActiveSession = true;
    }
  }

  const points = await resolveOrderRoutePoints(order);
  return buildTripSessionInfo(order, points, hasActiveSession, expiresAt);
}
