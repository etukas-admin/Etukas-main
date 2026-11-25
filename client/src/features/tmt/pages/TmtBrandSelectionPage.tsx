import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "../../../components/ui/Skeleton";
import {
  ADDRESS_CHANGE_EVENT,
  getDeliveryLabel,
  getSelectedAddress
} from "../../location/locationStore";
import { useTmtBrands } from "../useTmtCatalog";
import { TmtBrandBadge } from "../components/TmtBrandBadge";
import { TmtBuyerGuideDrawer } from "../components/TmtBuyerGuideDrawer";
import type { TmtBrandTier, TmtGrade } from "../../../types/tmt";
import { cn } from "../../../lib/utils";

const GRADE_FILTERS: ReadonlyArray<{ label: string; value: TmtGrade | "all" }> = [
  { label: "All Grades", value: "all" },
  { label: "Fe 500D", value: "Fe 500D" },
  { label: "Fe 550D", value: "Fe 550D" },
  { label: "CRS", value: "CRS" },
  { label: "Fe 500", value: "Fe 500" }
];

const TIER_FILTERS: ReadonlyArray<{ label: string; value: TmtBrandTier | "all" }> = [
  { label: "All Brands", value: "all" },
  { label: "Primary Brands", value: "primary" },
  { label: "Regional Brands", value: "regional" }
];

