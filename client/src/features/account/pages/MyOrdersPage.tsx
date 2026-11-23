import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  TicketPercent,
  Truck,
  Wrench,
  X,
  XCircle
} from "lucide-react";
import { queryKeys } from "../../../lib/queryKeys";
import { getStoredUser, marketplaceApi, type OrderRecord, type User } from "../../../services/api";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../../utils/imageFallback";
import { CancelOrderModal } from "../../checkout/CancelOrderModal";
import {
  canCustomerCancelOrder,
  canTrackVehicleLive,
  formatDeliveryStatusLabel,
  getDeliveryStatusBadgeClass
} from "../../checkout/DeliveryStepsTracker";
import { AccountSubPageHeader } from "../components/AccountSubPageHeader";
import { OrderReviewModal } from "../components/OrderReviewModal";

type OrderFilterChip = "all" | "active" | "delivered" | "cancelled" | "services";

const FILTER_CHIPS: { id: OrderFilterChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "On the way" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "services", label: "Services" }
];

const PROMO_SLIDES = [
  {
    badge: "ETUKAS WHOLESALE",
    title: "Save up to ₹1,500 on Bulk Material Orders",
    subtitle: "Use coupon ETUKAS10 or BULK500 on Cement, Steel & Bricks",
    cta: "View Coupons",
    href: "/account/coupons"
  },
  {
    badge: "LIVE SITE TRACKING",
    title: "Track Every Vehicle from Depot to Site",
    subtitle: "Verified local stores with direct driver calling & OTP delivery",
    cta: "Explore Stores",
    href: "/stores"
  }
];

function getRatingWord(rating: number): string {
  if (rating >= 5) return "Great";
  if (rating === 4) return "Very Good";
  if (rating === 3) return "Good";
  if (rating === 2) return "Fair";
  return "Poor";
}

function formatShortDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function getOrderHeadline(order: OrderRecord): string {
  if (order.status === "DELIVERED") {
    return `Delivered on ${formatShortDate(order.updatedAt || order.createdAt)}`;
  }
  if (order.status === "CANCELLED") {
    return `Cancelled on ${formatShortDate(order.cancelledAt || order.updatedAt || order.createdAt)}`;
  }
  if (order.status === "REJECTED") {
    return `Order Declined on ${formatShortDate(order.updatedAt || order.createdAt)}`;
  }
  return formatDeliveryStatusLabel(order.status);
}

