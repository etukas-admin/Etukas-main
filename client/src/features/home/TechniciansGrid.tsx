import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, MapPin, Star, BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { marketplaceApi, type Technician } from "../../services/api";
import { getSelectedAddress, DEFAULT_CONSTRUCTION_SITE, ADDRESS_CHANGE_EVENT } from "../location/locationStore";

/**
 * Professional / technician categories and live nearest verified technician cards
 * in Flipkart-style product grid with background color #faa6a5, compact mobile sizing,
 * distinct mascots, and direct booking links for nearest customers.
 */

const professionals = [
  {
    name: "Plumber",
    slug: "plumber",
    image: "/images/technicians/plumber.webp?v=2",
    tagline: "Pipes & Taps",
  },
  {
    name: "Painter",
    slug: "painter",
    image: "/images/technicians/painter.webp?v=2",
    tagline: "Home Painting",
  },
  {
    name: "Electrician",
    slug: "electrician",
    image: "/images/technicians/electrician.webp?v=2",
    tagline: "Wiring & Power",
  },
  {
    name: "Mason Worker",
    slug: "mason-worker",
    image: "/images/technicians/mason-worker.webp?v=3",
    tagline: "Civil & Bricks",
  },
  {
    name: "Welder",
    slug: "welder",
    image: "/images/technicians/welder.webp?v=2",
    tagline: "Grills & Gates",
  },
  {
    name: "Carpenter",
    slug: "carpenter",
    image: "/images/technicians/carpenter.webp?v=2",
    tagline: "Wood & Furniture",
  },
  {
    name: "Civil Engineer",
    slug: "civil-engineer",
    image: "/images/technicians/civil-engineer.webp?v=1",
    tagline: "Site Plans & Design",
  },
  {
    name: "Others",
    slug: "others",
    image: "/images/technicians/others.webp?v=5",
    tagline: "Site & Heavy Work",
  },
] as const;

