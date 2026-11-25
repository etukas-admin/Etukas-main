import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Heart,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Store as StoreIcon,
  Tractor,
  Truck,
  Wrench,
  X
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { OPEN_SUPPORT_CHAT_EVENT } from "../../components/chat/UserChatWidget";
import { CustomerSupportPillButton } from "../../components/layout/CustomerSupportPillButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { useDebounce } from "../../hooks/useDebounce";
import { useCategories, useProducts, useStores } from "../../hooks/useMarketplace";
import { useTechnicians } from "../../hooks/useTechnicians";
import { formatMoney } from "../../lib/utils";
import {
  getProductImageUrl,
  type Category,
  type Store,
  type StoreProduct,
  type Technician
} from "../../services/api";
import {
  createSafeImageHandler,
  FALLBACK_PRODUCT_IMAGE,
  FALLBACK_TECHNICIAN_IMAGE
} from "../../utils/imageFallback";
import {
  recordRecentlyViewedStore,
  useRecentlyViewed,
  useWishlist
} from "../account";
import {
  ADDRESS_CHANGE_EVENT,
  DEFAULT_CONSTRUCTION_SITE,
  getDeliveryLabel,
  getSelectedAddress
} from "../location/locationStore";
import {
  buildOrderedMaterialCategories,
  computeDiscountPercent,
  extractBrandsFromProducts,
  extractStoresFromProducts,
  filterCategoriesByQuery,
  filterServicesByQuery,
  getCategoryIconComponent,
  MACHINERY_SERVICES,
  MACHINERY_TAB_SLUG,
  resolveCategoryImage,
  TECHNICIAN_SERVICES,
  TECHNICIANS_TAB_SLUG,
  type ServiceDirectoryItem
} from "./categoryVisuals";
import { TMT_MASTER_BRANDS } from "../../types/tmt";

function CategoryThumbnail({
  category,
  sizeClass = "h-11 w-11",
  iconSize = 28
}: {
  category: Pick<Category, "name" | "slug" | "sampleImageUrl">;
  sizeClass?: string;
  iconSize?: number;
}) {
  const imageUrl = resolveCategoryImage(category);
  const IconComponent = getCategoryIconComponent(category.slug);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={category.name}
        className={`${sizeClass} object-contain`}
        loading="lazy"
        onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
      />
    );
  }

  if (IconComponent) {
    return <IconComponent size={iconSize} className="shrink-0" />;
  }

  return <Package size={Math.max(20, iconSize - 6)} className="text-etukas-red" />;
}

function StoreMonogram({ store }: { store: Store }) {
  if (store.storeImageUrl?.trim()) {
    return (
      <img
        src={store.storeImageUrl}
        alt={store.name}
        className="h-12 w-12 shrink-0 rounded-xl border border-gray-100 bg-gray-50 object-cover"
        loading="lazy"
        onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
      />
    );
  }

  const initials = store.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-etukas-red/15 bg-etukas-pink text-sm font-extrabold text-etukas-red">
      {initials || <StoreIcon size={18} />}
    </div>
  );
}

