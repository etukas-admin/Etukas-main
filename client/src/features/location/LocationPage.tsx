import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Crosshair,
  HardHat,
  Home,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Truck
} from "lucide-react";
import {
  DEFAULT_CONSTRUCTION_SITE,
  getDeliveryAddresses,
  getSelectedAddressId,
  saveDeliveryAddresses,
  type AddressLabel,
  type DeliveryAddress,
  type PricingScope
} from "./locationStore";
import { LocationMap } from "./LocationMap";
import { LocationRefreshingOverlay } from "./LocationRefreshingOverlay";

export function LocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(getDeliveryAddresses);
  const [selectedId, setSelectedId] = useState<string | null>(getSelectedAddressId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTarget, setRefreshTarget] = useState<{ name: string; scopeText: string } | null>(null);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => void) | null>(null);

  // Active address being edited or selected
  const initialAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedId) || addresses[0] || DEFAULT_CONSTRUCTION_SITE;
  }, [addresses, selectedId]);

  // Multi-step state: 1 = "map", 2 = "scope_details", 3 = "saved_list"
  const [currentStep, setCurrentStep] = useState<"map" | "scope_details" | "saved_list">("map");

  // Draft location values while picking on map
  const [draftLocation, setDraftLocation] = useState({
    id: initialAddress.id,
    label: initialAddress.label || ("Construction Site" as AddressLabel),
    siteName: initialAddress.siteName || "Home Construction Site",
    recipient: initialAddress.recipient || "",
    line1: initialAddress.line1 || "Karapa Village, Kakinada Rural",
    line2: initialAddress.line2 || "",
    landmark: initialAddress.landmark || "",
    city: initialAddress.city || "Kakinada Rural",
    district: initialAddress.district || "Kakinada",
    state: initialAddress.state || "Andhra Pradesh",
    postalCode: initialAddress.postalCode || "",
    latitude: initialAddress.latitude || 16.9891,
    longitude: initialAddress.longitude || 82.2475,
    pricingScope: (initialAddress.pricingScope || "radius_25km") as PricingScope,
    radiusKm: initialAddress.radiusKm || 25
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Map pin dragged or clicked - reverse geocode
  const handleMapLocationChange = async (lat: number, lng: number) => {
    let place = "Selected Location";
    let district = draftLocation.district || "";
    let state = draftLocation.state || "";
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        place =
          data.address?.village ||
          data.address?.suburb ||
          data.address?.town ||
          data.address?.city ||
          data.display_name?.split(",")[0] ||
          place;
        district = (data.address?.state_district || data.address?.county || district).replace(" District", "");
        state = data.address?.state || state;
      }
    } catch {
      // coordinates are still precise
    }

    setDraftLocation((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      city: place,
      district: district || prev.district,
      state: state || prev.state,
      line1: `${place} (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    }));
  };

  // Search places via Nominatim
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim() || val.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (item: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const parts = item.display_name.split(",");
    const cityName = parts[0]?.trim() || "Selected Location";
    const districtName = parts.length > 2 ? parts[parts.length - 3]?.trim() : parts[1]?.trim() || "";
    const stateName = parts.length > 1 ? parts[parts.length - 2]?.trim() : "";

    setDraftLocation((prev) => ({
      ...prev,
      line1: item.display_name.split(",").slice(0, 3).join(","),
      city: cityName,
      district: districtName.replace(" District", "") || prev.district,
      state: stateName || prev.state,
      latitude: lat,
      longitude: lng
    }));

    setSearchQuery("");
    setSearchResults([]);
    setStatusMessage(`Location updated to ${cityName}`);
  };

  // Detect GPS
  const handleUseGPS = () => {
    setStatusMessage("");
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        let city = "Detected Location";
        let district = "";
        let state = "";
        let line1 = `GPS Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`);
          if (res.ok) {
            const data = await res.json();
            city = data.address?.village || data.address?.suburb || data.address?.town || data.address?.city || city;
            district = (data.address?.state_district || data.address?.county || "").replace(" District", "");
            state = data.address?.state || "";
            line1 = data.display_name?.split(",").slice(0, 3).join(",") || line1;
          }
        } catch {
          // ignore
        }

        setDraftLocation((prev) => ({
          ...prev,
          city,
          district: district || prev.district,
          state: state || prev.state,
          line1,
          latitude: coords.latitude,
          longitude: coords.longitude
        }));

        setLocating(false);
        setStatusMessage(`GPS Location detected: ${city}`);
      },
      (err) => {
        setLocating(false);
        setStatusMessage(err.code === 1 ? "Location permission denied. Please search your area." : "Unable to detect GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Final confirmation: save location and refresh store with nearby listings after 1s animation
  const handleConfirmAndApply = () => {
    const existingIndex = addresses.findIndex((a) => a.id === draftLocation.id);
    let updatedList: DeliveryAddress[];

    const finalAddress: DeliveryAddress = {
      ...draftLocation,
      id: draftLocation.id || crypto.randomUUID()
    };

    if (existingIndex >= 0) {
      updatedList = addresses.map((a, i) => (i === existingIndex ? finalAddress : a));
    } else {
      updatedList = [finalAddress, ...addresses];
    }

    setRefreshTarget({
      name: `${finalAddress.city}${finalAddress.district && finalAddress.district !== finalAddress.city ? `, ${finalAddress.district}` : ""}`,
      scopeText: finalAddress.pricingScope === "district" ? "District Wholesale Mode" : "Village 25 km Surroundings"
    });

    setPendingConfirmAction(() => () => {
      setAddresses(updatedList);
      setSelectedId(finalAddress.id);
      saveDeliveryAddresses(updatedList, finalAddress.id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      navigate("/products");
    });

    setIsRefreshing(true);
  };

  // Choose from saved address with 1s refresh animation
  const handleSelectSaved = (addr: DeliveryAddress) => {
    setRefreshTarget({
      name: `${addr.city}${addr.district && addr.district !== addr.city ? `, ${addr.district}` : ""}`,
      scopeText: addr.pricingScope === "district" ? "District Wholesale Mode" : "Village 25 km Surroundings"
    });

    setPendingConfirmAction(() => () => {
      setSelectedId(addr.id);
      saveDeliveryAddresses(addresses, addr.id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      navigate("/products");
    });

    setIsRefreshing(true);
  };

  return (
    <main className="min-h-screen bg-stone-50/70 pb-16 pt-3 md:py-8">
      <div className="mx-auto max-w-2xl px-3 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-xl shadow-stone-900/5">
          {/* Header - Etukas Red & Black */}
          <header className="relative bg-etukas-black px-5 py-5 text-white md:px-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (currentStep === "scope_details") setCurrentStep("map");
                    else if (currentStep === "saved_list") setCurrentStep("map");
                    else navigate(-1);
                  }}
                  aria-label="Go back"
                  className="rounded-full p-2 bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <span className="rounded bg-etukas-red px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    Etukas Location
                  </span>
                  <h1 className="text-lg font-black tracking-tight md:text-xl mt-0.5">
                    {currentStep === "map"
                      ? "Step 1: Set Location on Map"
                      : currentStep === "scope_details"
                        ? "Step 2: Choose Pricing & Delivery Scope"
                        : "Your Saved Delivery Locations"}
                  </h1>
                </div>
              </div>

              {currentStep !== "saved_list" && (
                <button
                  onClick={() => setCurrentStep("saved_list")}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-white/20 transition"
                >
                  Saved ({addresses.length})
                </button>
              )}
            </div>

            {/* Step Progress Bar */}
            {currentStep !== "saved_list" && (
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    currentStep === "map" || currentStep === "scope_details" ? "bg-etukas-red" : "bg-white/20"
                  }`}
                />
                <div
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    currentStep === "scope_details" ? "bg-etukas-red" : "bg-white/20"
                  }`}
                />
              </div>
            )}
          </header>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Notification message */}
            {statusMessage && (
              <div className="flex items-center justify-between rounded-xl bg-etukas-pink border border-etukas-red/20 px-3.5 py-2.5 text-xs font-semibold text-etukas-red">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{statusMessage}</span>
                </div>
                <button onClick={() => setStatusMessage("")} className="opacity-70 hover:opacity-100">✕</button>
              </div>
            )}

            {/* STEP 1: Interactive Map & Search */}
            {currentStep === "map" && (
              <div className="space-y-4">
                {/* Search Bar & GPS */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search village, city, mandal or PIN code..."
                      className="h-11 w-full rounded-xl border border-gray-200 bg-stone-50/70 pl-10 pr-4 text-xs font-medium outline-none transition focus:border-etukas-red focus:bg-white focus:ring-4 focus:ring-etukas-pink"
                    />
                    {searching && (
                      <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                    )}

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                        {searchResults.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectSearchResult(item)}
                            className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-xs hover:bg-etukas-pink border-b border-gray-50 last:border-b-0"
                          >
                            <MapPin size={15} className="text-etukas-red mt-0.5 shrink-0" />
                            <span className="font-medium text-gray-800 line-clamp-2">{item.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleUseGPS}
                    disabled={locating}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-bold text-gray-800 hover:border-etukas-red hover:bg-etukas-pink hover:text-etukas-red transition disabled:opacity-60 shrink-0"
                  >
                    <Crosshair size={15} className={locating ? "animate-spin text-etukas-red" : ""} />
                    <span>{locating ? "Detecting GPS…" : "Use Current GPS"}</span>
                  </button>
                </div>

                {/* Map View */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold text-gray-700">Pinpoint your site on the map:</span>
                    <span>Tap map or drag pin to adjust</span>
                  </div>

                  <LocationMap
                    latitude={draftLocation.latitude}
                    longitude={draftLocation.longitude}
                    radiusKm={draftLocation.radiusKm}
                    pricingScope={draftLocation.pricingScope}
                    siteName={draftLocation.siteName}
                    locationLabel={`${draftLocation.city}, ${draftLocation.district}`}
                    onLocationChange={handleMapLocationChange}
                  />
                </div>

                {/* Detected Location Card */}
                <div className="rounded-2xl border border-gray-200 bg-stone-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-etukas-red text-white">
                      <MapPin size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-etukas-red block">
                        Selected Location
                      </span>
                      <h3 className="font-black text-sm text-gray-900 truncate">
                        {draftLocation.city}
                        {draftLocation.district && draftLocation.district !== draftLocation.city && (
                          <span className="text-gray-500 font-normal">, {draftLocation.district} Dist.</span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {draftLocation.state} · GPS: {draftLocation.latitude.toFixed(4)}°N, {draftLocation.longitude.toFixed(4)}°E
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 1 Next Button */}
                <button
                  onClick={() => setCurrentStep("scope_details")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-etukas-red font-black text-sm text-white shadow-lg hover:bg-red-700 transition"
                >
                  <span>Continue to Pricing & Delivery Scope</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            )}

            {/* STEP 2: Pricing Scope & Details */}
            {currentStep === "scope_details" && (
              <div className="space-y-5">
                {/* Location Summary Header */}
                <div className="flex items-center justify-between rounded-xl bg-stone-100 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={16} className="text-etukas-red shrink-0" />
                    <span className="text-xs font-bold text-gray-800 truncate">
                      {draftLocation.city}, {draftLocation.district}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentStep("map")}
                    className="text-xs font-bold text-etukas-red hover:underline shrink-0 ml-2"
                  >
                    Edit on Map
                  </button>
                </div>

                {/* Scope Selection: Village 25 km vs District-Wide */}
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 block mb-2">
                    How do you want to view seller pricing?
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Option 1: 25 km Surroundings */}
                    <div
                      onClick={() => setDraftLocation({ ...draftLocation, pricingScope: "radius_25km" })}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        draftLocation.pricingScope === "radius_25km"
                          ? "border-etukas-red bg-etukas-pink/40 ring-2 ring-etukas-red"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-etukas-red text-white">
                          <Truck size={17} />
                        </div>
                        {draftLocation.pricingScope === "radius_25km" && (
                          <span className="rounded-full bg-etukas-red p-1 text-white">
                            <Check size={12} />
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm text-gray-900 mt-2">
                        Village 25 km Surroundings
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Hyperlocal seller prices with direct tractor or tipper delivery right to your village construction site.
                      </p>

                      {/* Radius pills */}
                      {draftLocation.pricingScope === "radius_25km" && (
                        <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-red-100">
                          <span className="text-[10px] font-bold text-gray-500">Radius:</span>
                          {[15, 25, 40].map((km) => (
                            <button
                              key={km}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDraftLocation({ ...draftLocation, radiusKm: km });
                              }}
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                draftLocation.radiusKm === km
                                  ? "bg-etukas-black text-white"
                                  : "bg-white text-gray-600 border border-gray-200"
                              }`}
                            >
                              {km} km
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Option 2: District-Wide */}
                    <div
                      onClick={() => setDraftLocation({ ...draftLocation, pricingScope: "district" })}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                        draftLocation.pricingScope === "district"
                          ? "border-etukas-red bg-etukas-pink/40 ring-2 ring-etukas-red"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-stone-900 text-white">
                          <Building2 size={17} />
                        </div>
                        {draftLocation.pricingScope === "district" && (
                          <span className="rounded-full bg-etukas-red p-1 text-white">
                            <Check size={12} />
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm text-gray-900 mt-2">
                        {draftLocation.district || "District"} District-Wide
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Wholesale dealer pricing & bulk full-truckload (FTL) delivery across the entire district.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location Type */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Location Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["Construction Site", "Home", "Office", "Other"] as const).map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setDraftLocation({ ...draftLocation, label })}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                          draftLocation.label === label
                            ? "border-etukas-red bg-etukas-red text-white shadow-sm"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-stone-50"
                        }`}
                      >
                        {label === "Construction Site" ? <HardHat size={15} /> : label === "Home" ? <Home size={15} /> : <Building2 size={15} />}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project / Site Name */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Project / Site Name (Optional)</label>
                    <input
                      value={draftLocation.siteName}
                      onChange={(e) => setDraftLocation({ ...draftLocation, siteName: e.target.value })}
                      placeholder="e.g. My Home Construction Site"
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-etukas-red focus:ring-2 focus:ring-etukas-pink"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Contact Person (Optional)</label>
                    <input
                      value={draftLocation.recipient}
                      onChange={(e) => setDraftLocation({ ...draftLocation, recipient: e.target.value })}
                      placeholder="Site supervisor or contact"
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-etukas-red focus:ring-2 focus:ring-etukas-pink"
                    />
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmAndApply}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-etukas-red font-black text-sm text-white shadow-lg hover:bg-red-700 transition"
                >
                  <Sparkles size={17} />
                  <span>Confirm Location & Refresh Nearby Prices</span>
                </button>
              </div>
            )}

            {/* VIEW 3: Saved Locations List */}
            {currentStep === "saved_list" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-gray-900">Your Saved Addresses</h3>
                  <button
                    onClick={() => {
                      setDraftLocation({
                        id: crypto.randomUUID(),
                        label: "Construction Site",
                        siteName: "New Site",
                        recipient: "",
                        line1: "",
                        line2: "",
                        landmark: "",
                        city: "",
                        district: "",
                        state: "Andhra Pradesh",
                        postalCode: "",
                        latitude: 16.9891,
                        longitude: 82.2475,
                        pricingScope: "radius_25km",
                        radiusKm: 25
                      });
                      setCurrentStep("map");
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-etukas-red hover:underline"
                  >
                    <Plus size={15} /> Add New
                  </button>
                </div>

                <div className="space-y-2.5">
                  {addresses.map((addr) => {
                    const isSelected = addr.id === selectedId;
                    const isSite = addr.label === "Construction Site";
                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectSaved(addr)}
                        className={`flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition-all ${
                          isSelected
                            ? "border-etukas-red bg-etukas-pink/30 ring-2 ring-etukas-red/60"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                              isSite ? "bg-etukas-red text-white" : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {isSite ? <HardHat size={18} /> : <Home size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900">
                                {addr.siteName || addr.label}
                              </span>
                              {isSelected && (
                                <span className="rounded bg-etukas-red px-2 py-0.5 text-[10px] font-black text-white">
                                  ACTIVE
                                </span>
                              )}
                              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                                {addr.pricingScope === "district" ? "District" : "25km Surroundings"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {[addr.line1, addr.city, addr.district].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {addresses.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = addresses.filter((a) => a.id !== addr.id);
                                setAddresses(next);
                                saveDeliveryAddresses(next, isSelected ? next[0]?.id || null : selectedId);
                              }}
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                              title="Delete Address"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentStep("map")}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-800 hover:bg-stone-50 transition"
                >
                  Pick Location on Map Instead
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1-sec Material Icons Moving Animation on Location Confirm */}
      <LocationRefreshingOverlay
        isOpen={isRefreshing}
        locationName={refreshTarget?.name || draftLocation.city}
        scopeText={refreshTarget?.scopeText || "Refreshing Surroundings"}
        durationMs={1000}
        onFinish={() => {
          setIsRefreshing(false);
          if (pendingConfirmAction) pendingConfirmAction();
        }}
      />
    </main>
  );
}
