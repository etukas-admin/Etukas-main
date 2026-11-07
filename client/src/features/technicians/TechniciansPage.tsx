import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  ChevronDown,
  Star,
  Heart,
  BadgeCheck,
  MapPin,
  Clock,
  Calendar,
  Phone,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { marketplaceApi, type Technician, type TechnicianBookingInput } from "../../services/api";
import { getSelectedAddress, DEFAULT_CONSTRUCTION_SITE, ADDRESS_CHANGE_EVENT } from "../location/locationStore";
import { AVAILABLE_SKILLS, DISTANCE_OPTIONS, TECHNICIAN_AVATARS } from "./technicianAvatars";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function TechniciansPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active customer location from locationStore with real-time updates
  const [userAddress, setUserAddress] = useState(() => getSelectedAddress() || DEFAULT_CONSTRUCTION_SITE);
  const userLat = userAddress.latitude || 16.9891;
  const userLng = userAddress.longitude || 82.2475;

  useEffect(() => {
    const onAddressChange = () => {
      setUserAddress(getSelectedAddress() || DEFAULT_CONSTRUCTION_SITE);
    };
    window.addEventListener(ADDRESS_CHANGE_EVENT, onAddressChange);
    return () => window.removeEventListener(ADDRESS_CHANGE_EVENT, onAddressChange);
  }, []);

  // Filter states
  const initialCategory = searchParams.get("category") || "all";
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMaxDistance, setSelectedMaxDistance] = useState<number | "all">("all");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("all");
  const [selectedChargeFilter, setSelectedChargeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"nearest" | "price_asc" | "price_desc" | "rating">("nearest");
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  // Active dropdown menu state for mobile chips
  const [openDropdown, setOpenDropdown] = useState<"category" | "distance" | "time" | "charge" | null>(null);

  // Selected technician for booking modal
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookedBooking, setBookedBooking] = useState<any | null>(null);

  // Sync category param with URL
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  // Query technicians from fullstack backend API
  const { data: technicians = [], isLoading, refetch } = useQuery({
    queryKey: ["technicians", userLat, userLng, selectedCategory, searchQuery, sortBy],
    queryFn: async () => {
      const res = await marketplaceApi.getTechnicians({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        q: searchQuery.trim() || undefined,
        lat: userLat,
        lng: userLng,
        sort: sortBy
      });
      return res;
    }
  });

  // Support ?techId=... parameter to automatically open booking for selected technician
  useEffect(() => {
    const techId = searchParams.get("techId");
    if (techId && technicians.length > 0) {
      const found = technicians.find((t) => t.id === techId || t.partnerId === techId);
      if (found) {
        setSelectedTechnician(found);
      }
    }
  }, [searchParams, technicians]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (selectedMaxDistance !== "all") count++;
    if (selectedTimeFilter !== "all") count++;
    if (selectedChargeFilter !== "all") count++;
    if (sortBy !== "nearest") count++;
    return count;
  }, [selectedCategory, selectedMaxDistance, selectedTimeFilter, selectedChargeFilter, sortBy]);

  // Filter and sort locally for instant responsive experience
  const filteredTechnicians = useMemo(() => {
    let list = [...technicians];

    // Distance filter
    if (selectedMaxDistance !== "all") {
      list = list.filter((t) => (t.distanceKm ?? 0) <= selectedMaxDistance);
    }

    // Time / Day filter
    if (selectedTimeFilter === "today") {
      list = list.filter((t) => t.isAvailableToday);
    } else if (selectedTimeFilter === "mon-sat") {
      list = list.filter((t) => t.availableDays.includes("Sat"));
    } else if (selectedTimeFilter === "all-days") {
      list = list.filter((t) => t.availableDays.length >= 7 || t.availableDays.includes("Sun"));
    }

    // Charge filter
    if (selectedChargeFilter === "under-350") {
      list = list.filter((t) => t.chargePerHour <= 350);
    } else if (selectedChargeFilter === "350-500") {
      list = list.filter((t) => t.chargePerHour >= 350 && t.chargePerHour <= 500);
    } else if (selectedChargeFilter === "above-500") {
      list = list.filter((t) => t.chargePerHour > 500);
    } else if (selectedChargeFilter === "daily-under-2000") {
      list = list.filter((t) => t.chargePerDay <= 2000);
    }

    const nearbyMatches = list.filter((t) => (t.distanceKm ?? Number.POSITIVE_INFINITY) <= (t.serviceRadiusKm ?? 25));
    if (nearbyMatches.length > 0) {
      list = nearbyMatches;
    }

    // Sorting: default is NEAREST FIRST ("First nearly registered technicians should be visible to customer, after distance technicians")
    if (sortBy === "nearest") {
      list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => a.chargePerHour - b.chargePerHour);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.chargePerHour - a.chargePerHour);
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [technicians, selectedMaxDistance, selectedTimeFilter, selectedChargeFilter, sortBy]);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setSelectedMaxDistance("all");
    setSelectedTimeFilter("all");
    setSelectedChargeFilter("all");
    setSortBy("nearest");
    setSearchQuery("");
    setSearchParams({});
    setOpenDropdown(null);
  };

  // Booking Mutation
  const bookingMutation = useMutation({
    mutationFn: (values: TechnicianBookingInput) =>
      marketplaceApi.bookTechnician(values.technicianId, values),
    onSuccess: (data: any) => {
      setBookingSuccessMsg(data.message);
      setBookedBooking(data.booking);
    }
  });

  return (
    <div className="min-h-screen bg-[#f1f2f4] pb-16">
      {/* ── Top App Bar (Flipkart Style matching Screenshot 1) ── */}
      <header className="sticky top-0 z-40 bg-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 active:scale-90"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>

          {/* Search bar */}
          <div className="relative flex flex-1 items-center">
            <Search size={18} className="absolute left-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Plumber, Electrician, Mason..."
              className="h-10 w-full rounded-full border border-gray-300 bg-white pl-10 pr-9 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Cart with badge */}
          <Link
            to="/cart"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
            aria-label="Cart"
          >
            <ShoppingCart size={22} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-etukas-red px-1 text-[10px] font-bold text-white shadow-xs">
              1
            </span>
          </Link>
        </div>

        {/* ── Filter Strip (Scrollable Chips Matching Screenshot 1) ── */}
        <div className="border-t border-gray-100 bg-white px-3 py-2">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Filter Count Button [ 2 ⚙️ ] */}
            <button
              onClick={() => {
                if (openDropdown) setOpenDropdown(null);
                else setOpenDropdown("category");
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                activeFilterCount > 0
                  ? "border-etukas-red bg-red-50 text-etukas-red"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <SlidersHorizontal size={14} />
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-etukas-red text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Category Dropdown Chip */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
                className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory !== "all"
                    ? "border-etukas-red bg-red-50 text-etukas-red"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <span>
                  {selectedCategory === "all"
                    ? "Category"
                    : AVAILABLE_SKILLS.find(
                        (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-") === selectedCategory
                      ) || selectedCategory}
                </span>
                <ChevronDown size={14} className={openDropdown === "category" ? "rotate-180" : ""} />
              </button>

              {openDropdown === "category" && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-52 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setSearchParams({});
                      setOpenDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium ${
                      selectedCategory === "all"
                        ? "bg-red-50 font-bold text-etukas-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>All Categories</span>
                    {selectedCategory === "all" && <CheckCircle2 size={14} />}
                  </button>
                  {AVAILABLE_SKILLS.map((skill) => {
                    const slug = skill.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    const isSelected = selectedCategory === slug || selectedCategory === skill.toLowerCase();
                    return (
                      <button
                        key={skill}
                        onClick={() => {
                          setSelectedCategory(slug);
                          setSearchParams({ category: slug });
                          setOpenDropdown(null);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium ${
                          isSelected
                            ? "bg-red-50 font-bold text-etukas-red"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span>{skill}</span>
                        {isSelected && <CheckCircle2 size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Distance Range Dropdown Chip (25km, 40km) */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenDropdown(openDropdown === "distance" ? null : "distance")}
                className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedMaxDistance !== "all"
                    ? "border-etukas-red bg-red-50 text-etukas-red"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <span>
                  {selectedMaxDistance === "all" ? "Distance" : `Within ${selectedMaxDistance} km`}
                </span>
                <ChevronDown size={14} className={openDropdown === "distance" ? "rotate-180" : ""} />
              </button>

              {openDropdown === "distance" && (
                <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  <button
                    onClick={() => {
                      setSelectedMaxDistance("all");
                      setOpenDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                      selectedMaxDistance === "all"
                        ? "bg-red-50 font-bold text-etukas-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>All Distances</span>
                    {selectedMaxDistance === "all" && <CheckCircle2 size={14} />}
                  </button>
                  {DISTANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSelectedMaxDistance(opt.value);
                        setOpenDropdown(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                        selectedMaxDistance === opt.value
                          ? "bg-red-50 font-bold text-etukas-red"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selectedMaxDistance === opt.value && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Available Time / Days Dropdown Chip */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenDropdown(openDropdown === "time" ? null : "time")}
                className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedTimeFilter !== "all"
                    ? "border-etukas-red bg-red-50 text-etukas-red"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <span>
                  {selectedTimeFilter === "all"
                    ? "Time / Days"
                    : selectedTimeFilter === "today"
                      ? "Available Today"
                      : selectedTimeFilter === "mon-sat"
                        ? "Mon - Sat"
                        : "All 7 Days"}
                </span>
                <ChevronDown size={14} className={openDropdown === "time" ? "rotate-180" : ""} />
              </button>

              {openDropdown === "time" && (
                <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  {[
                    { id: "all", label: "Any Day / Time" },
                    { id: "today", label: "⚡ Available Today" },
                    { id: "mon-sat", label: "Mon - Sat Working" },
                    { id: "all-days", label: "All 7 Days (Incl Sun)" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTimeFilter(t.id);
                        setOpenDropdown(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                        selectedTimeFilter === t.id
                          ? "bg-red-50 font-bold text-etukas-red"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>{t.label}</span>
                      {selectedTimeFilter === t.id && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Charge / Price Dropdown Chip */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenDropdown(openDropdown === "charge" ? null : "charge")}
                className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedChargeFilter !== "all" || sortBy !== "nearest"
                    ? "border-etukas-red bg-red-50 text-etukas-red"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <span>
                  {selectedChargeFilter !== "all"
                    ? selectedChargeFilter === "under-350"
                      ? "Under ₹350/hr"
                      : selectedChargeFilter === "350-500"
                        ? "₹350 - ₹500/hr"
                        : "₹500+/hr"
                    : sortBy !== "nearest"
                      ? sortBy === "price_asc"
                        ? "Price: Low to High"
                        : "Price: High to Low"
                      : "Charge"}
                </span>
                <ChevronDown size={14} className={openDropdown === "charge" ? "rotate-180" : ""} />
              </button>

              {openDropdown === "charge" && (
                <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Hourly Charge
                  </p>
                  {[
                    { id: "all", label: "All Rates" },
                    { id: "under-350", label: "Under ₹350 / hr" },
                    { id: "350-500", label: "₹350 - ₹500 / hr" },
                    { id: "above-500", label: "Above ₹500 / hr" },
                    { id: "daily-under-2000", label: "Daily: Under ₹2,000 / day" }
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedChargeFilter(c.id);
                        setOpenDropdown(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs ${
                        selectedChargeFilter === c.id
                          ? "bg-red-50 font-bold text-etukas-red"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>{c.label}</span>
                      {selectedChargeFilter === c.id && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Sort By Rate
                  </p>
                  <button
                    onClick={() => {
                      setSortBy("price_asc");
                      setOpenDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs ${
                      sortBy === "price_asc"
                        ? "bg-red-50 font-bold text-etukas-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Price: Low to High</span>
                    {sortBy === "price_asc" && <CheckCircle2 size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy("price_desc");
                      setOpenDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs ${
                      sortBy === "price_desc"
                        ? "bg-red-50 font-bold text-etukas-red"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Price: High to Low</span>
                    {sortBy === "price_desc" && <CheckCircle2 size={14} />}
                  </button>
                </div>
              )}
            </div>

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="shrink-0 text-xs font-bold text-gray-500 hover:text-etukas-red active:scale-95"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Location Indicator & Nearest First Bar ── */}
      <div className="mx-auto max-w-7xl px-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-xs text-gray-700 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-etukas-red">
              <MapPin size={12} />
            </span>
            <span>
              Technicians near <strong className="text-gray-900">{userAddress.city || "Kakinada Rural"}</strong>
            </span>
            <span className="hidden sm:inline text-gray-400">•</span>
            <span className="hidden sm:inline font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
              Nearest first
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <span>{filteredTechnicians.length} experts available</span>
            <Link to="/location" className="font-bold text-etukas-red underline ml-1">
              Change
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2-Column Product Grid (Flipkart Mobile Style matching Screenshot 1) ── */}
      <main className="mx-auto max-w-7xl px-2 py-3 sm:px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white p-2.5 shadow-sm">
                <div className="aspect-[3/4] w-full rounded-xl bg-gray-200" />
                <div className="mt-2.5 h-3 w-3/4 rounded bg-gray-200" />
                <div className="mt-1.5 h-3 w-1/2 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-2/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : filteredTechnicians.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-xs">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-etukas-red">
              <Filter size={28} />
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">No technicians found</h3>
            <p className="mt-1 max-w-md text-xs text-gray-500">
              No service professionals match your current filters. Try expanding your distance range or clearing filters.
            </p>
            <Button variant="secondary" className="mt-4 text-xs" onClick={clearAllFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filteredTechnicians.map((tech) => {
              const isWishlisted = !!wishlist[tech.id];
              return (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTechnician(tech)}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-2.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                >
                  {/* Top Image Section (Aspect 3:4 or Square like Screenshot 1) */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-b from-gray-50 via-gray-100/60 to-gray-200/50 p-2">
                    {/* AD / VERIFIED Badge (Top-left) */}
                    <div className="absolute left-2 top-2 z-10">
                      {tech.isAd ? (
                        <span className="rounded-sm bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                          AD
                        </span>
                      ) : (
                        <span className="rounded-sm bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-xs">
                          VERIFIED
                        </span>
                      )}
                    </div>

                    {/* Wishlist Heart Button (Top-right) */}
                    <button
                      onClick={(e) => toggleWishlist(tech.id, e)}
                      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur-xs transition hover:scale-110 active:scale-95"
                      aria-label="Wishlist"
                    >
                      <Heart
                        size={15}
                        className={isWishlisted ? "fill-red-500 text-red-500" : "text-gray-600"}
                      />
                    </button>

                    {/* Technician Avatar / Illustration */}
                    <div className="flex h-full w-full items-center justify-center">
                      <img
                        src={tech.avatar || "/images/technicians/plumber.webp"}
                        alt={tech.name}
                        className="h-full w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to default technician icon
                          (e.target as HTMLImageElement).src = "/images/technicians/plumber.webp";
                        }}
                      />
                    </div>

                    {/* Rating badge overlay at bottom-left of image (Matching Screenshot 1) */}
                    <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 shadow-xs backdrop-blur-xs">
                      <span className="text-[10px] font-extrabold text-gray-900">{tech.rating.toFixed(1)}</span>
                      <Star size={10} className="fill-emerald-600 text-emerald-600" />
                      <span className="text-[9px] text-gray-400">|</span>
                      <span className="text-[9px] font-medium text-gray-500">{tech.reviewCount}+</span>
                    </div>
                  </div>

                  {/* Information Section Below Image */}
                  <div className="mt-2 flex flex-1 flex-col justify-between">
                    <div>
                      {/* Assured Badge + Technician Name */}
                      <div className="flex items-center gap-1 text-[11px] font-extrabold tracking-tight text-gray-900 sm:text-xs">
                        <BadgeCheck size={14} className="shrink-0 text-blue-600" />
                        <span className="line-clamp-1 uppercase font-black text-gray-950">
                          {tech.name}
                        </span>
                      </div>

                      {/* Skills / Categories */}
                      <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-gray-600 sm:text-[11px]">
                        {tech.categories.join(", ")}
                      </p>

                      {/* Distance pill (Highlighting nearest first) */}
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                        <MapPin size={11} className="shrink-0 text-red-500" />
                        <span className="line-clamp-1 text-gray-700">
                          {tech.distanceKm !== undefined ? `${tech.distanceKm} km away` : tech.city}
                        </span>
                        <span className="text-[9px] text-gray-400">({tech.serviceRadiusKm}km coverage)</span>
                      </div>

                      {/* Available Timing */}
                      <div className="mt-0.5 flex items-center gap-1 text-[9px] font-medium text-emerald-700">
                        <Clock size={10} className="shrink-0 text-emerald-600" />
                        <span className="line-clamp-1">{tech.workingHours}</span>
                      </div>
                    </div>

                    {/* Price row (Matching Screenshot 1) */}
                    <div className="mt-2 border-t border-gray-100 pt-1.5">
                      <div className="flex items-baseline gap-1.5">
                        {tech.discountPercent && tech.discountPercent > 0 ? (
                          <span className="text-[11px] font-extrabold text-emerald-600">
                            ↓ {tech.discountPercent}%
                          </span>
                        ) : null}

                        {tech.originalPerHour ? (
                          <span className="text-[10px] text-gray-400 line-through">
                            ₹{tech.originalPerHour}
                          </span>
                        ) : null}

                        <span className="text-xs font-extrabold text-gray-900 sm:text-sm">
                          ₹{tech.chargePerHour}
                          <span className="text-[10px] font-normal text-gray-500"> / hr</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>Day rate: ₹{tech.chargePerDay}</span>
                      </div>

                      {/* Highlight Badge Tag at bottom (e.g. Top Discount of the Sale) */}
                      {tech.badge && (
                        <div className="mt-1.5">
                          <span className="inline-block rounded-sm bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
                            {tech.badge}
                          </span>
                        </div>
                      )}

                      {/* Select / Book Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTechnician(tech);
                        }}
                        className="mt-2 w-full rounded-lg bg-etukas-red py-1.5 text-center text-[10px] font-bold text-white shadow-xs transition hover:brightness-110 active:scale-95 sm:text-xs"
                      >
                        Book Service
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Booking & Details Modal ── */}
      {selectedTechnician && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedTechnician(null);
                setBookingSuccessMsg(null);
                setBookedBooking(null);
              }}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <X size={18} />
            </button>

            {bookingSuccessMsg ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="mt-4 text-xl font-extrabold text-gray-900">Service Request Booked!</h3>
                <p className="mt-2 text-sm text-gray-600">{bookingSuccessMsg}</p>

                {(bookedBooking?.serviceRequestId || bookedBooking?.bookingId) && (
                  <div className="mx-auto mt-4 max-w-xs rounded-xl border border-orange-200 bg-orange-50/90 p-3 text-center shadow-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
                      Service Request ID
                    </p>
                    <p className="mt-1 font-mono text-xl font-black tracking-wider text-orange-950">
                      {bookedBooking.serviceRequestId || bookedBooking.bookingId}
                    </p>
                    <p className="mt-1 text-[11px] text-orange-800">
                      Save this ID to track your service appointment status.
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-500">
                  Technician <strong>{selectedTechnician.name}</strong> has received your contact details and will call you shortly.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                  <Link
                    to="/account?tab=services"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-100 transition"
                  >
                    View in My Bookings
                  </Link>
                  <Button
                    className="flex-1 bg-etukas-red text-white hover:brightness-110"
                    onClick={() => {
                      setSelectedTechnician(null);
                      setBookingSuccessMsg(null);
                      setBookedBooking(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {/* Technician Profile Header */}
                <div className="flex gap-4 border-b border-gray-100 pb-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 p-1 border border-gray-100">
                    <img
                      src={selectedTechnician.avatar || "/images/technicians/plumber.webp"}
                      alt={selectedTechnician.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-extrabold text-gray-900">
                        {selectedTechnician.name}
                      </h3>
                      <BadgeCheck size={16} className="text-blue-600" />
                    </div>
                    <p className="text-xs font-semibold text-etukas-red">
                      {selectedTechnician.businessName}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {selectedTechnician.categories.join(" • ")}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-0.5 font-bold text-gray-900">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {selectedTechnician.rating} ({selectedTechnician.reviewCount} jobs)
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="font-semibold text-emerald-700">
                        {selectedTechnician.experienceYears}+ years exp
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Details Grid */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-gray-50 p-2.5">
                    <p className="text-gray-400 font-medium">Service Charge</p>
                    <p className="mt-0.5 font-bold text-gray-900">
                      ₹{selectedTechnician.chargePerHour} / hr
                    </p>
                    <p className="text-[10px] text-gray-500">Full day: ₹{selectedTechnician.chargePerDay}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2.5">
                    <p className="text-gray-400 font-medium">Distance & Coverage</p>
                    <p className="mt-0.5 font-bold text-gray-900">
                      {selectedTechnician.distanceKm !== undefined
                        ? `${selectedTechnician.distanceKm} km away`
                        : selectedTechnician.city}
                    </p>
                    <p className="text-[10px] text-gray-500">Up to {selectedTechnician.serviceRadiusKm} km range</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2.5 col-span-2">
                    <p className="text-gray-400 font-medium">Available Working Hours</p>
                    <p className="mt-0.5 font-bold text-gray-900 flex items-center gap-1.5">
                      <Clock size={13} className="text-emerald-600" />
                      {selectedTechnician.workingHours} ({selectedTechnician.availableDays.join(", ")})
                    </p>
                  </div>
                </div>

                {/* Bio */}
                {selectedTechnician.bio && (
                  <div className="mt-3 rounded-xl bg-blue-50/60 p-2.5 text-xs text-gray-700">
                    <p className="font-semibold text-blue-900">About Service:</p>
                    <p className="mt-0.5 text-gray-600">{selectedTechnician.bio}</p>
                  </div>
                )}

                {/* Direct Call Button */}
                <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Direct Contact Available</p>
                    <p className="text-[11px] text-gray-500">Call partner directly for emergency inquiry</p>
                  </div>
                  <a
                    href={`tel:${selectedTechnician.mobile}`}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                  >
                    <Phone size={14} /> Call Now
                  </a>
                </div>

                {/* Quick Booking Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    bookingMutation.mutate({
                      technicianId: selectedTechnician.id,
                      customerName: String(formData.get("customerName") || ""),
                      customerPhone: String(formData.get("customerPhone") || ""),
                      serviceCategory: String(formData.get("serviceCategory") || selectedTechnician.categories[0]),
                      bookingDate: String(formData.get("bookingDate") || ""),
                      timeSlot: String(formData.get("timeSlot") || "Morning (9 AM - 12 PM)"),
                      bookingType: formData.get("bookingType") === "DAILY" ? "DAILY" : "HOURLY",
                      estimatedHours: Number(formData.get("estimatedHours")) || 2,
                      address: String(formData.get("address") || userAddress.line1 || userAddress.city),
                      notes: String(formData.get("notes") || "")
                    });
                  }}
                  className="mt-4 space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Book Service Appointment
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Your Name *
                      <Input
                        name="customerName"
                        required
                        defaultValue={userAddress.recipient || ""}
                        placeholder="e.g. Nagaraju"
                        className="mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-gray-700">
                      Phone Number *
                      <Input
                        name="customerPhone"
                        type="tel"
                        required
                        placeholder="9876543210"
                        className="mt-1 text-xs"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Service Category *
                      <select
                        name="serviceCategory"
                        className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-etukas-red"
                      >
                        {selectedTechnician.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-gray-700">
                      Preferred Date *
                      <Input
                        name="bookingDate"
                        type="date"
                        required
                        defaultValue={new Date().toISOString().split("T")[0]}
                        className="mt-1 text-xs"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Preferred Time Slot *
                      <select
                        name="timeSlot"
                        className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-etukas-red"
                      >
                        <option value="Morning (8:30 AM - 12:00 PM)">Morning (8:30 AM - 12:00 PM)</option>
                        <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                        <option value="Evening (4:00 PM - 7:30 PM)">Evening (4:00 PM - 7:30 PM)</option>
                        <option value="Urgent (Within 1 Hour)">⚡ Urgent (Within 1 Hour)</option>
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-gray-700">
                      Booking Type
                      <select
                        name="bookingType"
                        className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-etukas-red"
                      >
                        <option value="HOURLY">Hourly (₹{selectedTechnician.chargePerHour}/hr)</option>
                        <option value="DAILY">Full Day (₹{selectedTechnician.chargePerDay}/day)</option>
                      </select>
                    </label>
                  </div>

                  <label className="block text-xs font-semibold text-gray-700">
                    Service Address / Site Location *
                    <Input
                      name="address"
                      required
                      defaultValue={`${userAddress.line1 || ""}, ${userAddress.city || ""}`}
                      placeholder="Shop/House no, Street, Landmark"
                      className="mt-1 text-xs"
                    />
                  </label>

                  {bookingMutation.error && (
                    <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">
                      {bookingMutation.error.message}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedTechnician(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={bookingMutation.isPending}
                      className="flex-1 bg-etukas-red text-white hover:brightness-110 text-xs font-bold"
                    >
                      {bookingMutation.isPending ? "Submitting..." : `Confirm Booking`}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