function StoreMiniCard({ store }: { store: Store }) {
  const isVerified = store.sellerProfile?.verificationStatus === "APPROVED";

  return (
    <Link
      to={`/products?q=${encodeURIComponent(store.name)}`}
      onClick={() => recordRecentlyViewedStore(store, store.storeImageUrl ?? undefined)}
      className="group flex min-w-[215px] max-w-[250px] shrink-0 snap-start items-center gap-3 rounded-2xl border border-gray-200/90 bg-white p-3 shadow-sm transition-all hover:border-etukas-red/40 hover:shadow-md sm:min-w-0 sm:max-w-none"
    >
      <StoreMonogram store={store} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-gray-900 transition-colors group-hover:text-etukas-red sm:text-sm">
          {store.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-500">
          <MapPin size={11} className="shrink-0 text-etukas-red" />
          <span className="truncate">{store.city}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {isVerified ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-etukas-green">
              <CheckCircle2 size={10} /> VERIFIED
            </span>
          ) : null}
          <span className="text-[10px] font-semibold text-gray-500">
            {store.distanceKm != null
              ? `${store.distanceKm} km away`
              : `${store.serviceRadiusKm ?? 25} km radius`}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ServiceTileCard({
  item,
  href,
  fallbackImage,
  compact = false
}: {
  item: ServiceDirectoryItem;
  href: string;
  fallbackImage: string;
  compact?: boolean;
}) {
  return (
    <Link
      to={href}
      className={`group flex flex-col items-center justify-between rounded-2xl border border-gray-200/85 bg-white text-center shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-etukas-red/40 hover:shadow-md ${
        compact ? "p-2 sm:p-2.5" : "p-3 sm:p-3.5"
      }`}
    >
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50/70 p-1.5 transition-transform duration-200 group-hover:scale-105 ${
          compact ? "aspect-square" : "aspect-[4/3]"
        }`}
      >
        <img
          src={item.image}
          alt={item.name}
          className="h-full w-full object-contain drop-shadow-xs"
          loading="lazy"
          onError={createSafeImageHandler(fallbackImage)}
        />
      </div>
      <div className="mt-2 w-full">
        <span className="line-clamp-1 block text-[11px] font-extrabold text-gray-900 transition-colors group-hover:text-etukas-red sm:text-xs">
          {item.name}
        </span>
        <span className="mt-0.5 line-clamp-1 block text-[10px] font-medium text-gray-500">
          {item.tagline}
        </span>
      </div>
      {!compact ? (
        <span className="mt-2 inline-flex items-center justify-center rounded-full bg-etukas-red px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs transition group-hover:brightness-110">
          Book Service
        </span>
      ) : null}
    </Link>
  );
}

function LiveTechnicianCard({ tech }: { tech: Technician }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-200/90 bg-white p-3 shadow-xs transition hover:border-etukas-red/40 hover:shadow-md">
      <div className="flex items-start gap-2.5">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 p-1">
          <img
            src={tech.avatar || FALLBACK_TECHNICIAN_IMAGE}
            alt={tech.name}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={createSafeImageHandler(FALLBACK_TECHNICIAN_IMAGE)}
          />
          <span className="absolute bottom-0 right-0 rounded bg-etukas-green px-1 text-[8px] font-extrabold text-white">
            LIVE
          </span>
        </div>

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
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-etukas-green">
            <MapPin size={10} className="shrink-0 text-etukas-red" />
            <span>{tech.distanceKm !== undefined ? `${tech.distanceKm} km away` : tech.city}</span>
          </div>
        </div>
      </div>

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
          to={`/technicians?category=${encodeURIComponent(tech.primaryCategory)}&techId=${encodeURIComponent(tech.id)}`}
          className="inline-flex items-center justify-center rounded-lg bg-etukas-red px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition hover:bg-red-700"
        >
          Book Service
        </Link>
      </div>
    </div>
  );
}

function CategoryProductCard({
  item,
  wishlisted,
  onToggleWishlist,
  showNewBadgeWhenNoDiscount = false
}: {
  item: StoreProduct;
  wishlisted: boolean;
  onToggleWishlist: (product: StoreProduct) => void;
  showNewBadgeWhenNoDiscount?: boolean;
}) {
  const discountPercent = computeDiscountPercent(item.priceMinor, item.discountMinor);
  const mrpMinor =
    discountPercent !== null && item.discountMinor
      ? item.priceMinor + item.discountMinor
      : null;

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-etukas-red/35 hover:shadow-md">
      <button
        type="button"
        onClick={() => onToggleWishlist(item)}
        aria-label={
          wishlisted
            ? `Remove ${item.product.name} from wishlist`
            : `Save ${item.product.name} to wishlist`
        }
        className="focus-ring absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow-sm transition hover:scale-105 hover:text-etukas-red"
      >
        <Heart size={14} className={wishlisted ? "fill-etukas-red text-etukas-red" : ""} />
      </button>

      <Link to={`/product/${item.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
          <img
            src={getProductImageUrl(
              item.product.images[0],
              item.product.id,
              FALLBACK_PRODUCT_IMAGE
            )}
            alt={item.product.images[0]?.altText || item.product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
          />
          {discountPercent !== null ? (
            <span className="absolute left-2 top-2 rounded-md bg-etukas-green px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
              {discountPercent}% OFF
            </span>
          ) : showNewBadgeWhenNoDiscount ? (
            <span className="absolute left-2 top-2 rounded-md bg-etukas-black/85 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
              NEW
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3">
        <div>
          <Link
            to={`/product/${item.id}`}
            className="line-clamp-2 text-xs font-bold leading-snug text-gray-900 transition-colors group-hover:text-etukas-red sm:text-[13px]"
          >
            {item.product.name}
          </Link>
          <p className="mt-1 truncate text-[10px] font-medium text-gray-500 sm:text-[11px]">
            {item.store.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-gray-500">
            {item.distanceKm != null ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-etukas-green">
                <MapPin size={9} /> {item.distanceKm} km
              </span>
            ) : null}
            <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700">
              <Truck size={9} /> {item.deliveryEta}
            </span>
          </div>
        </div>

        <div className="mt-2.5 border-t border-gray-100 pt-2">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-sm font-extrabold text-gray-900 sm:text-base">
              {formatMoney(item.priceMinor)}
            </span>
            <span className="text-[10px] font-semibold text-gray-500">
              /{item.product.unit}
            </span>
            {mrpMinor !== null ? (
              <span className="text-[10px] text-gray-400 line-through">
                {formatMoney(mrpMinor)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[10px] text-gray-500">
            Min {item.minOrderQuantity} {item.product.unit}
            {item.stockQuantity <= 20 ? ` • ${item.stockQuantity} left` : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

function LocationEmptyProducts({
  categoryName,
  cityLabel,
  onResetCategory
}: {
  categoryName?: string;
  cityLabel: string;
  onResetCategory?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-6 text-center">
      <p className="text-sm font-bold text-gray-900">
        No sellers currently deliver{categoryName ? ` ${categoryName}` : " materials"} to{" "}
        {cityLabel}.
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Listings are filtered by each partner&apos;s delivery radius from their store.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          to="/location"
          className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
        >
          <MapPin size={13} /> Change Delivery Location
        </Link>
        {onResetCategory ? (
          <button
            type="button"
            onClick={onResetCategory}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
          >
            View All Categories
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rightPaneRef = useRef<HTMLElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [activeAddress, setActiveAddress] = useState(getSelectedAddress);
  const [deliveryLabel, setDeliveryLabel] = useState(getDeliveryLabel);
  const [searchInput, setSearchInput] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const debouncedQuery = useDebounce(searchInput, 200);
  const trimmedQuery = debouncedQuery.trim();
  const selectedSlug = searchParams.get("selected") || "for-you";

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

  const locationCity = activeAddress?.city || activeAddress?.district || "your area";
  const locationLat = activeAddress?.latitude ?? DEFAULT_CONSTRUCTION_SITE.latitude;
  const locationLng = activeAddress?.longitude ?? DEFAULT_CONSTRUCTION_SITE.longitude;
  const locationParams = useMemo(
    () => ({
      city: activeAddress?.city || activeAddress?.district,
      latitude: activeAddress?.latitude,
      longitude: activeAddress?.longitude
    }),
    [activeAddress?.city, activeAddress?.district, activeAddress?.latitude, activeAddress?.longitude]
  );

  const categoriesQuery = useCategories();
  const allCategories = categoriesQuery.data ?? [];
  const materialCategories = useMemo(
    () => buildOrderedMaterialCategories(allCategories),
    [allCategories]
  );

  const activeMaterialCategory = useMemo(() => {
    if (
      selectedSlug === "for-you" ||
      selectedSlug === TECHNICIANS_TAB_SLUG ||
      selectedSlug === MACHINERY_TAB_SLUG
    ) {
      return undefined;
    }
    return (
      materialCategories.find((cat) => cat.slug === selectedSlug) ??
      allCategories.find((cat) => cat.slug === selectedSlug)
    );
  }, [allCategories, materialCategories, selectedSlug]);

  useEffect(() => {
    const isBuiltInTab =
      selectedSlug === "for-you" ||
      selectedSlug === TECHNICIANS_TAB_SLUG ||
      selectedSlug === MACHINERY_TAB_SLUG;

    if (
      !isBuiltInTab &&
      !categoriesQuery.isLoading &&
      !categoriesQuery.isError &&
      !activeMaterialCategory
    ) {
      const next = new URLSearchParams(searchParams);
      next.delete("selected");
      setSearchParams(next, { replace: true });
    }
  }, [
    activeMaterialCategory,
    categoriesQuery.isError,
    categoriesQuery.isLoading,
    searchParams,
    selectedSlug,
    setSearchParams
  ]);

  const effectiveTab =
    selectedSlug === TECHNICIANS_TAB_SLUG
      ? TECHNICIANS_TAB_SLUG
      : selectedSlug === MACHINERY_TAB_SLUG
      ? MACHINERY_TAB_SLUG
      : activeMaterialCategory
      ? activeMaterialCategory.slug
      : "for-you";

  const isSearchMode = trimmedQuery.length > 0;
  const isTechniciansTab = effectiveTab === TECHNICIANS_TAB_SLUG;
  const isMachineryTab = effectiveTab === MACHINERY_TAB_SLUG;

  const storesQuery = useStores(locationParams);
  const forYouProductsQuery = useProducts(
    {
      ...locationParams,
      sort: "newest",
      pageSize: 12,
      q: isSearchMode ? trimmedQuery : undefined
    },
    { enabled: effectiveTab === "for-you" || isSearchMode }
  );

  const categoryProductsQuery = useProducts(
    {
      ...locationParams,
      category: isMachineryTab ? MACHINERY_TAB_SLUG : activeMaterialCategory?.slug,
      pageSize: 16
    },
    { enabled: (Boolean(activeMaterialCategory) || isMachineryTab) && !isSearchMode }
  );

  const techniciansQuery = useTechnicians(
    {
      lat: locationLat,
      lng: locationLng,
      sort: "nearest"
    },
    { enabled: isTechniciansTab && !isSearchMode }
  );

  const recentlyViewed = useRecentlyViewed();
  const wishlist = useWishlist();

  const matchingCategories = useMemo(
    () => filterCategoriesByQuery(materialCategories, trimmedQuery),
    [materialCategories, trimmedQuery]
  );
  const matchingTechnicians = useMemo(
    () => filterServicesByQuery(TECHNICIAN_SERVICES, trimmedQuery),
    [trimmedQuery]
  );
  const matchingMachinery = useMemo(
    () => filterServicesByQuery(MACHINERY_SERVICES, trimmedQuery),
    [trimmedQuery]
  );

  const categoryProducts = categoryProductsQuery.data ?? [];
  const availableBrands = useMemo(
    () => extractBrandsFromProducts(categoryProducts),
    [categoryProducts]
  );
  const categoryStores = useMemo(
    () => extractStoresFromProducts(categoryProducts),
    [categoryProducts]
  );

  const selectTab = (slug: string) => {
    setSearchInput("");
    const next = new URLSearchParams(searchParams);
    if (slug === "for-you") {
      next.delete("selected");
    } else {
      next.set("selected", slug);
    }
    setSearchParams(next, { replace: true });
    rightPaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const openSupportChat = () => {
    window.dispatchEvent(new Event(OPEN_SUPPORT_CHAT_EVENT));
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      navigate(`/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/products");
    }
  };

  const toggleMobileSearch = () => {
    setIsMobileSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => mobileSearchInputRef.current?.focus(), 40);
      } else {
        setSearchInput("");
      }
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl">
        {/* ================= MOBILE COMPACT STICKY HEADER (< md) ================= */}
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md md:hidden">
          <div className="flex h-13 items-center gap-2.5 px-3 py-2">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-800 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft size={21} />
            </button>
            <h1 className="flex-1 truncate text-base font-extrabold text-etukas-black">
              All Categories
            </h1>
            <button
              type="button"
              onClick={toggleMobileSearch}
              aria-label={isMobileSearchOpen ? "Close search" : "Search categories or materials"}
              aria-expanded={isMobileSearchOpen}
              className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100"
            >
              {isMobileSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
            <CustomerSupportPillButton onClick={openSupportChat} size={27} animateOnLoad />
          </div>

          {isMobileSearchOpen || searchInput.length > 0 ? (
            <form onSubmit={handleSearchSubmit} role="search" className="px-3 pb-2">
              <label className="relative flex w-full items-center">
                <span className="sr-only">Search categories, technicians, machinery, and materials</span>
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search materials, technicians, machinery..."
                  enterKeyHint="search"
                  className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-xs font-medium text-etukas-black outline-none placeholder:text-gray-400 focus:border-etukas-red focus:bg-white focus:ring-2 focus:ring-etukas-red/15 [&::-webkit-search-cancel-button]:hidden"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear filter"
                    className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </label>
            </form>
          ) : null}

          <div className="border-t border-gray-100 bg-etukas-pink/55 px-3 py-1.5">
            <Link
              to="/location"
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-gray-600">
                <MapPin size={13} className="shrink-0 text-etukas-red" />
                <span>Delivering to:</span>
                <strong className="truncate font-extrabold text-etukas-black">
                  {deliveryLabel}
                </strong>
              </span>
              <span className="shrink-0 font-bold text-etukas-red">Change &rsaquo;</span>
            </Link>
          </div>
        </header>

        {/* ================= DESKTOP SUB-HEADER BAR (md+) ================= */}
        <div className="hidden items-center justify-between gap-4 border-b border-gray-100 bg-white px-4 py-4 md:flex lg:px-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-etukas-black">
              All Categories
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Building Materials, Professionals &amp; Machinery delivering to{" "}
              <strong className="text-gray-800">{locationCity}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} role="search" className="relative w-72 lg:w-80">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search materials, technicians, machinery..."
                aria-label="Search materials, technicians, machinery"
                className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-xs font-medium text-etukas-black outline-none placeholder:text-gray-400 focus:border-etukas-red focus:bg-white focus:ring-2 focus:ring-etukas-red/15 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear filter"
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                >
                  <X size={13} />
                </button>
              ) : null}
            </form>

            <Link
              to="/products"
              className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-xl border border-etukas-red/25 bg-etukas-pink/60 px-3 py-2 text-xs font-bold text-etukas-red transition hover:bg-etukas-pink"
            >
              Browse All Products <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* ================= FLIPKART/AMAZON SPLIT-PANE DIRECTORY ================= */}
        <div className="grid grid-cols-[90px_1fr] sm:grid-cols-[108px_1fr] md:grid-cols-[224px_1fr] lg:grid-cols-[256px_1fr]">
          {/* Left Vertical Category Rail */}
          <aside
            role="tablist"
            aria-label="Product and service categories"
            className="no-scrollbar sticky top-[82px] h-[calc(100dvh-9.25rem)] overflow-y-auto border-r border-gray-100 bg-gray-50/85 md:top-[var(--etukas-header-height,64px)] md:h-[calc(100dvh-var(--etukas-header-height,64px))]"
          >
            {/* 1. For You */}
            <button
              type="button"
              role="tab"
              aria-selected={effectiveTab === "for-you" && !isSearchMode}
              onClick={() => selectTab("for-you")}
              className={`focus-ring relative flex w-full flex-col items-center justify-center gap-1.5 border-b border-gray-200/70 px-2 py-3 text-center transition-colors md:flex-row md:justify-start md:gap-3 md:px-3.5 md:py-3 md:text-left ${
                effectiveTab === "for-you" && !isSearchMode
                  ? "bg-white text-etukas-red"
                  : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
              }`}
            >
              {effectiveTab === "for-you" && !isSearchMode ? (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-etukas-red" />
              ) : null}
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-etukas-red/15 bg-etukas-pink text-etukas-red shadow-xs md:h-10 md:w-10">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-extrabold leading-tight md:text-xs">
                  For You
                </span>
                <span className="hidden text-[10px] font-medium text-gray-400 md:block">
                  All materials &amp; services
                </span>
              </div>
            </button>

            {/* 2. Building Materials (exact Homepage side-scroll order) */}
            {materialCategories.map((category) => {
              const isActive = effectiveTab === category.slug && !isSearchMode;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectTab(category.slug)}
                  className={`focus-ring relative flex w-full flex-col items-center justify-center gap-1.5 border-b border-gray-200/70 px-2 py-3 text-center transition-colors md:flex-row md:justify-start md:gap-3 md:px-3.5 md:py-3 md:text-left ${
                    isActive
                      ? "bg-white text-etukas-red"
                      : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
                  }`}
                >
                  {isActive ? (
                    <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-etukas-red" />
                  ) : null}
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-xs ring-1 transition md:h-10 md:w-10 ${
                      isActive ? "ring-etukas-red/30" : "ring-gray-200/70"
                    }`}
                  >
                    <CategoryThumbnail
                      category={category}
                      sizeClass="h-9 w-9"
                      iconSize={26}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[11px] font-bold leading-tight md:text-xs">
                      {category.name}
                    </span>
                    {typeof category.productCount === "number" && category.productCount > 0 ? (
                      <span className="mt-0.5 hidden text-[10px] font-medium text-gray-400 md:block">
                        {category.productCount}{" "}
                        {category.productCount === 1 ? "item" : "items"}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}

            {/* 3. Technicians & Professionals */}
            <button
              type="button"
              role="tab"
              aria-selected={isTechniciansTab && !isSearchMode}
              onClick={() => selectTab(TECHNICIANS_TAB_SLUG)}
              className={`focus-ring relative flex w-full flex-col items-center justify-center gap-1.5 border-b border-gray-200/70 px-2 py-3 text-center transition-colors md:flex-row md:justify-start md:gap-3 md:px-3.5 md:py-3 md:text-left ${
                isTechniciansTab && !isSearchMode
                  ? "bg-white text-etukas-red"
                  : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
              }`}
            >
              {isTechniciansTab && !isSearchMode ? (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-etukas-red" />
              ) : null}
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-xs ring-1 transition md:h-10 md:w-10 ${
                  isTechniciansTab ? "ring-etukas-red/30" : "ring-gray-200/70"
                }`}
              >
                <img
                  src="/images/technicians/plumber.webp"
                  alt="Technicians and Professionals"
                  className="h-9 w-9 object-contain"
                  onError={createSafeImageHandler(FALLBACK_TECHNICIAN_IMAGE)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[11px] font-bold leading-tight md:text-xs">
                  Professionals &amp; Technicians
                </span>
                <span className="mt-0.5 hidden text-[10px] font-medium text-gray-400 md:block">
                  8 trades • Live booking
                </span>
              </div>
            </button>

            {/* 4. Machinery & Vehicles */}
            <button
              type="button"
              role="tab"
              aria-selected={isMachineryTab && !isSearchMode}
              onClick={() => selectTab(MACHINERY_TAB_SLUG)}
              className={`focus-ring relative flex w-full flex-col items-center justify-center gap-1.5 border-b border-gray-200/70 px-2 py-3 text-center transition-colors md:flex-row md:justify-start md:gap-3 md:px-3.5 md:py-3 md:text-left ${
                isMachineryTab && !isSearchMode
                  ? "bg-white text-etukas-red"
                  : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
              }`}
            >
              {isMachineryTab && !isSearchMode ? (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-etukas-red" />
              ) : null}
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-xs ring-1 transition md:h-10 md:w-10 ${
                  isMachineryTab ? "ring-etukas-red/30" : "ring-gray-200/70"
                }`}
              >
                <img
                  src="/images/machinery/jcb.webp"
                  alt="Machinery and Vehicles"
                  className="h-9 w-9 object-contain"
                  onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[11px] font-bold leading-tight md:text-xs">
                  Machinery &amp; Vehicles
                </span>
                <span className="mt-0.5 hidden text-[10px] font-medium text-gray-400 md:block">
                  8 machines • Site hire
                </span>
              </div>
            </button>
          </aside>

          {/* Right Dynamic Content Pane */}
          <section
            ref={rightPaneRef}
            role="tabpanel"
            aria-label={
              isSearchMode
                ? `Search results for ${trimmedQuery}`
                : isTechniciansTab
                ? "Professionals and Technicians"
                : isMachineryTab
                ? "Machinery and Vehicles"
                : activeMaterialCategory
                ? activeMaterialCategory.name
                : "For You"
            }
            className="min-w-0 px-3 py-4 sm:px-4 md:px-6 md:py-5"
          >
            {categoriesQuery.isError ? (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5">
                <p className="text-xs font-bold text-amber-900">
                  Showing Etukas standard catalog while live category counts refresh.
                </p>
                <button
                  type="button"
                  onClick={() => void categoriesQuery.refetch()}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
                >
                  <RefreshCw size={12} /> Retry Sync
                </button>
              </div>
            ) : null}

            {/* ============== MODE 1: INLINE SEARCH RESULTS ============== */}
            {isSearchMode ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-gray-500">Showing matches for</p>
                    <h2 className="text-base font-extrabold text-etukas-black">
                      &ldquo;{trimmedQuery}&rdquo;
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Clear
                    </button>
                    <Link
                      to={`/products?q=${encodeURIComponent(trimmedQuery)}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-etukas-red px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Full Catalog <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>

                {matchingCategories.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-extrabold text-etukas-black">
                      Building Materials ({matchingCategories.length})
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {matchingCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => selectTab(cat.slug)}
                          className="focus-ring group flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white p-2.5 text-left shadow-xs transition hover:border-etukas-red/40 hover:shadow-md"
                        >
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gray-50 p-1">
                            <CategoryThumbnail
                              category={cat}
                              sizeClass="h-9 w-9"
                              iconSize={26}
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="line-clamp-2 block text-xs font-bold text-gray-900 group-hover:text-etukas-red">
                              {cat.name}
                            </span>
                            {typeof cat.productCount === "number" && cat.productCount > 0 ? (
                              <span className="text-[10px] text-gray-500">
                                {cat.productCount} items
                              </span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {matchingTechnicians.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-extrabold text-etukas-black">
                      Professionals &amp; Technicians ({matchingTechnicians.length})
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {matchingTechnicians.map((pro) => (
                        <ServiceTileCard
                          key={pro.slug}
                          item={pro}
                          href={`/technicians?category=${encodeURIComponent(pro.slug)}`}
                          fallbackImage={FALLBACK_TECHNICIAN_IMAGE}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {matchingMachinery.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-extrabold text-etukas-black">
                      Machinery &amp; Vehicles ({matchingMachinery.length})
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {matchingMachinery.map((machine) => (
                        <ServiceTileCard
                          key={machine.slug}
                          item={machine}
                          href={`/products?category=${encodeURIComponent(machine.slug)}`}
                          fallbackImage={FALLBACK_PRODUCT_IMAGE}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-etukas-black">
                      Matching Products near {locationCity}
                    </h3>
                    <Link
                      to={`/products?q=${encodeURIComponent(trimmedQuery)}`}
                      className="text-xs font-bold text-etukas-red hover:underline"
                    >
                      Search all products &rarr;
                    </Link>
                  </div>

                  {forYouProductsQuery.isLoading ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-56 rounded-2xl" />
                      ))}
                    </div>
                  ) : forYouProductsQuery.data?.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {forYouProductsQuery.data.map((item) => (
                        <CategoryProductCard
                          key={item.id}
                          item={item}
                          wishlisted={wishlist.isWishlisted(item.id)}
                          onToggleWishlist={wishlist.toggle}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <LocationEmptyProducts cityLabel={locationCity} />
                    </div>
                  )}
                </div>
              </div>
            ) : isTechniciansTab ? (
              /* ============== MODE 2: PROFESSIONALS & TECHNICIANS ============== */
              <div className="space-y-7">
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-red-200/70 bg-gradient-to-r from-[#faa6a5]/35 via-etukas-pink to-white p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white p-1.5 shadow-sm sm:h-16 sm:w-16">
                      <img
                        src="/images/technicians/plumber.webp"
                        alt="Technicians and Professionals"
                        className="h-12 w-12 object-contain"
                        onError={createSafeImageHandler(FALLBACK_TECHNICIAN_IMAGE)}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-etukas-red">
                        <Wrench size={10} /> Verified Workforce
                      </span>
                      <h2 className="mt-1 text-lg font-extrabold text-etukas-black sm:text-xl">
                        Professionals &amp; Technicians
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-600">
                        Plumbers, painters, electricians, masons &amp; engineers serving{" "}
                        <strong className="text-gray-800">{locationCity}</strong>
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/technicians"
                    className="focus-ring inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 sm:self-auto"
                  >
                    View All Experts <ArrowRight size={14} />
                  </Link>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-etukas-black sm:text-base">
                    Browse by Trade ({TECHNICIAN_SERVICES.length})
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                    {TECHNICIAN_SERVICES.map((pro) => (
                      <ServiceTileCard
                        key={pro.slug}
                        item={pro}
                        href={`/technicians?category=${encodeURIComponent(pro.slug)}`}
                        fallbackImage={FALLBACK_TECHNICIAN_IMAGE}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-etukas-black sm:text-base">
                      Nearest Verified Experts Available Live
                    </h3>
                    <Link
                      to="/technicians"
                      className="text-xs font-bold text-etukas-red hover:underline"
                    >
                      All Technicians &rarr;
                    </Link>
                  </div>

                  {techniciansQuery.isLoading ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-32 rounded-2xl" />
                      ))}
                    </div>
                  ) : techniciansQuery.data?.length ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {techniciansQuery.data.slice(0, 6).map((tech) => (
                        <LiveTechnicianCard key={tech.id} tech={tech} />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/75 p-5 text-center">
                      <p className="text-xs font-bold text-gray-800">
                        Explore verified technicians or update your project location to see nearest availability.
                      </p>
                      <Link
                        to="/technicians"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Browse Technicians <ArrowRight size={13} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : isMachineryTab ? (
              /* ============== MODE 3: MACHINERY & VEHICLES ============== */
              <div className="space-y-7">
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-gradient-to-r from-[#c7c5c5]/45 via-stone-100 to-white p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white p-1.5 shadow-sm sm:h-16 sm:w-16">
                      <img
                        src="/images/machinery/jcb.webp"
                        alt="Machinery and Heavy Vehicles"
                        className="h-12 w-12 object-contain"
                        onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-etukas-black">
                        <Tractor size={10} /> Heavy Equipment
                      </span>
                      <h2 className="mt-1 text-lg font-extrabold text-etukas-black sm:text-xl">
                        Machinery &amp; Vehicles
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-600">
                        JCB excavators, borewell rigs, RMC trucks, concrete mixers, rollers &amp; cranes
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/products?category=construction-machinery"
                    className="focus-ring inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 sm:self-auto"
                  >
                    View All Machinery <ArrowRight size={14} />
                  </Link>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-etukas-black sm:text-base">
                    Book Machine Vehicles ({MACHINERY_SERVICES.length})
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                    {MACHINERY_SERVICES.map((machine) => (
                      <ServiceTileCard
                        key={machine.slug}
                        item={machine}
                        href={`/products?category=${encodeURIComponent(machine.slug)}`}
                        fallbackImage={FALLBACK_PRODUCT_IMAGE}
                      />
                    ))}
                  </div>
                </div>

                {categoryProducts.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-extrabold text-etukas-black sm:text-base">
                      Available Machinery Listings Near {locationCity}
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {categoryProducts.map((item) => (
                        <CategoryProductCard
                          key={item.id}
                          item={item}
                          wishlisted={wishlist.isWishlisted(item.id)}
                          onToggleWishlist={wishlist.toggle}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : activeMaterialCategory ? (
              /* ============== MODE 4: SELECTED BUILDING MATERIAL CATEGORY ============== */
              <div className="space-y-7">
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-etukas-red/15 bg-gradient-to-r from-etukas-pink/85 via-white to-orange-50/70 p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white bg-white p-1.5 shadow-sm sm:h-16 sm:w-16">
                      <CategoryThumbnail
                        category={activeMaterialCategory}
                        sizeClass="h-12 w-12 sm:h-14 sm:w-14"
                        iconSize={36}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-etukas-red">
                        Building Materials
                      </span>
                      <h2 className="mt-1 text-lg font-extrabold text-etukas-black sm:text-xl">
                        {activeMaterialCategory.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {categoryProductsQuery.isLoading
                          ? `Checking live yard stock near ${locationCity}...`
                          : `${categoryProducts.length} ${
                              categoryProducts.length === 1 ? "listing" : "listings"
                            } delivering to ${locationCity}`}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={
                      activeMaterialCategory.slug === "steel-iron-bars"
                        ? "/categories/tmt-steel"
                        : `/products?category=${encodeURIComponent(activeMaterialCategory.slug)}`
                    }
                    className="focus-ring inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 sm:self-auto"
                  >
                    {activeMaterialCategory.slug === "steel-iron-bars"
                      ? "TMT Brands & Order"
                      : "View All"}{" "}
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {activeMaterialCategory.slug === "steel-iron-bars" ? (
                  <div className="rounded-2xl border border-etukas-red/20 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-extrabold text-etukas-black">
                          TMT Steel Brands &amp; Multi-Size Ordering
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          Tap any Primary or Telangana/AP Regional mill to order 6mm–32mm bundles together
                        </p>
                      </div>
                      <Link
                        to="/guides/tmt-bars"
                        className="text-xs font-extrabold text-etukas-red hover:underline"
                      >
                        Steel Estimator &amp; Buyer Guide &rarr;
                      </Link>
                    </div>
                    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                      {TMT_MASTER_BRANDS.map((brand) => (
                        <Link
                          key={brand.slug}
                          to={`/categories/tmt-steel/${encodeURIComponent(brand.slug)}`}
                          className="shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-etukas-red hover:bg-etukas-pink/50"
                        >
                          <span className="block text-xs font-extrabold text-etukas-black">
                            {brand.name}
                          </span>
                          <span className="block text-[10px] font-bold text-etukas-red">
                            ₹{brand.base_rate_per_ton_inr.toLocaleString("en-IN")}/T
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeMaterialCategory.children && activeMaterialCategory.children.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-extrabold text-etukas-black sm:text-base">
                      Explore {activeMaterialCategory.name}
                    </h3>
                    <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                      {activeMaterialCategory.children.map((child) => (
                        <Link
                          key={child.id}
                          to={`/products?category=${encodeURIComponent(child.slug)}`}
                          className="group flex flex-col items-center rounded-2xl border border-gray-200/80 bg-white p-2.5 text-center shadow-xs transition hover:border-etukas-red/40 hover:shadow-md"
                        >
                          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gray-50 p-1.5">
                            <CategoryThumbnail
                              category={child}
                              sizeClass="h-11 w-11"
                              iconSize={30}
                            />
                          </div>
                          <span className="mt-2 line-clamp-2 text-[11px] font-bold leading-tight text-gray-900 group-hover:text-etukas-red sm:text-xs">
                            {child.name}
                          </span>
                          {typeof child.productCount === "number" && child.productCount > 0 ? (
                            <span className="mt-0.5 text-[10px] text-gray-400">
                              {child.productCount} items
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {availableBrands.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-extrabold text-etukas-black sm:text-base">
                      Shop by Brand
                    </h3>
                    <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-1">
                      {availableBrands.map((brand) => (
                        <Link
                          key={brand}
                          to={`/products?category=${encodeURIComponent(activeMaterialCategory.slug)}&brand=${encodeURIComponent(brand)}`}
                          className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-800 shadow-xs transition hover:border-etukas-red hover:bg-etukas-pink hover:text-etukas-red"
                        >
                          {brand}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-etukas-black sm:text-base">
                      Top {activeMaterialCategory.name}
                    </h3>
                    <Link
                      to={`/products?category=${encodeURIComponent(activeMaterialCategory.slug)}`}
                      className="text-xs font-bold text-etukas-red hover:underline"
                    >
                      See all &rarr;
                    </Link>
                  </div>

                  {categoryProductsQuery.isLoading ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-gray-100 bg-white p-2.5"
                        >
                          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                          <Skeleton className="mt-2.5 h-3.5 w-4/5" />
                          <Skeleton className="mt-1.5 h-3 w-1/2" />
                          <Skeleton className="mt-3 h-4 w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : categoryProductsQuery.isError ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-etukas-pink/60 p-4">
                      <p className="text-xs font-bold text-etukas-red">
                        Could not load products for {activeMaterialCategory.name}.
                      </p>
                      <button
                        type="button"
                        onClick={() => void categoryProductsQuery.refetch()}
                        className="inline-flex items-center gap-1 rounded-lg bg-etukas-red px-3 py-1.5 text-xs font-bold text-white"
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                    </div>
                  ) : categoryProducts.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {categoryProducts.map((item) => (
                        <CategoryProductCard
                          key={item.id}
                          item={item}
                          wishlisted={wishlist.isWishlisted(item.id)}
                          onToggleWishlist={wishlist.toggle}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <LocationEmptyProducts
                        categoryName={activeMaterialCategory.name}
                        cityLabel={locationCity}
                        onResetCategory={() => selectTab("for-you")}
                      />
                    </div>
                  )}
                </div>

                {categoryStores.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-etukas-black sm:text-base">
                        Verified Stores Supplying {activeMaterialCategory.name}
                      </h3>
                      <Link
                        to="/stores"
                        className="text-xs font-bold text-etukas-red hover:underline"
                      >
                        All Stores &rarr;
                      </Link>
                    </div>
                    <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
                      {categoryStores.map((store) => (
                        <StoreMiniCard key={store.id} store={store} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              /* ============== MODE 5: "FOR YOU" OVERVIEW ============== */
              <div className="space-y-8">
                {/* 1. Building Materials (Exact Homepage Side-Scroll Order) */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-extrabold text-etukas-black sm:text-lg">
                        Building Materials
                      </h2>
                      <p className="text-[11px] text-gray-500 sm:text-xs">
                        Ordered by essential site supplies — tap any material to explore
                      </p>
                    </div>
                    <Link
                      to="/products"
                      className="shrink-0 text-xs font-bold text-etukas-red hover:underline"
                    >
                      All Products &rarr;
                    </Link>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:gap-3 lg:grid-cols-5">
                    {materialCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => selectTab(category.slug)}
                        className="focus-ring group flex flex-col items-center rounded-2xl border border-gray-200/80 bg-white p-2.5 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-etukas-red/40 hover:shadow-md sm:p-3"
                      >
                        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-gray-50 to-stone-100/80 p-1.5 transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
                          <CategoryThumbnail
                            category={category}
                            sizeClass="h-12 w-12 sm:h-14 sm:w-14"
                            iconSize={34}
                          />
                        </div>
                        <span className="mt-2 line-clamp-2 text-[11px] font-extrabold leading-tight text-gray-900 transition-colors group-hover:text-etukas-red sm:text-xs">
                          {category.name}
                        </span>
                        {typeof category.productCount === "number" && category.productCount > 0 ? (
                          <span className="mt-1 rounded-full bg-etukas-pink px-2 py-0.5 text-[9px] font-bold text-etukas-red">
                            {category.productCount}{" "}
                            {category.productCount === 1 ? "item" : "items"}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Professionals & Technicians */}
                <div className="rounded-2xl bg-[#faa6a5]/25 p-3.5 ring-1 ring-[#faa6a5]/60 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-extrabold text-etukas-black sm:text-lg">
                        Professionals &amp; Technicians
                      </h2>
                      <p className="text-[11px] text-gray-600 sm:text-xs">
                        Hire verified local trades &amp; engineers near {locationCity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectTab(TECHNICIANS_TAB_SLUG)}
                      className="shrink-0 text-xs font-bold text-etukas-red hover:underline"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {TECHNICIAN_SERVICES.map((pro) => (
                      <ServiceTileCard
                        key={pro.slug}
                        item={pro}
                        href={`/technicians?category=${encodeURIComponent(pro.slug)}`}
                        fallbackImage={FALLBACK_TECHNICIAN_IMAGE}
                        compact
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Machinery & Vehicles */}
                <div className="rounded-2xl bg-[#c7c5c5]/30 p-3.5 ring-1 ring-gray-200 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-extrabold text-etukas-black sm:text-lg">
                        Machinery &amp; Vehicles
                      </h2>
                      <p className="text-[11px] text-gray-600 sm:text-xs">
                        Book heavy construction equipment &amp; site vehicles
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectTab(MACHINERY_TAB_SLUG)}
                      className="shrink-0 text-xs font-bold text-etukas-red hover:underline"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {MACHINERY_SERVICES.map((machine) => (
                      <ServiceTileCard
                        key={machine.slug}
                        item={machine}
                        href={`/products?category=${encodeURIComponent(machine.slug)}`}
                        fallbackImage={FALLBACK_PRODUCT_IMAGE}
                        compact
                      />
                    ))}
                  </div>
                </div>

                {/* 4. Recently Viewed (shown only when user has browsing history) */}
                {recentlyViewed.items.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-extrabold text-etukas-black sm:text-lg">
                        Recently Viewed
                      </h2>
                      <Link
                        to="/account"
                        className="text-xs font-bold text-etukas-red hover:underline"
                      >
                        History &rarr;
                      </Link>
                    </div>
                    <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1">
                      {recentlyViewed.items.slice(0, 8).map((item) => (
                        <Link
                          key={item.id}
                          to={item.href}
                          className="group flex w-32 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-200/85 bg-white p-2 shadow-xs transition hover:border-etukas-red/40 hover:shadow-md sm:w-36"
                        >
                          <img
                            src={item.imageUrl || FALLBACK_PRODUCT_IMAGE}
                            alt={item.title}
                            className="h-20 w-full rounded-xl bg-gray-50 object-cover"
                            loading="lazy"
                            onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                          />
                          <span className="mt-1.5 line-clamp-2 text-[11px] font-bold leading-tight text-gray-900 group-hover:text-etukas-red">
                            {item.title}
                          </span>
                          {typeof item.priceMinor === "number" ? (
                            <span className="mt-1 text-[11px] font-extrabold text-etukas-black">
                              {formatMoney(item.priceMinor)}
                              {item.unit ? (
                                <span className="font-normal text-gray-500">
                                  /{item.unit}
                                </span>
                              ) : null}
                            </span>
                          ) : item.subtitle ? (
                            <span className="mt-1 truncate text-[10px] text-gray-500">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* 5. Popular Verified Stores Near You */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-extrabold text-etukas-black sm:text-lg">
                        Popular Verified Stores Near You
                      </h2>
                      <p className="text-[11px] text-gray-500 sm:text-xs">
                        Trusted building material yards serving {locationCity}
                      </p>
                    </div>
                    <Link
                      to="/stores"
                      className="shrink-0 text-xs font-bold text-etukas-red hover:underline"
                    >
                      View All &rarr;
                    </Link>
                  </div>

                  {storesQuery.isLoading ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-20 rounded-2xl" />
                      ))}
                    </div>
                  ) : storesQuery.data?.length ? (
                    <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
                      {storesQuery.data.slice(0, 6).map((store) => (
                        <StoreMiniCard key={store.id} store={store} />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-4 text-center">
                      <p className="text-xs font-bold text-gray-800">
                        No verified stores found near {locationCity}.
                      </p>
                      <Link
                        to="/location"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-etukas-red hover:underline"
                      >
                        <MapPin size={12} /> Update delivery location
                      </Link>
                    </div>
                  )}
                </div>

                {/* 6. New & Trending Materials */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-extrabold text-etukas-black sm:text-lg">
                        New &amp; Trending Materials
                      </h2>
                      <p className="text-[11px] text-gray-500 sm:text-xs">
                        Live supplier pricing &amp; fresh inventory for {locationCity}
                      </p>
                    </div>
                    <Link
                      to="/products"
                      className="shrink-0 text-xs font-bold text-etukas-red hover:underline"
                    >
                      Explore All &rarr;
                    </Link>
                  </div>

                  {forYouProductsQuery.isLoading ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-gray-100 bg-white p-2.5"
                        >
                          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                          <Skeleton className="mt-2.5 h-3.5 w-4/5" />
                          <Skeleton className="mt-1.5 h-3 w-1/2" />
                          <Skeleton className="mt-3 h-4 w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : forYouProductsQuery.isError ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-etukas-pink/60 p-4">
                      <p className="text-xs font-bold text-etukas-red">
                        Unable to load nearby materials right now.
                      </p>
                      <button
                        type="button"
                        onClick={() => void forYouProductsQuery.refetch()}
                        className="inline-flex items-center gap-1 rounded-lg bg-etukas-red px-3 py-1.5 text-xs font-bold text-white"
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                    </div>
                  ) : forYouProductsQuery.data?.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {forYouProductsQuery.data.slice(0, 8).map((item) => (
                        <CategoryProductCard
                          key={item.id}
                          item={item}
                          wishlisted={wishlist.isWishlisted(item.id)}
                          onToggleWishlist={wishlist.toggle}
                          showNewBadgeWhenNoDiscount
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <LocationEmptyProducts cityLabel={locationCity} />
                    </div>
                  )}
                </div>

                {/* 7. Quick Hub Links */}
                <div>
                  <h2 className="text-base font-extrabold text-etukas-black sm:text-lg">
                    More on Etukas
                  </h2>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                    <Link
                      to="/stores"
                      className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs transition hover:border-etukas-red/40 hover:shadow-md"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-etukas-pink text-etukas-red">
                        <StoreIcon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-900 group-hover:text-etukas-red sm:text-sm">
                          Verified Stores
                        </p>
                        <p className="truncate text-[11px] text-gray-500">
                          Nearby depots &amp; dealers
                        </p>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-gray-400 group-hover:text-etukas-red" />
                    </Link>

                    <Link
                      to="/technicians"
                      className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs transition hover:border-etukas-red/40 hover:shadow-md"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                        <Wrench size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-900 group-hover:text-etukas-red sm:text-sm">
                          Book Technicians
                        </p>
                        <p className="truncate text-[11px] text-gray-500">
                          Masons, plumbers &amp; electricians
                        </p>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-gray-400 group-hover:text-etukas-red" />
                    </Link>

                    <Link
                      to="/products"
                      className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs transition hover:border-etukas-red/40 hover:shadow-md"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-etukas-green">
                        <Building2 size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-900 group-hover:text-etukas-red sm:text-sm">
                          All Products
                        </p>
                        <p className="truncate text-[11px] text-gray-500">
                          Full building catalog
                        </p>
                      </div>
                      <ArrowRight size={15} className="shrink-0 text-gray-400 group-hover:text-etukas-red" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