export function TechniciansGrid() {
  const [userAddress, setUserAddress] = useState(() => getSelectedAddress() || DEFAULT_CONSTRUCTION_SITE);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const userLat = userAddress.latitude || 16.9891;
  const userLng = userAddress.longitude || 82.2475;

  useEffect(() => {
    const onAddressChange = () => {
      setUserAddress(getSelectedAddress() || DEFAULT_CONSTRUCTION_SITE);
    };
    window.addEventListener(ADDRESS_CHANGE_EVENT, onAddressChange);
    return () => window.removeEventListener(ADDRESS_CHANGE_EVENT, onAddressChange);
  }, []);

  const { data: nearbyTechnicians = [], isLoading } = useQuery({
    queryKey: ["homepage-nearest-technicians", userLat, userLng, selectedCategory],
    queryFn: () =>
      marketplaceApi.getTechnicians({
        lat: userLat,
        lng: userLng,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        sort: "nearest"
      })
  });

  const activePro = professionals.find((p) => p.slug === selectedCategory);

  return (
    <section className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-5 lg:px-6">
      {/* Container with #faa6a5 background */}
      <div className="overflow-hidden rounded-2xl bg-[#faa6a5] p-2.5 shadow-sm sm:p-3.5">
        {/* Header bar */}
        <div className="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/40 text-sm shadow-inner sm:h-8 sm:w-8">
              <Sparkles size={16} className="text-red-700" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold tracking-tight text-gray-900 sm:text-base">
                  Technicians and Professionals
                </h2>
                {userAddress.city && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold text-red-900">
                    <MapPin size={10} className="text-red-700" /> near {userAddress.city}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium text-red-950/85 sm:text-[11px] leading-tight">
                Hire verified local service experts near you • Nearest sorted first
              </p>
            </div>
          </div>
          <Link
            to={selectedCategory !== "all" ? `/technicians?category=${selectedCategory}` : "/technicians"}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-etukas-red shadow-sm transition-all hover:bg-gray-50 active:scale-95 sm:text-xs"
          >
            {selectedCategory !== "all" ? `View All ${activePro?.name}s` : "View All"} <ArrowRight size={13} />
          </Link>
        </div>

        {/* Scrollable category grid strip with interactive selection */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1.5 sm:gap-2.5 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-8 md:overflow-visible">
          {professionals.map((pro) => {
            const isSelected = selectedCategory === pro.slug;
            return (
              <button
                type="button"
                key={pro.slug}
                onClick={() => setSelectedCategory(isSelected ? "all" : pro.slug)}
                className={`group flex min-w-[124px] max-w-[140px] flex-1 flex-col items-center justify-between rounded-2xl bg-white p-2.5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 sm:min-w-0 sm:max-w-none sm:p-3 relative text-left ${
                  isSelected ? "ring-3 ring-etukas-red shadow-md scale-[1.02]" : "border border-transparent"
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-1.5 right-2 rounded-full bg-etukas-red px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow">
                    Active
                  </span>
                )}

                {/* Image container: clean white, large character */}
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50/50 p-1 transition-transform duration-200 group-hover:scale-105">
                  <img
                    src={pro.image}
                    alt={pro.name}
                    className="h-full w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>

                {/* Title & Tagline */}
                <div className="mt-1.5 w-full text-center">
                  <span className={`line-clamp-1 w-full text-[11px] font-extrabold transition-colors sm:text-xs ${
                    isSelected ? "text-etukas-red font-black" : "text-gray-900 group-hover:text-etukas-red"
                  }`}>
                    {pro.name}
                  </span>
                  <span className="mt-0.5 block line-clamp-1 text-[9px] font-medium text-gray-500 sm:text-[10px]">
                    {pro.tagline}
                  </span>
                </div>

                {/* Book Service indicator / button */}
                <span className={`mt-1.5 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[9px] font-bold shadow-xs transition-all duration-150 sm:text-[10px] ${
                  isSelected
                    ? "bg-emerald-700 text-white"
                    : "bg-etukas-red text-white group-hover:brightness-110"
                }`}>
                  {isSelected ? "Showing Nearest ✓" : "Book Service"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Nearest Technicians Service Cards Section */}
        {nearbyTechnicians.length > 0 && (
          <div className="mt-3.5 border-t border-red-300/60 pt-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-800" />
                <h3 className="text-xs font-black uppercase tracking-wider text-red-950 sm:text-sm">
                  {selectedCategory !== "all"
                    ? `Nearest Verified ${activePro?.name}s Available Live`
                    : "Nearest Verified Experts Available Live"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedCategory !== "all" && (
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-etukas-red hover:bg-white transition"
                  >
                    Clear Filter (Show All)
                  </button>
                )}
                <span className="text-[10px] font-bold text-red-900 sm:text-xs">
                  Sorted by distance
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
              {nearbyTechnicians.slice(0, 4).map((tech) => (
                <div
                  key={tech.id}
                  className="group flex min-w-[220px] max-w-[260px] flex-col justify-between rounded-xl bg-white p-2.5 shadow-sm transition hover:shadow-md sm:min-w-0 sm:max-w-none"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Avatar */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 p-1">
                      <img
                        src={tech.avatar || "/images/technicians/plumber.webp"}
                        alt={tech.name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/technicians/plumber.webp";
                        }}
                      />
                      <span className="absolute bottom-0 right-0 rounded-xs bg-emerald-600 px-1 text-[8px] font-extrabold text-white">
                        LIVE
                      </span>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <BadgeCheck size={13} className="shrink-0 text-blue-600" />
                        <h4 className="line-clamp-1 text-xs font-extrabold uppercase text-gray-900">
                          {tech.name}
                        </h4>
                      </div>
                      <p className="line-clamp-1 text-[10px] font-medium text-gray-600">
                        {tech.categories.join(", ")}
                      </p>

                      {/* Distance pill */}
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <MapPin size={11} className="shrink-0 text-red-500" />
                        <span>
                          {tech.distanceKm !== undefined ? `${tech.distanceKm} km away` : tech.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2">
                    <div>
                      <span className="text-xs font-black text-gray-900 sm:text-sm">
                        ₹{tech.chargePerHour}
                        <span className="text-[10px] font-normal text-gray-500"> / hr</span>
                      </span>
                      <div className="flex items-center gap-0.5 text-[9px] text-gray-500">
                        <Star size={9} className="fill-amber-400 text-amber-400" />
                        <span className="font-bold text-gray-700">{tech.rating.toFixed(1)}</span>
                        <span>({tech.reviewCount})</span>
                      </div>
                    </div>

                    <Link
                      to={`/technicians?category=${encodeURIComponent(selectedCategory !== "all" ? selectedCategory : tech.primaryCategory)}&techId=${encodeURIComponent(tech.id)}`}
                      className="inline-flex items-center justify-center rounded-lg bg-etukas-red px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition hover:brightness-110 active:scale-95"
                    >
                      Book Service
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