export function TmtBrandSelectionPage() {
  const navigate = useNavigate();
  const [activeAddress, setActiveAddress] = useState(getSelectedAddress);
  const [deliveryLabel, setDeliveryLabel] = useState(getDeliveryLabel);

  const [selectedGrade, setSelectedGrade] = useState<TmtGrade | "all">("all");
  const [selectedTier, setSelectedTier] = useState<TmtBrandTier | "all">("all");
  const [brandSearch, setBrandSearch] = useState("");
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const syncLocation = () => {
      setActiveAddress(getSelectedAddress());
      setDeliveryLabel(getDeliveryLabel());
    };
    window.addEventListener(ADDRESS_CHANGE_EVENT, syncLocation);
    window.addEventListener("storage", syncLocation);
    return () => {
      window.removeEventListener(ADDRESS_CHANGE_EVENT, syncLocation);
      window.removeEventListener("storage", syncLocation);
    };
  }, []);

  const locationCity = activeAddress?.city || activeAddress?.district || "Hyderabad";
  const { brands, isLoading } = useTmtBrands({
    tier: selectedTier,
    grade: selectedGrade,
    q: brandSearch,
    city: activeAddress?.city || activeAddress?.district,
    latitude: activeAddress?.latitude,
    longitude: activeAddress?.longitude
  });

  const primaryCount = brands.filter((b) => b.tier === "primary").length;
  const regionalCount = brands.filter((b) => b.tier === "regional").length;

  return (
    <main className="min-h-screen bg-gray-50/60 pb-20 md:pb-12">
      {/* Compact Crimson-Red Hero Banner */}
      <section className="bg-gradient-to-r from-[#9e141a] via-[#C52228] to-[#dc3545] text-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:py-7 lg:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-xs">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Live Yard Rates
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-bold text-red-50">
                  <MapPin size={10} /> {deliveryLabel}
                </span>
              </div>

              <h1 className="mt-2 text-xl font-black tracking-tight sm:text-3xl">
                INDIA&apos;S TOP TMT BRANDS - Live Yard Rates
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-red-50/95 sm:text-sm">
                Order 6mm to 32mm IS 1786 TMT bars in standard 12m (40ft) bundles or Metric Tons across Primary &amp; Telangana/AP Regional mills serving{" "}
                <strong>{locationCity}</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-etukas-red shadow-md transition hover:bg-red-50 active:scale-[0.98]"
              >
                <Calculator size={15} />
                <span>Buyer Guide &amp; Estimator</span>
              </button>
              <Link
                to="/guides/tmt-bars"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20"
              >
                <BookOpen size={14} />
                <span>Full Guide</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 lg:px-6">
        {/* Accessible Buyer Guide & Estimator Banner */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-red-200/80 bg-gradient-to-r from-etukas-pink via-white to-slate-50 p-3.5 shadow-xs sm:flex-row sm:items-center sm:px-5">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-etukas-red text-white shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-etukas-black sm:text-sm">
                Not sure how many tons or bundles your house needs?
              </p>
              <p className="text-[11px] text-gray-600 sm:text-xs">
                Use our <strong>1 BHK / 2 BHK / 3 BHK Steel Estimator</strong> &amp; IS 1786 size diagram to auto-fill your order.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-etukas-black px-3.5 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
            >
              <span>Open Estimator</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Filters Row: Search + Tier Toggle + Horizontal Scrollable Grade Pills */}
        <div className="space-y-3 rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-xs sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Tier Toggle (Primary vs Regional) */}
            <div
              role="group"
              aria-label="Brand tier filter"
              className="inline-flex w-full overflow-x-auto rounded-xl bg-gray-100 p-1 md:w-auto"
            >
              {TIER_FILTERS.map((tier) => {
                const active = selectedTier === tier.value;
                return (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => setSelectedTier(tier.value)}
                    className={cn(
                      "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all md:flex-none",
                      active
                        ? "bg-etukas-red text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>

            {/* Brand Search */}
            <div className="relative w-full md:w-72">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Filter Tata, JSW, Radha, Sugna..."
                className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-xs font-semibold text-etukas-black outline-none transition focus:border-etukas-red focus:bg-white focus:ring-2 focus:ring-etukas-red/15 [&::-webkit-search-cancel-button]:hidden"
              />
              {brandSearch ? (
                <button
                  type="button"
                  onClick={() => setBrandSearch("")}
                  aria-label="Clear brand filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Horizontal Scrollable Grade Pills */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pt-0.5">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Grade:
            </span>
            {GRADE_FILTERS.map((grade) => {
              const isActive = selectedGrade === grade.value;
              return (
                <button
                  key={grade.value}
                  type="button"
                  onClick={() => setSelectedGrade(grade.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
                    isActive
                      ? "border-etukas-black bg-etukas-black text-white shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:border-etukas-red/50 hover:text-etukas-red"
                  )}
                >
                  {grade.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Meta */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <p>
            Showing <strong className="text-etukas-black">{brands.length}</strong> TMT brands
            {selectedTier === "all"
              ? ` (${primaryCount} Primary • ${regionalCount} Regional)`
              : ""}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck size={13} /> IS 1786 Certified • 12m (40ft) Standard Length
          </span>
        </div>

        {/* Brand Cards Grid (1 col mobile, 2–3 cols desktop) */}
        {isLoading && brands.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm font-extrabold text-etukas-black">
              No TMT brands match your current filters
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Reset grade or brand filters to view all 15 National &amp; Regional mills.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedGrade("all");
                setSelectedTier("all");
                setBrandSearch("");
              }}
              className="mt-4 rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => {
              const targetGrade =
                selectedGrade !== "all" && brand.available_grades.includes(selectedGrade)
                  ? selectedGrade
                  : brand.default_grade;
              const orderHref = `/categories/tmt-steel/${encodeURIComponent(
                brand.slug
              )}?grade=${encodeURIComponent(targetGrade)}`;

              return (
                <article
                  key={brand.slug}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-etukas-red/40 hover:shadow-md"
                >
                  <div>
                    {/* Card Top: Badge + Name + Tier */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <TmtBrandBadge brand={brand} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h2 className="truncate text-base font-black text-etukas-black group-hover:text-etukas-red">
                              {brand.name}
                            </h2>
                          </div>
                          <p className="truncate text-[11px] font-medium text-gray-500">
                            {brand.manufacturer}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                          brand.tier === "primary"
                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                            : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                        )}
                      >
                        {brand.tier === "primary" ? "Primary" : "Regional"}
                      </span>
                    </div>

                    {/* Tagline */}
                    <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-gray-600">
                      {brand.tagline}
                    </p>

                    {/* Grade Badges + 8mm Lite Tag */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {brand.available_grades.map((grade) => (
                        <span
                          key={grade}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-extrabold",
                            grade === targetGrade
                              ? "bg-etukas-pink text-etukas-red ring-1 ring-etukas-red/25"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {grade}
                        </span>
                      ))}
                      {brand.supports_lite_variants ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          8mm Lite Avail.
                        </span>
                      ) : null}
                    </div>

                    {/* Starting Rate & Live Indicator */}
                    <div className="mt-4 flex items-end justify-between rounded-xl border border-gray-100 bg-gray-50/90 px-3.5 py-2.5">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Starting Yard Rate ({targetGrade})
                        </span>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <span className="text-xl font-black tabular-nums text-etukas-black">
                            ₹{brand.base_rate_per_ton_inr.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-bold text-gray-500">/ Ton</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                          {brand.has_live_seller_listing ? "Live Yard" : "Live Rate"}
                        </span>
                        <p className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold text-gray-500">
                          <Truck size={10} className="text-etukas-red" />
                          <span>
                            {brand.distance_km != null
                              ? `${brand.distance_km} km • ${brand.delivery_eta || "Same day"}`
                              : brand.store_name || "12m (40ft)"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Full-width Crimson CTA */}
                  <div className="mt-4">
                    <Link
                      to={orderHref}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-etukas-red px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-red-700 active:scale-[0.99] sm:text-sm"
                    >
                      <span>Select Sizes &amp; Order</span>
                      <ArrowRight size={15} />
                    </Link>
                    {brand.has_live_seller_listing && brand.store_name ? (
                      <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-gray-500">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        <span>Yard: {brand.store_name}</span>
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <TmtBuyerGuideDrawer
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onAutoFill={(_bundles, bhk, brandSlug) => {
          navigate(
            `/categories/tmt-steel/${encodeURIComponent(brandSlug)}?autofill=${encodeURIComponent(
              bhk
            )}`
          );
        }}
      />
    </main>
  );
}
