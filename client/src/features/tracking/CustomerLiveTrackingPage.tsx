import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Compass,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  SignalLow,
  Truck
} from "lucide-react";
import {
  getOrderTrackingChannelName,
  haversineDistanceKm,
  interpolateBearing,
  minDistanceToPolylineMeters,
  TRACKING_EVENT_RIDER_LOCATION,
  TRACKING_EVENT_TRIP_ENDED,
  type TripSessionInfo,
  type TruckLocationPayload
} from "@etukas/shared";
import { marketplaceApi } from "../../services/api";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabase";
import {
  fetchOsrmRoute,
  formatEtaDuration,
  formatLastSeenAgo,
  type OsrmRouteResult
} from "./osrm";

const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const INTERPOLATION_DURATION_MS = 30_000; // Smoothly glide over 30s between pings
const STALE_SIGNAL_THRESHOLD_MS = 90_000; // Show "Last seen X mins ago" after 90s silence
const ROUTE_DEVIATION_METERS = 1_500; // Only re-fetch OSRM if truck deviates > 1.5 km
const MIN_OSRM_REFETCH_INTERVAL_MS = 5 * 60_000; // At most once every 5 mins
const ROUTE_SOURCE_ID = "etukas-delivery-route";
const ROUTE_CASING_LAYER_ID = "etukas-delivery-route-casing";
const ROUTE_LINE_LAYER_ID = "etukas-delivery-route-line";

function createStorePinElement(label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "etukas-map-pin-store";
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="background:#0F172A;color:#FFFFFF;border:2px solid #FFFFFF;border-radius:12px;padding:4px 9px;font-size:11px;font-weight:800;box-shadow:0 6px 16px rgba(15,23,42,0.35);white-space:nowrap;display:flex;align-items:center;gap:5px;">
        <span style="width:7px;height:7px;border-radius:50%;background:#38BDF8;display:inline-block;"></span>
        <span>${label.slice(0, 22)}</span>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #0F172A;margin-top:-1px;"></div>
    </div>
  `;
  return el;
}

function createCustomerPinElement(label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "etukas-map-pin-customer";
  el.innerHTML = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="background:#C52228;color:#FFFFFF;border:2px solid #FFFFFF;border-radius:12px;padding:4px 9px;font-size:11px;font-weight:800;box-shadow:0 6px 16px rgba(197,34,40,0.45);white-space:nowrap;margin-bottom:4px;">
        Drop: ${label.slice(0, 20)}
      </div>
      <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:30px;height:30px;border-radius:50%;background:rgba(197,34,40,0.3);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;z-index:2;width:20px;height:20px;border-radius:50%;background:#C52228;border:3px solid #FFFFFF;box-shadow:0 2px 10px rgba(0,0,0,0.35);"></div>
      </div>
    </div>
  `;
  return el;
}

function createTruckMarkerElement(): { root: HTMLDivElement; rotator: HTMLDivElement } {
  const root = document.createElement("div");
  root.style.width = "52px";
  root.style.height = "52px";
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.cursor = "pointer";

  const rotator = document.createElement("div");
  rotator.style.width = "48px";
  rotator.style.height = "48px";
  rotator.style.display = "flex";
  rotator.style.alignItems = "center";
  rotator.style.justifyContent = "center";
  rotator.style.willChange = "transform";
  rotator.style.filter = "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.45))";

  // Top-down heavy delivery truck SVG pointing North (0 deg) so CSS rotate(bearing deg) matches compass
  rotator.innerHTML = `
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#FFFFFF" fill-opacity="0.95" stroke="#C52228" stroke-width="2.5"/>
      <!-- Direction nose arrow -->
      <path d="M24 4L28 10H20L24 4Z" fill="#C52228"/>
      <!-- Heavy Truck Cab -->
      <rect x="16" y="11" width="16" height="9" rx="3" fill="#C52228"/>
      <rect x="18" y="12.5" width="12" height="4" rx="1.5" fill="#FDE68A"/>
      <!-- Heavy Tipper / Cargo Bed -->
      <rect x="15" y="21" width="18" height="17" rx="2.5" fill="#1E293B"/>
      <rect x="17.5" y="23.5" width="13" height="12" rx="1.5" fill="#F59E0B"/>
      <!-- Wheels -->
      <rect x="13" y="13" width="2.5" height="5" rx="1" fill="#0F172A"/>
      <rect x="32.5" y="13" width="2.5" height="5" rx="1" fill="#0F172A"/>
      <rect x="13" y="28" width="2.5" height="6" rx="1" fill="#0F172A"/>
      <rect x="32.5" y="28" width="2.5" height="6" rx="1" fill="#0F172A"/>
    </svg>
  `;

  root.appendChild(rotator);
  return { root, rotator };
}

