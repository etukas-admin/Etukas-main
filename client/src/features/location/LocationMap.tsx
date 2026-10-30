import { useEffect, useRef, useState } from "react";
import { Compass, Layers, LocateFixed, MapPin, Minus, Navigation, Plus, Store } from "lucide-react";

export type NearbySeller = {
  id: string;
  name: string;
  distanceKm?: number;
  latitude: number;
  longitude: number;
};

declare global {
  interface Window {
    L?: any;
  }
}

interface LocationMapProps {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  pricingScope?: "radius_25km" | "district";
  siteName: string;
  locationLabel: string;
  sellers?: NearbySeller[];
  selectedSellerId?: string | null;
  onSelectSeller?: (seller: NearbySeller) => void;
  onLocationChange?: (lat: number, lng: number) => void;
}

export function LocationMap({
  latitude,
  longitude,
  radiusKm = 25,
  pricingScope = "radius_25km",
  siteName,
  locationLabel,
  sellers = [],
  selectedSellerId,
  onSelectSeller,
  onLocationChange
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);
  const sellerMarkersRef = useRef<any[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState<boolean>(() => typeof window !== "undefined" && !!window.L);
  const [zoomLevel, setZoomLevel] = useState(11);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");

  // Load Leaflet dynamically from CDN if not already loaded
  useEffect(() => {
    if (typeof window === "undefined" || window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssId = "leaflet-cdn-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-cdn-js";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      script.addEventListener("load", () => setLeafletLoaded(true));
    }
  }, []);

  // Initialize or update Leaflet map when ready
  useEffect(() => {
    if (!leafletLoaded || !window.L || !mapContainerRef.current) return;

    const L = window.L;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: zoomLevel,
        zoomControl: false,
        attributionControl: false
      });

      const tileUrl =
        mapType === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      const tiles = L.tileLayer(tileUrl, {
        maxZoom: 18,
        subdomains: ["a", "b", "c"]
      }).addTo(map);

      leafletMapRef.current = map;
      (map as any)._tileLayer = tiles;

      map.on("click", (e: any) => {
        if (onLocationChange) {
          onLocationChange(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    const map = leafletMapRef.current;

    // Update tile layer if mapType changed
    if ((map as any)._tileLayer) {
      map.removeLayer((map as any)._tileLayer);
      const tileUrl =
        mapType === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      const newTiles = L.tileLayer(tileUrl, {
        maxZoom: 18,
        subdomains: ["a", "b", "c"]
      }).addTo(map);
      (map as any)._tileLayer = newTiles;
    }

    map.setView([latitude, longitude], zoomLevel);

    // Update or create Center Site Marker
    if (centerMarkerRef.current) {
      map.removeLayer(centerMarkerRef.current);
    }

    const centerIcon = L.divIcon({
      className: "custom-site-pin",
      html: `
        <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:40px; height:40px; border-radius:50%; background:rgba(197,34,40,0.25); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative; z-index:2; width:34px; height:34px; border-radius:50%; background:#C52228; border:3px solid #FFFFFF; box-shadow:0 4px 14px rgba(197,34,40,0.5); display:flex; align-items:center; justify-content:center; color:#FFFFFF;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const marker = L.marker([latitude, longitude], {
      icon: centerIcon,
      draggable: true
    }).addTo(map);

    marker.on("dragend", (e: any) => {
      const pos = e.target.getLatLng();
      if (onLocationChange) {
        onLocationChange(pos.lat, pos.lng);
      }
    });

    marker.bindPopup(
      `<strong>${siteName || "Construction Site"}</strong><br/><span style="color:#666;font-size:12px;">${locationLabel}</span>`
    );
    centerMarkerRef.current = marker;

    // Update 25km radius circle
    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
    }

    if (pricingScope === "radius_25km") {
      const circle = L.circle([latitude, longitude], {
        radius: radiusKm * 1000,
        color: "#C52228",
        weight: 2,
        dashArray: "6, 8",
        fillColor: "#C52228",
        fillOpacity: 0.1
      }).addTo(map);
      radiusCircleRef.current = circle;
    }

    // Update Seller Markers
    sellerMarkersRef.current.forEach((m) => map.removeLayer(m));
    sellerMarkersRef.current = [];

    sellers.forEach((seller) => {
      const isSelected = seller.id === selectedSellerId;
      const sellerIcon = L.divIcon({
        className: "custom-seller-pin",
        html: `
          <div style="background:${isSelected ? "#111111" : "#FFFFFF"}; color:${isSelected ? "#FFFFFF" : "#C52228"}; border:2px solid ${isSelected ? "#C52228" : "#E5E7EB"}; box-shadow:0 4px 12px rgba(0,0,0,0.15); border-radius:10px; padding:4px 8px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; cursor:pointer;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
            <span>${seller.name.split(" ")[0]} · ${seller.distanceKm} km</span>
          </div>
        `,
        iconSize: [120, 28],
        iconAnchor: [60, 14]
      });

      const sMarker = L.marker([seller.latitude, seller.longitude], { icon: sellerIcon }).addTo(map);
      sMarker.on("click", () => {
        if (onSelectSeller) onSelectSeller(seller);
      });
      sellerMarkersRef.current.push(sMarker);
    });

    return () => {
      // Clean up markers
    };
  }, [leafletLoaded, latitude, longitude, radiusKm, pricingScope, siteName, locationLabel, sellers, selectedSellerId, mapType, zoomLevel, onLocationChange, onSelectSeller]);

  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(z + 1, 17));
    if (leafletMapRef.current) leafletMapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => Math.max(z - 1, 7));
    if (leafletMapRef.current) leafletMapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([latitude, longitude], 11);
      setZoomLevel(11);
    }
  };

  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-slate-900 shadow-inner sm:h-[420px]">
      {/* Native Leaflet Map Container */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Fallback Static Tile Slippy Grid if Leaflet is still initializing or offline */}
      {!leafletLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/90 text-white p-6 text-center">
          <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-etukas-red/20 text-etukas-red">
            <div className="absolute h-full w-full animate-ping rounded-full bg-etukas-red/30" />
            <MapPin size={32} />
          </div>
          <h4 className="font-extrabold text-base">{siteName || "Construction Site Location"}</h4>
          <p className="mt-1 text-xs text-gray-300 max-w-sm">{locationLabel}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/30">
            <Compass size={14} className="animate-spin" />
            <span>Loading interactive map tiles…</span>
          </div>
        </div>
      )}

      {/* Top Left Status Badge */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="inline-flex items-center gap-2 rounded-xl bg-etukas-black/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md border border-white/10">
          <span className="flex h-2.5 w-2.5 rounded-full bg-etukas-red animate-pulse" />
          <span>
            {pricingScope === "radius_25km"
              ? `Village ${radiusKm} km Surroundings Active`
              : "District-Wide Coverage Mode"}
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300 font-mono">
            {latitude.toFixed(3)}°N, {longitude.toFixed(3)}°E
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow backdrop-blur">
          <Navigation size={13} className="text-etukas-red" />
          <span className="truncate max-w-[200px] sm:max-w-xs">{locationLabel}</span>
        </div>
      </div>

      {/* Top Right Map Layer Controls */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <button
          onClick={() => setMapType(mapType === "standard" ? "satellite" : "standard")}
          className="flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-bold text-gray-800 shadow-md backdrop-blur hover:bg-white hover:text-etukas-red transition-colors"
          title="Toggle Satellite / Street View"
        >
          <Layers size={14} className="text-etukas-red" />
          <span className="hidden sm:inline">{mapType === "standard" ? "Satellite" : "Roads"}</span>
        </button>

        <button
          onClick={handleRecenter}
          className="rounded-lg bg-white/95 p-2 text-gray-800 shadow-md backdrop-blur hover:bg-white hover:text-etukas-red transition-colors"
          title="Recenter on construction site"
        >
          <LocateFixed size={16} />
        </button>
      </div>

      {/* Bottom Right Zoom Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="rounded-t-lg bg-white/95 p-2 text-gray-800 hover:bg-white hover:text-etukas-red transition-colors border-b border-gray-200"
          title="Zoom In"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          className="rounded-b-lg bg-white/95 p-2 text-gray-800 hover:bg-white hover:text-etukas-red transition-colors"
          title="Zoom Out"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* Bottom Left Map Legend & Tip */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-medium text-gray-700 shadow-md backdrop-blur border border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-etukas-red inline-block" />
          <span>Construction Site Pin (Click map to move)</span>
        </div>
        {pricingScope === "radius_25km" && (
          <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3">
            <span className="h-3 w-3 rounded-full border border-dashed border-etukas-red bg-etukas-red/20 inline-block" />
            <span>25 km Delivery Boundary</span>
          </div>
        )}
        {sellers.length > 0 && (
          <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3">
            <Store size={13} className="text-gray-900" />
            <span>{sellers.length} Local Sellers</span>
          </div>
        )}
      </div>
    </div>
  );
}

