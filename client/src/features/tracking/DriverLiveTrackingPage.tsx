import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Play,
  Radio,
  ShieldCheck,
  Square,
  Truck,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  computeCompassBearing,
  getOrderTrackingChannelName,
  haversineDistanceKm,
  haversineDistanceMeters,
  TRACKING_EVENT_RIDER_LOCATION,
  TRACKING_EVENT_TRIP_ENDED,
  type TripSessionInfo,
  type TruckLocationPayload
} from "@etukas/shared";
import { ApiError, marketplaceApi } from "../../services/api";
import { getSupabaseClient } from "../../lib/supabase";

const THROTTLE_INTERVAL_MS = 30_000; // 30 seconds — battery & Supabase free-tier friendly
const MIN_MOVEMENT_METERS = 15; // Skip noisy GPS jitter < 15 meters

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

type SessionPhase =
  | "loading"
  | "invalid"
  | "gone"
  | "ready"
  | "tracking"
  | "ended";

export function DriverLiveTrackingPage() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();

  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [session, setSession] = useState<TripSessionInfo | null>(null);

  // Live telemetry state
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [networkWarning, setNetworkWarning] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastSentPayload, setLastSentPayload] = useState<TruckLocationPayload | null>(null);
  const [pingsSent, setPingsSent] = useState(0);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);

  // Refs for cleanup and throttling
  const isTrackingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const lastSentPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevRawPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Load & validate driver session on mount
  useEffect(() => {
    if (!token) {
      setPhase("invalid");
      setErrorMessage("Missing tracking token. Please open the exact link sent on WhatsApp.");
      return;
    }

    let cancelled = false;
    setPhase("loading");

    marketplaceApi
      .getDriverTripSession(token)
      .then((info) => {
        if (cancelled) return;
        setSession(info);
        if (info.lastKnownLocation) {
          setLastSentPayload(info.lastKnownLocation);
        }
        setPhase("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 410) {
          setPhase("gone");
          setErrorMessage(err.message);
        } else {
          setPhase("invalid");
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Unable to verify this tracking link. Please ask the store to send a new link."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Screen Wake Lock helper
  const requestScreenWakeLock = useCallback(async () => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock?.request) {
      setWakeLockSupported(false);
      setWakeLockActive(false);
      return;
    }
    try {
      const sentinel = await nav.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener?.("release", () => {
        setWakeLockActive(false);
      });
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  const releaseScreenWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockActive(false);
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // Ignore release errors
      }
    }
  }, []);

  // Re-acquire Wake Lock whenever the driver brings the browser tab back into view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isTrackingRef.current) {
        void requestScreenWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requestScreenWakeLock]);

  const stopAllTrackingResources = useCallback(async () => {
    isTrackingRef.current = false;

    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    await releaseScreenWakeLock();

    if (channelRef.current) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.removeChannel(channelRef.current);
        } catch {
          // Ignore teardown errors
        }
      }
      channelRef.current = null;
      setRealtimeConnected(false);
    }
  }, [releaseScreenWakeLock]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      void stopAllTrackingResources();
    };
  }, [stopAllTrackingResources]);

  const transmitLocation = useCallback(
    async (payload: TruckLocationPayload) => {
      // 1. Broadcast via Supabase Realtime channel (0 server load on Vercel Hobby)
      if (channelRef.current) {
        try {
          await channelRef.current.send({
            type: "broadcast",
            event: TRACKING_EVENT_RIDER_LOCATION,
            payload
          });
        } catch {
          // Non-fatal; DB snapshot fallback runs right below
        }
      }

      // 2. Persist fallback snapshot in backend database
      try {
        await marketplaceApi.sendDriverLocationSnapshot({
          token,
          lat: payload.lat,
          lng: payload.lng,
          bearing: payload.bearing,
          speedKmh: payload.speedKmh,
          timestamp: payload.timestamp
        });
        setNetworkWarning(null);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 410) {
          await stopAllTrackingResources();
          setPhase("gone");
          setErrorMessage(err.message);
          return;
        }
        setNetworkWarning(
          "Highway signal weak — GPS will sync automatically when network returns (సిగ్నల్ తక్కువగా ఉంది)."
        );
      }

      setLastSentPayload(payload);
      setPingsSent((prev) => prev + 1);
    },
    [token, stopAllTrackingResources]
  );

  const handleStartTrip = useCallback(async () => {
    if (!session) return;
    if (!("geolocation" in navigator)) {
      setGpsError(
        "GPS is not supported in this browser. Please open this link in Chrome or Safari."
      );
      return;
    }

    setGpsError(null);
    setNetworkWarning(null);
    isTrackingRef.current = true;
    lastSentAtRef.current = 0;
    lastSentPosRef.current = null;
    setPhase("tracking");

    // 1. Keep driver's screen awake during 1-10 hour highway trips
    await requestScreenWakeLock();

    // 2. Connect to Supabase Realtime Broadcast channel order-tracking:{orderId}
    const supabase = getSupabaseClient();
    if (supabase) {
      const channelName = getOrderTrackingChannelName(session.orderId);
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false, ack: false }
        }
      });
      channel.subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });
      channelRef.current = channel;
    }

    // 3. Start high-accuracy GPS watchPosition throttled to 30s & >= 15m movement
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!isTrackingRef.current) return;
        setGpsError(null);

        const { latitude: lat, longitude: lng, heading, speed, accuracy } = position.coords;
        const now = Date.now();
        setGpsAccuracyMeters(Number.isFinite(accuracy) ? Math.round(accuracy) : null);

        // Compute bearing from GPS heading or previous movement vector
        let bearing =
          typeof heading === "number" && Number.isFinite(heading) && heading >= 0
            ? heading
            : 0;
        let speedKmh =
          typeof speed === "number" && Number.isFinite(speed) && speed >= 0
            ? Math.round(speed * 3.6 * 10) / 10
            : 0;

        if (prevRawPosRef.current) {
          const movedFromPrev = haversineDistanceMeters(
            prevRawPosRef.current.lat,
            prevRawPosRef.current.lng,
            lat,
            lng
          );
          if (bearing === 0 && movedFromPrev >= 3) {
            bearing = computeCompassBearing(
              prevRawPosRef.current.lat,
              prevRawPosRef.current.lng,
              lat,
              lng
            );
          }
          if (speedKmh === 0 && movedFromPrev >= 5) {
            const dtSec = Math.max(1, (now - prevRawPosRef.current.time) / 1000);
            speedKmh = Math.min(120, Math.round(((movedFromPrev / dtSec) * 3.6) * 10) / 10);
          }
        }
        prevRawPosRef.current = { lat, lng, time: now };

        const isFirstFix = lastSentAtRef.current === 0 || !lastSentPosRef.current;
        if (!isFirstFix && lastSentPosRef.current) {
          const elapsed = now - lastSentAtRef.current;
          if (elapsed < THROTTLE_INTERVAL_MS) {
            return; // Strictly throttle to once every 30 seconds
          }
          const movedMeters = haversineDistanceMeters(
            lastSentPosRef.current.lat,
            lastSentPosRef.current.lng,
            lat,
            lng
          );
          if (movedMeters < MIN_MOVEMENT_METERS) {
            return; // Skip updates when vehicle is stationary (< 15 meters)
          }
        }

        lastSentAtRef.current = now;
        lastSentPosRef.current = { lat, lng };

        const payload: TruckLocationPayload = {
          orderId: session.orderId,
          lat,
          lng,
          bearing: Math.round(bearing),
          speedKmh,
          timestamp: now
        };

        void transmitLocation(payload);
      },
      (geoErr) => {
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setGpsError(
            "Location permission denied. Please tap 'Allow Location' in browser settings so the customer can track the lorry. (లొకేషన్ పర్మిషన్ ఇవ్వండి)"
          );
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          setGpsError("GPS signal temporarily unavailable. Waiting for satellites...");
        } else {
          setGpsError("GPS timeout — retrying automatically...");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 20_000
      }
    );

    watchIdRef.current = watchId;
  }, [session, requestScreenWakeLock, transmitLocation]);

  const handleEndTrip = useCallback(async () => {
    if (!session) return;
    setEndingTrip(true);
    try {
      // Broadcast trip_ended event to listening customer map before disconnecting
      if (channelRef.current) {
        try {
          await channelRef.current.send({
            type: "broadcast",
            event: TRACKING_EVENT_TRIP_ENDED,
            payload: { orderId: session.orderId, timestamp: Date.now() }
          });
        } catch {
          // Non-fatal
        }
      }

      await marketplaceApi.endDriverTrip(token).catch(() => undefined);
      await stopAllTrackingResources();
      setConfirmEndOpen(false);
      setPhase("ended");
    } finally {
      setEndingTrip(false);
    }
  }, [session, token, stopAllTrackingResources]);

  const remainingKm =
    session && lastSentPayload
      ? haversineDistanceKm(
          lastSentPayload.lat,
          lastSentPayload.lng,
          session.customerLocation.lat,
          session.customerLocation.lng
        )
      : session
      ? haversineDistanceKm(
          session.storeLocation.lat,
          session.storeLocation.lng,
          session.customerLocation.lat,
          session.customerLocation.lng
        )
      : null;

  const googleMapsNavUrl = session
    ? `https://www.google.com/maps/dir/?api=1&destination=${session.customerLocation.lat},${session.customerLocation.lng}&travelmode=driving`
    : "#";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Compact Brand Header */}
      <header className="border-b border-white/10 bg-slate-900/95 px-4 py-3.5 sticky top-0 z-20">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-etukas-red text-white shadow-md">
              <Truck size={22} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">
                ETUKAS DRIVER GPS
              </h1>
              <p className="text-[11px] font-semibold text-amber-300">
                డ్రైవర్ లైవ్ ట్రాకింగ్ · No App Needed
              </p>
            </div>
          </div>

          {phase === "tracking" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-[11px] font-extrabold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-5">
        {/* LOADING */}
        {phase === "loading" && (
          <div className="my-auto flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900 p-8 text-center">
            <Loader2 size={40} className="animate-spin text-etukas-red mb-4" />
            <h2 className="text-lg font-black">ట్రిప్ వివరాలు లోడ్ అవుతున్నాయి...</h2>
            <p className="mt-1 text-xs text-slate-400">Verifying your delivery trip link...</p>
          </div>
        )}

        {/* INVALID TOKEN */}
        {phase === "invalid" && (
          <div className="my-auto flex flex-col items-center justify-center rounded-3xl border border-red-500/30 bg-red-950/40 p-7 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 mb-3">
              <AlertTriangle size={30} />
            </div>
            <h2 className="text-lg font-black text-white">లింక్ చెల్లదు / Invalid Link</h2>
            <p className="mt-2 text-xs text-red-200 leading-relaxed">{errorMessage}</p>
            <p className="mt-3 text-[11px] text-slate-400">
              దయచేసి స్టోర్ ఓనర్‌ను కొత్త వాట్సాప్ లింక్ పంపమని అడగండి.
            </p>
          </div>
        )}

        {/* 410 GONE OR ENDED */}
        {(phase === "gone" || phase === "ended") && (
          <div className="my-auto flex flex-col items-center justify-center rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-7 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-white">
              డెలివరీ ట్రిప్ పూర్తయింది!
            </h2>
            <p className="mt-1 text-sm font-bold text-emerald-300">
              Trip Completed — GPS Stopped
            </p>
            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              {errorMessage ||
                "Thank you! Live GPS sharing has been safely turned off. You can close this page now."}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              ధన్యవాదాలు! ఇప్పుడు మీరు ఈ పేజీని మూసివేయవచ్చు.
            </p>
          </div>
        )}

        {/* READY OR TRACKING */}
        {(phase === "ready" || phase === "tracking") && session && (
          <>
            {/* Order & Route Card */}
            <section className="rounded-3xl border border-white/10 bg-slate-900 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Order Number
                  </span>
                  <div className="font-mono text-base font-black text-amber-300">
                    #{session.orderNumber || session.orderId}
                  </div>
                </div>
                {session.vehicleNumber && (
                  <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 text-right">
                    <span className="block text-[9px] uppercase text-slate-400 font-bold">
                      Lorry / Vehicle
                    </span>
                    <span className="font-mono text-xs font-black text-white">
                      {session.vehicleNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Pickup & Drop */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                    <MapPin size={13} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-blue-300">
                      Pickup Store (లోడింగ్ పాయింట్)
                    </span>
                    <p className="font-bold text-white truncate">
                      {session.storeName || session.storeLocation.label}
                    </p>
                    {session.storeLocation.address && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {session.storeLocation.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-etukas-red/25 text-red-400">
                    <Navigation size={13} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-red-300">
                      Drop Site (డెలివరీ స్థలం)
                    </span>
                    <p className="font-bold text-white truncate">
                      {session.customerName || session.customerLocation.label}
                    </p>
                    {session.customerLocation.address && (
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {session.customerLocation.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Open in Google Maps Navigation helper */}
              <a
                href={googleMapsNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/15 px-3 py-2.5 text-xs font-extrabold text-sky-200 hover:bg-sky-500/25 transition"
              >
                <Compass size={15} />
                <span>Open Route in Google Maps (దారి చూడండి)</span>
                <ExternalLink size={12} />
              </a>
            </section>

            {/* Primary Giant Action Button */}
            {phase === "ready" ? (
              <section className="space-y-3">
                <button
                  type="button"
                  onClick={() => void handleStartTrip()}
                  className="w-full rounded-3xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-6 text-center shadow-xl shadow-emerald-900/40 active:scale-[0.98] transition border-2 border-emerald-300/40"
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                      <Play size={26} className="fill-white text-white ml-0.5" />
                    </span>
                    <div className="text-left">
                      <div className="text-xl font-black text-white leading-tight">
                        Start Trip
                      </div>
                      <div className="text-base font-extrabold text-emerald-100 mt-0.5">
                        లారీ బయలుదేరింది
                      </div>
                    </div>
                  </div>
                </button>

                <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3.5 text-xs text-amber-100 space-y-1.5">
                  <p className="font-bold text-amber-300">
                    సూచనలు / Quick Instructions:
                  </p>
                  <p>
                    1. పైనున్న <strong>"Start Trip (లారీ బయలుదేరింది)"</strong> బటన్ నొక్కి{" "}
                    <strong>Allow Location</strong> ఎంచుకోండి.
                  </p>
                  <p>
                    2. ప్రతి 30 సెకన్లకు ఒకసారి లొకేషన్ అప్‌డేట్ అవుతుంది (బ్యాటరీ సేవ్ అవుతుంది).
                  </p>
                  <p className="text-amber-200/80">
                    Tap Start Trip and allow GPS permission. Updates run every 30s to save battery during 1–10 hr trips.
                  </p>
                </div>
              </section>
            ) : (
              <section className="space-y-3">
                {/* Active Telemetry Card */}
                <div className="rounded-3xl border border-emerald-500/35 bg-emerald-950/35 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <Radio size={18} className="animate-pulse" />
                      <span className="text-sm font-black">
                        లైవ్ GPS షేరింగ్ ఆన్ లో ఉంది
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-200">
                      {pingsSent} updates
                    </span>
                  </div>

                  {/* Status Pills */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-xl bg-slate-900/80 border border-white/10 p-2.5 flex items-center gap-2">
                      <BatteryCharging
                        size={15}
                        className={wakeLockActive ? "text-emerald-400" : "text-amber-400"}
                      />
                      <div>
                        <div className="text-[10px] text-slate-400">Screen Wake Lock</div>
                        <div className="font-bold text-white">
                          {wakeLockActive
                            ? "ON (స్క్రీన్ ఆన్)"
                            : wakeLockSupported
                            ? "Re-activating..."
                            : "Keep screen open"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-900/80 border border-white/10 p-2.5 flex items-center gap-2">
                      {networkWarning ? (
                        <WifiOff size={15} className="text-amber-400" />
                      ) : (
                        <Wifi
                          size={15}
                          className={realtimeConnected ? "text-emerald-400" : "text-sky-400"}
                        />
                      )}
                      <div>
                        <div className="text-[10px] text-slate-400">Live Sync (30s)</div>
                        <div className="font-bold text-white">
                          {networkWarning
                            ? "Weak Signal"
                            : realtimeConnected
                            ? "Realtime Connected"
                            : "Cloud Fallback OK"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400">Distance Left</div>
                      <div className="text-sm font-black text-white">
                        {remainingKm !== null ? `${remainingKm} km` : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400">Speed</div>
                      <div className="text-sm font-black text-white">
                        {lastSentPayload ? `${Math.round(lastSentPayload.speedKmh)} km/h` : "0 km/h"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900/80 p-2">
                      <div className="text-[10px] text-slate-400">GPS Accuracy</div>
                      <div className="text-sm font-black text-white">
                        {gpsAccuracyMeters !== null ? `±${gpsAccuracyMeters}m` : "Fixing..."}
                      </div>
                    </div>
                  </div>

                  {lastSentPayload && (
                    <p className="text-[11px] text-center text-emerald-200/80 font-mono">
                      Last synced:{" "}
                      {new Date(lastSentPayload.timestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </p>
                  )}
                </div>

                {/* Warnings / Errors */}
                {gpsError && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-400/40 bg-red-950/60 p-3.5 text-xs font-bold text-red-200 flex items-start gap-2.5"
                  >
                    <AlertTriangle size={16} className="shrink-0 text-red-400 mt-0.5" />
                    <span>{gpsError}</span>
                  </div>
                )}

                {networkWarning && (
                  <div className="rounded-2xl border border-amber-400/40 bg-amber-950/60 p-3 text-xs font-semibold text-amber-200 flex items-start gap-2">
                    <WifiOff size={15} className="shrink-0 text-amber-400 mt-0.5" />
                    <span>{networkWarning}</span>
                  </div>
                )}

                {/* End Trip Button / Confirmation */}
                {!confirmEndOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmEndOpen(true)}
                    className="w-full rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 text-center shadow-lg active:scale-[0.98] transition border border-red-400/40"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                        <Square size={20} className="fill-white text-white" />
                      </span>
                      <div className="text-left">
                        <div className="text-lg font-black text-white leading-tight">
                          End Trip
                        </div>
                        <div className="text-sm font-extrabold text-red-100">
                          డెలివరీ పూర్తయింది
                        </div>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="rounded-3xl border border-red-400/50 bg-red-950/70 p-4 space-y-3">
                    <p className="text-sm font-black text-white text-center">
                      డెలివరీ పూర్తయిందా? GPS ఆపివేయాలా?
                    </p>
                    <p className="text-xs text-red-200 text-center">
                      Confirm ending live tracking for Order #{session.orderNumber || session.orderId}.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConfirmEndOpen(false)}
                        disabled={endingTrip}
                        className="rounded-2xl border border-white/20 bg-slate-900 py-3 text-xs font-bold text-white"
                      >
                        Cancel (వద్దు)
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleEndTrip()}
                        disabled={endingTrip}
                        className="rounded-2xl bg-red-600 py-3 text-xs font-black text-white flex items-center justify-center gap-1.5"
                      >
                        {endingTrip ? <Loader2 size={14} className="animate-spin" /> : null}
                        <span>Yes, End Trip (అవును)</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>Keep this browser tab open & charger plugged in for long highway trips.</span>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