export function CustomerLiveTrackingPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const storeMarkerRef = useRef<maplibregl.Marker | null>(null);
  const customerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const truckMarkerRef = useRef<maplibregl.Marker | null>(null);
  const truckRotatorRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const renderedPosRef = useRef<{ lat: number; lng: number; bearing: number } | null>(null);

  const routeCoordsRef = useRef<[number, number][]>([]);
  const initialRouteFetchedRef = useRef(false);
  const lastOsrmFetchAtRef = useRef(0);
  const osrmRoadFactorRef = useRef(1.25);

  const [mapReady, setMapReady] = useState(false);
  const [liveLocation, setLiveLocation] = useState<TruckLocationPayload | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "fallback">("connecting");
  const [tripEndedByDriver, setTripEndedByDriver] = useState(false);
  const [osrmRoute, setOsrmRoute] = useState<OsrmRouteResult | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const supabaseEnabled = isSupabaseConfigured();

  // Initial load from backend DB (includes lastKnownLocation fallback snapshot)
  const {
    data: session,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery<TripSessionInfo>({
    queryKey: ["order-tracking-session", orderId],
    queryFn: ({ signal }) => marketplaceApi.getOrderTrackingSession(orderId, { signal }),
    enabled: Boolean(orderId),
    staleTime: 15_000,
    // Zero frequent polling when Supabase Realtime is active; gentle 60s fallback if Supabase isn't configured
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "DELIVERED" || status === "CANCELLED" || status === "REJECTED") return false;
      return supabaseEnabled ? false : 60_000;
    },
    refetchIntervalInBackground: false
  });

  // Periodic local tick every 15s to update "Last seen X mins ago" badge smoothly
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  // Helper to paint or update GeoJSON route polyline on MapLibre
  const drawRouteOnMap = useCallback((coordinates: [number, number][]) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || coordinates.length < 2) return;

    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates
      }
    };

    const existing = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
      return;
    }

    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: geojson
    });

    map.addLayer({
      id: ROUTE_CASING_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#FFFFFF",
        "line-width": 8,
        "line-opacity": 0.9
      }
    });

    map.addLayer({
      id: ROUTE_LINE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#C52228",
        "line-width": 4.5,
        "line-opacity": 0.95
      }
    });
  }, []);

  // Smoothly interpolate truck position & compass bearing over 30s using requestAnimationFrame
  const animateTruckTo = useCallback(
    (target: TruckLocationPayload, immediate = false) => {
      const marker = truckMarkerRef.current;
      const rotator = truckRotatorRef.current;
      if (!marker || !rotator) {
        renderedPosRef.current = {
          lat: target.lat,
          lng: target.lng,
          bearing: target.bearing
        };
        return;
      }

      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const startPos = renderedPosRef.current;
      if (immediate || !startPos) {
        marker.setLngLat([target.lng, target.lat]);
        rotator.style.transform = `rotate(${target.bearing}deg)`;
        renderedPosRef.current = {
          lat: target.lat,
          lng: target.lng,
          bearing: target.bearing
        };
        return;
      }

      const startLat = startPos.lat;
      const startLng = startPos.lng;
      const startBearing = startPos.bearing;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / INTERPOLATION_DURATION_MS);
        // Smooth ease-out curve for natural truck movement
        const eased = 1 - Math.pow(1 - progress, 2);

        const lat = startLat + (target.lat - startLat) * eased;
        const lng = startLng + (target.lng - startLng) * eased;
        const bearing = interpolateBearing(startBearing, target.bearing, Math.min(1, progress * 3));

        marker.setLngLat([lng, lat]);
        rotator.style.transform = `rotate(${bearing}deg)`;
        renderedPosRef.current = { lat, lng, bearing };

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    []
  );

  // Sync initial DB lastKnownLocation into live state
  useEffect(() => {
    if (!session?.lastKnownLocation) return;
    setLiveLocation((prev) => {
      if (!prev || session.lastKnownLocation!.timestamp > prev.timestamp) {
        return session.lastKnownLocation!;
      }
      return prev;
    });
  }, [session?.lastKnownLocation]);

  // Initialize MapLibre GL map once session coordinates arrive
  useEffect(() => {
    if (!session || !mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = session.lastKnownLocation
      ? [session.lastKnownLocation.lng, session.lastKnownLocation.lat]
      : [
          (session.storeLocation.lng + session.customerLocation.lng) / 2,
          (session.storeLocation.lat + session.customerLocation.lat) / 2
        ];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      center: initialCenter,
      zoom: 12,
      attributionControl: false
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    map.on("load", () => {
      setMapReady(true);

      // Store pin
      storeMarkerRef.current = new maplibregl.Marker({
        element: createStorePinElement(session.storeName || session.storeLocation.label || "Store"),
        anchor: "bottom"
      })
        .setLngLat([session.storeLocation.lng, session.storeLocation.lat])
        .addTo(map);

      // Customer drop pin
      customerMarkerRef.current = new maplibregl.Marker({
        element: createCustomerPinElement(
          session.customerLocation.label || session.customerName || "Site"
        ),
        anchor: "bottom"
      })
        .setLngLat([session.customerLocation.lng, session.customerLocation.lat])
        .addTo(map);

      // Truck marker (placed at lastKnownLocation or storeLocation initially)
      const truckInit = session.lastKnownLocation ?? {
        lat: session.storeLocation.lat,
        lng: session.storeLocation.lng,
        bearing: 0
      };
      const { root, rotator } = createTruckMarkerElement();
      truckRotatorRef.current = rotator;
      rotator.style.transform = `rotate(${truckInit.bearing}deg)`;
      renderedPosRef.current = {
        lat: truckInit.lat,
        lng: truckInit.lng,
        bearing: truckInit.bearing
      };

      truckMarkerRef.current = new maplibregl.Marker({
        element: root,
        anchor: "center"
      })
        .setLngLat([truckInit.lng, truckInit.lat])
        .addTo(map);

      // Fit bounds cleanly around pickup, drop, and truck
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([session.storeLocation.lng, session.storeLocation.lat]);
      bounds.extend([session.customerLocation.lng, session.customerLocation.lat]);
      if (session.lastKnownLocation) {
        bounds.extend([session.lastKnownLocation.lng, session.lastKnownLocation.lat]);
      }
      map.fitBounds(bounds, {
        padding: { top: 150, bottom: 180, left: 50, right: 50 },
        maxZoom: 15,
        duration: 800
      });

      if (routeCoordsRef.current.length >= 2) {
        drawRouteOnMap(routeCoordsRef.current);
      }
    });

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      storeMarkerRef.current?.remove();
      customerMarkerRef.current?.remove();
      truckMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [session?.orderId, drawRouteOnMap]);

  // Fetch initial OSRM driving route ONCE on load
  useEffect(() => {
    if (!session || initialRouteFetchedRef.current) return;
    initialRouteFetchedRef.current = true;
    lastOsrmFetchAtRef.current = Date.now();

    const origin = session.lastKnownLocation
      ? { lat: session.lastKnownLocation.lat, lng: session.lastKnownLocation.lng }
      : { lat: session.storeLocation.lat, lng: session.storeLocation.lng };

    const controller = new AbortController();
    fetchOsrmRoute(origin, session.customerLocation, controller.signal).then((route) => {
      routeCoordsRef.current = route.coordinates;
      const straightKm = Math.max(
        0.1,
        haversineDistanceKm(
          origin.lat,
          origin.lng,
          session.customerLocation.lat,
          session.customerLocation.lng
        )
      );
      osrmRoadFactorRef.current = Math.min(1.6, Math.max(1.1, route.distanceKm / straightKm));
      setOsrmRoute(route);
      drawRouteOnMap(route.coordinates);
    });

    return () => controller.abort();
  }, [session, drawRouteOnMap]);

  // Re-draw route once map style finishes loading if OSRM arrived earlier
  useEffect(() => {
    if (mapReady && osrmRoute && osrmRoute.coordinates.length >= 2) {
      drawRouteOnMap(osrmRoute.coordinates);
    }
  }, [mapReady, osrmRoute, drawRouteOnMap]);

  // Subscribe to Supabase Realtime channel order-tracking:{orderId}
  useEffect(() => {
    if (!session?.orderId) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      setRealtimeStatus("fallback");
      return;
    }

    setRealtimeStatus("connecting");
    const channelName = getOrderTrackingChannelName(session.orderId);
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: TRACKING_EVENT_RIDER_LOCATION }, ({ payload }) => {
        const update = payload as TruckLocationPayload | undefined;
        if (!update || typeof update.lat !== "number" || typeof update.lng !== "number") return;

        setLiveLocation(update);
        animateTruckTo(update, false);

        // Re-fetch OSRM ONLY if truck deviated significantly (> 1.5 km) and rate limit elapsed
        const now = Date.now();
        if (
          routeCoordsRef.current.length >= 2 &&
          now - lastOsrmFetchAtRef.current >= MIN_OSRM_REFETCH_INTERVAL_MS
        ) {
          const deviationMeters = minDistanceToPolylineMeters(
            { lat: update.lat, lng: update.lng },
            routeCoordsRef.current
          );
          if (deviationMeters > ROUTE_DEVIATION_METERS) {
            lastOsrmFetchAtRef.current = now;
            void fetchOsrmRoute(
              { lat: update.lat, lng: update.lng },
              session.customerLocation
            ).then((route) => {
              routeCoordsRef.current = route.coordinates;
              setOsrmRoute(route);
              drawRouteOnMap(route.coordinates);
            });
          }
        }
      })
      .on("broadcast", { event: TRACKING_EVENT_TRIP_ENDED }, () => {
        setTripEndedByDriver(true);
        void refetch();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("live");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("fallback");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.orderId, session?.customerLocation, animateTruckTo, drawRouteOnMap, refetch]);

  // Update truck marker immediately when map finishes loading or fallback poll updates liveLocation
  useEffect(() => {
    if (!mapReady || !liveLocation) return;
    const isSamePos =
      renderedPosRef.current &&
      Math.abs(renderedPosRef.current.lat - liveLocation.lat) < 0.00001 &&
      Math.abs(renderedPosRef.current.lng - liveLocation.lng) < 0.00001;
    if (!isSamePos) {
      animateTruckTo(liveLocation, !renderedPosRef.current);
    }
  }, [mapReady, liveLocation, animateTruckTo]);

  // Compute remaining distance & ETA locally using Haversine (0 extra API calls!)
  const telemetry = useMemo(() => {
    if (!session) return null;

    const currentPoint = liveLocation
      ? { lat: liveLocation.lat, lng: liveLocation.lng }
      : { lat: session.storeLocation.lat, lng: session.storeLocation.lng };

    const straightRemainingKm = haversineDistanceKm(
      currentPoint.lat,
      currentPoint.lng,
      session.customerLocation.lat,
      session.customerLocation.lng
    );

    // Apply road tortuosity factor learned from initial OSRM route
    const estimatedRoadKm =
      osrmRoute && !liveLocation
        ? osrmRoute.distanceKm
        : Math.round(straightRemainingKm * osrmRoadFactorRef.current * 10) / 10;

    // Estimate ETA using live truck speed when moving, otherwise heavy-truck avg 32 km/h
    const effectiveSpeedKmh =
      liveLocation && liveLocation.speedKmh >= 10
        ? Math.min(70, liveLocation.speedKmh)
        : 32;
    const etaMinutes =
      osrmRoute && !liveLocation
        ? osrmRoute.durationSeconds / 60
        : (estimatedRoadKm / effectiveSpeedKmh) * 60;

    const isStale =
      Boolean(liveLocation) && nowTick - liveLocation!.timestamp >= STALE_SIGNAL_THRESHOLD_MS;

    return {
      remainingKm: estimatedRoadKm,
      etaLabel: formatEtaDuration(etaMinutes),
      speedKmh: liveLocation ? Math.round(liveLocation.speedKmh) : 0,
      isStale,
      lastSeenLabel: liveLocation ? formatLastSeenAgo(liveLocation.timestamp, nowTick) : null
    };
  }, [session, liveLocation, osrmRoute, nowTick]);

  const handleRecenterTruck = () => {
    const map = mapRef.current;
    if (!map || !session) return;
    const target = liveLocation ?? {
      lat: session.storeLocation.lat,
      lng: session.storeLocation.lng
    };
    map.flyTo({ center: [target.lng, target.lat], zoom: 14.5, duration: 700 });
  };

  const handleFitFullRoute = () => {
    const map = mapRef.current;
    if (!map || !session) return;
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([session.storeLocation.lng, session.storeLocation.lat]);
    bounds.extend([session.customerLocation.lng, session.customerLocation.lat]);
    if (liveLocation) bounds.extend([liveLocation.lng, liveLocation.lat]);
    map.fitBounds(bounds, {
      padding: { top: 150, bottom: 180, left: 50, right: 50 },
      maxZoom: 15,
      duration: 700
    });
  };

  const isDelivered = session?.status === "DELIVERED" || tripEndedByDriver;
  const backOrderUrl = `/orders/${encodeURIComponent(orderId)}`;

  if (isLoading && !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <Loader2 size={36} className="animate-spin text-etukas-red mb-3" />
        <h2 className="text-base font-extrabold">Loading Live Vehicle Map...</h2>
        <p className="mt-1 text-xs text-slate-400">
          Connecting to route & last known truck position for Order #{orderId}
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <AlertTriangle size={34} className="mx-auto text-etukas-red mb-3" />
          <h2 className="text-lg font-black text-gray-900">Unable to Open Live Map</h2>
          <p className="mt-1.5 text-xs text-gray-600">
            {(error as Error)?.message || "Please sign in with the account that placed this order."}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              to={backOrderUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-etukas-red px-4 py-2.5 text-xs font-extrabold text-white"
            >
              <ArrowLeft size={14} />
              <span>Back to Order Details</span>
            </Link>
            <Link
              to="/orders"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700"
            >
              Go to My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-200">
      {/* Full-Viewport MapLibre GL Container */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* ─── TOP FLOATING STATUS CARD ─── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto max-w-xl rounded-3xl border border-gray-200/90 bg-white/95 p-3.5 sm:p-4 shadow-xl backdrop-blur-md">
          {/* Top Row: Back + Order Number + Live Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => navigate(backOrderUrl)}
                aria-label="Back to Order Details"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 active:scale-95 transition"
              >
                <ArrowLeft size={17} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-sm font-black text-gray-900">
                    Live Vehicle Track
                  </h1>
                  <span className="rounded-md bg-orange-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-orange-900">
                    #{session.orderNumber || session.orderId}
                  </span>
                </div>
                <p className="truncate text-[11px] text-gray-500">
                  {session.storeName} → {session.customerLocation.label || session.customerName}
                </p>
              </div>
            </div>

            {isDelivered ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
                <CheckCircle2 size={12} />
                <span>Delivered</span>
              </span>
            ) : liveLocation && !telemetry?.isStale ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE GPS</span>
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                <Radio size={12} />
                <span>{liveLocation ? "Signal Paused" : "Awaiting GPS"}</span>
              </span>
            )}
          </div>

          {/* Metrics Row: Live ETA + Remaining Distance + Speed */}
          {telemetry && (
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-gray-50/90 border border-gray-100 p-2.5 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-gray-500">
                  <Clock size={11} className="text-etukas-red" />
                  <span>Live ETA</span>
                </div>
                <div className="mt-0.5 text-sm sm:text-base font-black text-gray-900">
                  {isDelivered ? "Arrived" : telemetry.etaLabel}
                </div>
              </div>

              <div className="border-x border-gray-200">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-gray-500">
                  <Navigation size={11} className="text-blue-600" />
                  <span>Remaining</span>
                </div>
                <div className="mt-0.5 text-sm sm:text-base font-black text-gray-900">
                  {isDelivered ? "0 km" : `${telemetry.remainingKm} km`}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-gray-500">
                  <Compass size={11} className="text-emerald-600" />
                  <span>Truck Speed</span>
                </div>
                <div className="mt-0.5 text-sm sm:text-base font-black text-gray-900">
                  {liveLocation ? `${telemetry.speedKmh} km/h` : "—"}
                </div>
              </div>
            </div>
          )}

          {/* Highway Signal Loss Fallback Badge ("Last seen X mins ago") */}
          {telemetry?.isStale && telemetry.lastSeenLabel && !isDelivered && (
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-900">
              <div className="flex items-center gap-1.5">
                <SignalLow size={14} className="shrink-0 text-amber-600" />
                <span>{telemetry.lastSeenLabel} (Highway signal may be weak)</span>
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className="shrink-0 underline text-amber-950"
              >
                Check
              </button>
            </div>
          )}

          {/* Waiting for Driver First Ping Notice */}
          {!liveLocation && !isDelivered && (
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-[11px] font-semibold text-blue-900">
              <span>
                Showing pickup-to-site route. Live truck movement begins once driver taps{" "}
                <strong>Start Trip</strong>.
              </span>
              {realtimeStatus === "live" && (
                <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                  Listening
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT MAP CONTROLS ─── */}
      <div className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenterTruck}
          title="Center on Truck"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white/95 text-gray-800 shadow-lg hover:text-etukas-red active:scale-95 transition"
        >
          <LocateFixed size={18} />
        </button>
        <button
          type="button"
          onClick={handleFitFullRoute}
          title="Fit Full Route"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white/95 text-gray-800 shadow-lg hover:text-etukas-red active:scale-95 transition"
        >
          <Maximize2 size={17} />
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          title="Refresh Last Known Position"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white/95 text-gray-800 shadow-lg hover:text-etukas-red active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw size={17} className={isFetching ? "animate-spin text-etukas-red" : ""} />
        </button>
      </div>

      {/* ─── BOTTOM DRIVER & VEHICLE SHEET ─── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4 pb-safe">
        <div className="pointer-events-auto mx-auto max-w-xl rounded-3xl border border-gray-200/90 bg-white/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 border border-red-100 text-etukas-red">
                <Truck size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-black text-gray-900 truncate">
                    {session.driverName || "Delivery Driver"}
                  </span>
                  {session.vehicleNumber && (
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                      {session.vehicleNumber}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 truncate">
                  <MapPin size={11} className="shrink-0 text-etukas-red" />
                  <span className="truncate">
                    {session.customerLocation.address || "Construction Delivery Site"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session.driverPhone && (
                <a
                  href={`tel:${session.driverPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                >
                  <Phone size={14} />
                  <span>Call Driver</span>
                </a>
              )}
              <Link
                to={backOrderUrl}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100 transition"
              >
                <span>Order Steps</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