export function MyOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const initialTab = searchParams.get("tab") === "services" ? "services" : "all";
  const [activeChip, setActiveChip] = useState<OrderFilterChip>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount_desc">("newest");
  const [activePromo, setActivePromo] = useState(0);

  // Modals state
  const [cancellingOrder, setCancellingOrder] = useState<OrderRecord | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ order: OrderRecord; initialRating?: number } | null>(null);

  const openOrderFullPage = (order: OrderRecord) => {
    const id = order.orderNumber || order.id;
    navigate(`/orders/${encodeURIComponent(id)}`, {
      state: { initialOrder: order }
    });
  };

  useEffect(() => {
    const handleAuthChange = () => setCurrentUser(getStoredUser());
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePromo((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  const {
    data: customerOrders = [],
    isLoading: loadingOrders,
    isFetching: isRefetchingOrders,
    isError: isOrdersError,
    error: ordersError,
    refetch: refetchOrders
  } = useQuery({
    queryKey: queryKeys.orders.customer(),
    queryFn: ({ signal }) => marketplaceApi.getCustomerOrders({ signal }),
    enabled: Boolean(currentUser),
    staleTime: 30_000,
    refetchOnWindowFocus: true
  });

  const { data: serviceBookings = [], isLoading: loadingServices } = useQuery({
    queryKey: ["customer-service-bookings"],
    queryFn: ({ signal }) => marketplaceApi.getCustomerServiceBookings({ signal }).catch(() => []),
    enabled: Boolean(currentUser) && activeChip === "services",
    staleTime: 30_000
  });

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = customerOrders.filter((order) => {
      if (activeChip === "delivered" && order.status !== "DELIVERED") return false;
      if (activeChip === "cancelled" && order.status !== "CANCELLED" && order.status !== "REJECTED") {
        return false;
      }
      if (
        activeChip === "active" &&
        (order.status === "DELIVERED" || order.status === "CANCELLED" || order.status === "REJECTED")
      ) {
        return false;
      }

      if (!q) return true;
      const inNumber = (order.orderNumber || order.id).toLowerCase().includes(q);
      const inStore = (order.storeName || "").toLowerCase().includes(q);
      const inItems = order.items?.some((it) => it.productName.toLowerCase().includes(q));
      return inNumber || inStore || inItems;
    });

    return [...list].sort((a, b) => {
      if (sortOrder === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === "amount_desc") {
        return (b.totalMinor || 0) - (a.totalMinor || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [customerOrders, activeChip, searchQuery, sortOrder]);

  const handleSelectChip = (chip: OrderFilterChip) => {
    setActiveChip(chip);
    if (chip === "services") {
      setSearchParams({ tab: "services" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white">
        <AccountSubPageHeader title="My Orders" backTo="/customer" />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-etukas-pink text-etukas-red">
            <Package size={28} />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-etukas-black">Sign in to view your orders</h2>
          <p className="mt-1.5 text-xs text-gray-500">
            Track live material deliveries, download details, and review past orders.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-etukas-red px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-red-500/20 hover:bg-red-700"
          >
            Sign In
          </Link>
        </main>
      </div>
    );
  }

  const promo = PROMO_SLIDES[activePromo];

  return (
    <div className="min-h-screen bg-gray-50/70 pb-12">
      <AccountSubPageHeader
        title="My Orders"
        backTo="/customer"
        rightSlot={
          <button
            type="button"
            onClick={() => void refetchOrders()}
            disabled={isRefetchingOrders}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-etukas-red/40 hover:text-etukas-red"
          >
            <RefreshCw size={13} className={isRefetchingOrders ? "animate-spin text-etukas-red" : ""} />
            <span className="hidden sm:inline">{isRefetchingOrders ? "Refreshing" : "Refresh"}</span>
          </button>
        }
      />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {/* Promo Banner Carousel (Flipkart My Orders style in Etukas colors) */}
        <section className="space-y-2">
          <Link
            to={promo.href}
            className="relative block overflow-hidden rounded-2xl bg-gradient-to-r from-[#8E1116] via-etukas-red to-[#E04338] p-4 text-white shadow-sm transition hover:shadow-md sm:p-5"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl"
            />
            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
              {promo.badge}
            </span>
            <h2 className="mt-2 text-base font-black leading-snug sm:text-lg">{promo.title}</h2>
            <p className="mt-0.5 text-xs text-red-50/90">{promo.subtitle}</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-etukas-red shadow-xs">
              <TicketPercent size={13} />
              <span>{promo.cta}</span>
              <ChevronRight size={13} />
            </span>
          </Link>

          <div className="flex justify-center gap-1.5">
            {PROMO_SLIDES.map((slide, idx) => (
              <button
                key={slide.badge}
                type="button"
                aria-label={`Banner ${idx + 1}`}
                onClick={() => setActivePromo(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activePromo === idx ? "w-6 bg-etukas-black" : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>
        </section>

        {/* Search Bar + Filters Button (Matching Screenshot 5) */}
        <div className="flex items-center gap-2.5">
          <label className="relative flex-1">
            <span className="sr-only">Search your order here</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your order here"
              className="h-11 w-full rounded-xl border border-gray-300/90 bg-white pl-10 pr-9 text-sm text-etukas-black placeholder:text-gray-400 focus:border-etukas-red focus:outline-none focus:ring-2 focus:ring-etukas-pink"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            ) : null}
          </label>

          <button
            type="button"
            onClick={() => setShowFiltersPanel((prev) => !prev)}
            className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-bold transition ${
              showFiltersPanel || sortOrder !== "newest"
                ? "border-etukas-red bg-etukas-pink text-etukas-red"
                : "border-gray-200 bg-white text-etukas-black hover:border-etukas-red/40"
            }`}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
          </button>
        </div>

        {/* Optional Sort / Filter Drawer */}
        {showFiltersPanel ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-xs">
            <span className="font-bold text-gray-600">Sort orders by:</span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["newest", "Newest First"],
                  ["oldest", "Oldest First"],
                  ["amount_desc", "Highest Amount"]
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortOrder(value)}
                  className={`rounded-lg px-3 py-1.5 font-bold transition ${
                    sortOrder === value
                      ? "bg-etukas-red text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-etukas-pink hover:text-etukas-red"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Filter Chips Row (Matching Screenshot 5: All, Active, Delivered, Cancelled, Services) */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeChip === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleSelectChip(chip.id)}
                className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition sm:text-sm ${
                  isActive
                    ? "border-etukas-black bg-etukas-black text-white shadow-xs"
                    : "border-gray-200 bg-white text-gray-700 hover:border-etukas-red/40 hover:text-etukas-red"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* SERVICES VIEW */}
        {activeChip === "services" ? (
          <section className="space-y-3">
            {loadingServices ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Loading your technician bookings...
              </div>
            ) : serviceBookings.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-etukas-pink text-etukas-red">
                  <Wrench size={24} />
                </div>
                <h3 className="mt-3 text-base font-extrabold text-etukas-black">No Technician Services Booked</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
                  Book trusted plumbers, electricians, masons, painters, and site engineers near you.
                </p>
                <Link
                  to="/technicians"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-red-700"
                >
                  <Wrench size={14} />
                  <span>Find Technicians</span>
                </Link>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {serviceBookings.map((booking: Record<string, unknown>, idx: number) => {
                  const reqId = String(booking.serviceRequestId || booking.bookingId || booking.id || idx);
                  const status = String(booking.status || "CONFIRMED");
                  const isCompleted = status === "COMPLETED";
                  const phone = booking.technicianPhone ? String(booking.technicianPhone) : "";
                  return (
                    <article
                      key={reqId}
                      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="rounded bg-etukas-pink px-2 py-0.5 font-mono text-xs font-black text-etukas-red">
                          #{reqId}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isCompleted
                              ? "bg-emerald-100 text-etukas-green"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <div>
                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700">
                          {String(booking.serviceCategory || "Technician Service")}
                        </span>
                        <h3 className="mt-1 text-sm font-extrabold text-etukas-black">
                          {String(booking.technicianName || "Certified Partner")}
                        </h3>
                      </div>

                      <div className="space-y-1.5 border-t border-gray-100 pt-2.5 text-xs text-gray-600">
                        <p className="flex items-center gap-2">
                          <Calendar size={13} className="text-gray-400" />
                          <span>{String(booking.bookingDate || "Scheduled")}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock size={13} className="text-gray-400" />
                          <span>{String(booking.timeSlot || "Standard slot")}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
                          <span className="line-clamp-2">
                            {String(booking.customerAddress || booking.address || "On-site")}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-xs">
                        <span className="font-extrabold text-etukas-black">
                          Est. ₹{Number(booking.estimatedTotal || 350).toLocaleString("en-IN")}
                        </span>
                        {phone ? (
                          <a
                            href={`tel:${phone}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-etukas-red px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700"
                          >
                            <Phone size={11} />
                            <span>Call Partner</span>
                          </a>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : loadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex gap-3.5">
                  <div className="h-16 w-16 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded bg-gray-100" />
                    <div className="h-3.5 w-3/4 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isOrdersError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center">
            <AlertCircle className="mx-auto text-etukas-red" size={28} />
            <h3 className="mt-2 text-sm font-extrabold text-red-900">Could not load your orders</h3>
            <p className="mt-1 text-xs text-red-700">
              {(ordersError as Error)?.message || "Please check your connection and try again."}
            </p>
            <button
              type="button"
              onClick={() => void refetchOrders()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-etukas-pink text-etukas-red">
              <Package size={28} />
            </div>
            <h3 className="mt-3 text-base font-extrabold text-etukas-black">
              {searchQuery ? "No matching orders found" : "No Orders Yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
              {searchQuery
                ? "Try searching with a different product name, store name, or order ID."
                : "Order Cement, Steel, Bricks, Sand, and finishing supplies directly from verified nearby stores."}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveChip("all");
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              ) : null}
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-red-700"
              >
                <ShoppingCart size={14} />
                <span>Start Shopping</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ORDER CARDS LIST (Matching Screenshot 5 Flipkart Order Card UX with Etukas Colors) */
          <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            {filteredOrders.map((order) => {
              const firstItem = order.items?.[0];
              const extraCount = Math.max(0, (order.items?.length ?? 1) - 1);
              const itemImg = firstItem?.imageUrl || FALLBACK_PRODUCT_IMAGE;
              const isDelivered = order.status === "DELIVERED";
              const isCancelled = order.status === "CANCELLED" || order.status === "REJECTED";
              const canCancel = canCustomerCancelOrder(order.status);

              return (
                <article key={order.id} className="p-4 transition hover:bg-gray-50/40 sm:p-5">
                  {/* Top Clickable Row: Thumbnail + Status Headline + Product Name + Chevron */}
                  <div
                    onClick={() => openOrderFullPage(order)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openOrderFullPage(order);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-3.5"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200/80 bg-gray-50 p-1.5">
                      <img
                        src={itemImg}
                        alt={firstItem?.productName || "Ordered material"}
                        className="h-full w-full object-contain"
                        onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-etukas-black sm:text-[15px]">
                          {getOrderHeadline(order)}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getDeliveryStatusBadgeClass(order.status)}`}
                        >
                          #{order.orderNumber || order.id.slice(0, 8)}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs font-medium text-gray-600 sm:text-sm">
                        {firstItem?.productName || "Building Material Order"}
                        {extraCount > 0 ? ` + ${extraCount} more item${extraCount > 1 ? "s" : ""}` : ""}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        <span className="font-bold text-etukas-black">
                          ₹{((order.totalMinor || 0) / 100).toLocaleString("en-IN")}
                        </span>
                        <span>•</span>
                        <span className="truncate">{order.storeName || "Verified Etukas Store"}</span>
                      </div>
                    </div>

                    <ChevronRight size={19} className="shrink-0 text-gray-400" />
                  </div>

                  {/* Cancelled Notice Pill (like Screenshot 5) */}
                  {isCancelled && (order.cancellationReason || order.rejectionReason) ? (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-100 bg-etukas-pink/60 px-3 py-2 text-xs text-red-900">
                      <CheckCircle2 size={14} className="shrink-0 text-etukas-red" />
                      <span className="truncate">
                        {order.cancellationReason || order.rejectionReason}
                      </span>
                    </div>
                  ) : null}

                  {/* Delivered Rate & Review Inline Strip (Matching Screenshot 5!) */}
                  {isDelivered ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-extrabold text-etukas-black">
                          {order.review ? getRatingWord(order.review.rating) : "Rate & Review"}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const filled = order.review ? star <= order.review.rating : false;
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewTarget({ order, initialRating: star })}
                                aria-label={`Rate ${star} stars`}
                                className="p-0.5 transition-transform hover:scale-110"
                              >
                                <Star
                                  size={18}
                                  className={
                                    filled
                                      ? "fill-etukas-green text-etukas-green"
                                      : "text-gray-300 hover:text-etukas-red"
                                  }
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setReviewTarget({ order, initialRating: order.review?.rating ?? 5 })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-etukas-red/40 bg-white px-3 py-1.5 text-xs font-bold text-etukas-red transition hover:border-etukas-red hover:bg-etukas-pink/50"
                      >
                        <Edit3 size={12} />
                        <span>{order.review ? "Edit review" : "Write review"}</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Active Order Quick Actions Bar */}
                  {!isDelivered && !isCancelled ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {order.driverPhone ? (
                          <a
                            href={`tel:${order.driverPhone}`}
                            className="inline-flex items-center gap-1 font-bold text-etukas-green hover:underline"
                          >
                            <Phone size={12} />
                            <span>Call Driver ({order.driverName || "Driver"})</span>
                          </a>
                        ) : (
                          <span>Tap to view live delivery updates</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {canCancel ? (
                          <button
                            type="button"
                            onClick={() => setCancellingOrder(order)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-etukas-red hover:bg-etukas-pink/60"
                          >
                            <XCircle size={13} />
                            <span>Cancel</span>
                          </button>
                        ) : null}

                        {canTrackVehicleLive(order.status) ? (
                          <Link
                            to={`/track/${encodeURIComponent(order.orderNumber || order.id)}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700"
                          >
                            <Navigation size={12} />
                            <span>Live Map</span>
                          </Link>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openOrderFullPage(order)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-red-700"
                        >
                          <Truck size={13} />
                          <span>Order Status</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <div className="pt-2 text-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-xs font-bold text-etukas-red hover:underline"
          >
            <span>Browse More Building Materials</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </main>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        order={cancellingOrder}
        onClose={() => setCancellingOrder(null)}
        onCancelled={() => {
          void refetchOrders();
        }}
      />

      {/* Order Review Modal */}
      <OrderReviewModal
        order={reviewTarget?.order ?? null}
        initialRating={reviewTarget?.initialRating}
        onClose={() => setReviewTarget(null)}
      />
    </div>
  );
}
