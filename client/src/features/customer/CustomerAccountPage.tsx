import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  UserRound,
  Wrench,
  RefreshCw,
  Star,
  Edit3
} from "lucide-react";
import {
  DeliveryStepsTracker,
  formatDeliveryStatusLabel,
  getDeliveryStatusBadgeClass,
  isOrderTrackingTerminal
} from "../checkout/DeliveryStepsTracker";
import { queryKeys } from "../../lib/queryKeys";
import type { OrderRecord } from "../../services/api";
import { getStoredUser, marketplaceApi, type User } from "../../services/api";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../utils/imageFallback";

export function CustomerAccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [activeTab, setActiveTab] = useState<"orders" | "services" | "overview">("orders");
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // Review modal state
  const [reviewingOrder, setReviewingOrder] = useState<OrderRecord | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  const handleOpenReviewModal = (order: OrderRecord) => {
    setReviewingOrder(order);
    setReviewRating(order.review?.rating || 5);
    setReviewComment(order.review?.comment || "");
    setReviewError(null);
    setReviewSuccessMsg(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingOrder) return;
    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await marketplaceApi.submitOrderReview(reviewingOrder.id, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined
      });
      setReviewSuccessMsg("Review submitted successfully! Thank you for your feedback.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.customer() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(reviewingOrder.id) });
      if (reviewingOrder.orderNumber) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(reviewingOrder.orderNumber) });
      }
      if (trackingOrderId && (trackingOrderId === reviewingOrder.id || trackingOrderId === reviewingOrder.orderNumber)) {
        queryClient.setQueryData(queryKeys.orders.detail(trackingOrderId), res.order);
      }
      setTimeout(() => {
        setReviewingOrder(null);
        setReviewSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setReviewError(err?.message || "Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    window.addEventListener("etukas_auth_change", handleAuthChange);
    return () => window.removeEventListener("etukas_auth_change", handleAuthChange);
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
    refetchInterval: false,
    refetchOnWindowFocus: true
  });

  const cachedTrackingOrder = trackingOrderId
    ? customerOrders.find((o) => o.id === trackingOrderId || o.orderNumber === trackingOrderId)
    : undefined;

  const {
    data: liveTrackingOrder,
    isFetching: isRefreshingLive,
    refetch: refetchLiveTracking
  } = useQuery({
    queryKey: queryKeys.orders.detail(trackingOrderId || ""),
    queryFn: ({ signal }) => marketplaceApi.getOrder(trackingOrderId || "", { signal }),
    enabled: Boolean(currentUser && trackingOrderId),
    placeholderData: cachedTrackingOrder,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    // Vercel Free-friendly smart polling: only poll every 30s while modal is open & delivery is active
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || isOrderTrackingTerminal(status)) return false;
      return 30_000;
    },
    refetchIntervalInBackground: false
  });

  const trackingOrder: OrderRecord | null = trackingOrderId
    ? liveTrackingOrder ?? cachedTrackingOrder ?? null
    : null;

  const handleRefreshLiveTracking = async () => {
    if (!trackingOrderId) return;
    await Promise.all([refetchLiveTracking(), refetchOrders()]);
  };

  const { data: serviceBookings = [], isLoading: loadingServices } = useQuery({
    queryKey: ["customer-service-bookings"],
    queryFn: ({ signal }) => marketplaceApi.getCustomerServiceBookings({ signal }).catch(() => []),
    enabled: Boolean(currentUser) && activeTab === "services",
    staleTime: 30_000,
    refetchInterval: activeTab === "services" ? 30_000 : false,
    refetchIntervalInBackground: false
  });

  const handleLogout = async () => {
    await marketplaceApi.logout();
    navigate("/login");
  };

  if (!currentUser) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-etukas-red">
          <UserRound size={32} />
        </div>
        <h1 className="mt-4 text-2xl font-black text-gray-900 sm:text-3xl">
          Customer Account
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
          Sign in to your account to track orders, manage construction site delivery addresses, and view invoices.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/login"
            className="w-full sm:w-auto rounded-xl bg-etukas-red px-6 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:bg-red-700 transition-colors"
          >
            Sign in as Customer
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] bg-gray-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Profile Header Card */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-rose-500 font-black text-2xl text-white shadow-md shadow-red-500/20">
                {currentUser.name?.[0] || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-gray-900">
                    {currentUser.name}
                  </h1>
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-etukas-red">
                    Customer
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{currentUser.email}</p>
                {currentUser.mobile && (
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">📞 {currentUser.mobile}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ShoppingCart size={15} />
                <span>Shop Materials</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-red-50 hover:text-etukas-red hover:border-red-200 transition-colors"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex border-b border-gray-200 gap-2">
            {[
              { id: "orders", label: `Ordered Products (${customerOrders.length})`, icon: Package },
              { id: "services", label: `Booked Services (${serviceBookings.length})`, icon: Wrench },
              { id: "overview", label: "Account Info", icon: UserRound }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-all ${
                  activeTab === id
                    ? "border-etukas-red text-etukas-red"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: ORDERED PRODUCTS */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your Ordered Building Materials</h2>
                <p className="text-xs text-gray-500">Track shipments, view supplier stores, and download invoices</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void refetchOrders()}
                  disabled={isRefetchingOrders}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:border-etukas-red hover:text-etukas-red active:scale-95 transition"
                  title="Click to refresh latest order tracking"
                >
                  <RefreshCw size={13} className={isRefetchingOrders ? "animate-spin text-etukas-red" : ""} />
                  <span>{isRefetchingOrders ? "Refreshing..." : "Refresh Tracking"}</span>
                </button>
                <Link
                  to="/"
                  className="text-xs font-bold text-etukas-red hover:underline flex items-center gap-1"
                >
                  <span>Browse Products</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            {loadingOrders ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Loading your orders...
              </div>
            ) : isOrdersError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center">
                <AlertCircle className="mx-auto text-etukas-red" size={28} />
                <h3 className="mt-2 text-sm font-bold text-red-900">Could not load your orders</h3>
                <p className="mt-1 text-xs text-red-700">
                  {(ordersError as Error)?.message || "Please check your connection and try again."}
                </p>
                <button
                  type="button"
                  onClick={() => void refetchOrders()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700"
                >
                  <RefreshCw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-etukas-red">
                  <Package size={28} />
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900">No Orders Placed Yet</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Browse Cement, Steel, Bricks, Sand, Electricals, and other building materials directly from verified manufacturers.
                </p>
                <Link
                  to="/"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 transition"
                >
                  <ShoppingCart size={15} />
                  <span>Start Shopping</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {customerOrders.map((order: any) => {
                  const displayId = order.orderNumber || order.id;
                  const isDelivered = order.status === "DELIVERED";
                  return (
                    <div
                      key={order.id}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-orange-700 bg-orange-100/80 border border-orange-200 px-2 py-0.5 rounded">
                              #{displayId}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getDeliveryStatusBadgeClass(order.status)}`}>
                              {formatDeliveryStatusLabel(order.status)}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-gray-900">
                            ₹{((order.totalMinor || 0) / 100).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-gray-400">{order.storeName || order.store?.name || "Verified Store"}</div>
                        </div>
                      </div>

                      {/* Ordered Items List with Small Product Image */}
                      <div className="divide-y divide-gray-100">
                        {order.items?.map((item: any, i: number) => {
                          const itemImg = item.imageUrl || FALLBACK_PRODUCT_IMAGE;
                          const itemTotal = item.totalMinor || item.totalMinorSnapshot || (item.priceMinor * item.quantity) || 0;
                          return (
                            <div key={item.id || i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-200/80 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={itemImg}
                                    alt={item.productName}
                                    className="h-full w-full object-contain"
                                    onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-gray-800 block truncate">{item.productName}</span>
                                  <span className="text-gray-500 text-[11px]">Qty: {item.quantity} {item.unit || "units"}</span>
                                </div>
                              </div>
                              <div className="font-mono font-bold text-gray-800 text-xs sm:text-sm shrink-0">
                                ₹{(itemTotal / 100).toLocaleString("en-IN")}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Customer Review Card (if already reviewed) */}
                      {order.review && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={13}
                                  className={i < order.review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}
                                />
                              ))}
                              <span className="ml-1 text-[11px] font-black text-amber-950">
                                Your Rating: {order.review.rating} / 5.0
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenReviewModal(order)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 hover:underline"
                            >
                              <Edit3 size={11} />
                              <span>Edit Review</span>
                            </button>
                          </div>
                          {order.review.comment && (
                            <p className="text-gray-700 italic leading-relaxed">"{order.review.comment}"</p>
                          )}
                        </div>
                      )}

                      {/* Action Bar with Track Delivery and Review Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                        <div className="text-xs text-gray-500">
                          {order.vehicleNumber && (
                            <span className="font-medium mr-2">Vehicle: <strong className="text-gray-800">{order.vehicleNumber}</strong></span>
                          )}
                          {order.driverPhone && (
                            <a
                              href={`tel:${order.driverPhone}`}
                              className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                            >
                              <Phone size={12} /> Call Driver ({order.driverName || "Driver"})
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isDelivered && !order.review && (
                            <button
                              type="button"
                              onClick={() => handleOpenReviewModal(order)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100 hover:border-amber-400 active:scale-95 transition"
                            >
                              <Star size={13} className="fill-amber-400 text-amber-500" />
                              <span>Rate &amp; Review</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setTrackingOrderId(order.orderNumber || order.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition"
                          >
                            <Truck size={13} />
                            <span>Track Live Delivery</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOKED SERVICES */}
        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your Booked Technician Services</h2>
                <p className="text-xs text-gray-500">Service appointments booked with local plumbers, electricians, masons, and technicians</p>
              </div>
              <Link
                to="/technicians"
                className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
              >
                <span>Find Technicians</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {loadingServices ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Loading your service appointments...
              </div>
            ) : serviceBookings.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Wrench size={28} />
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900">No Services Booked Yet</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Need a Plumber, Electrician, Painter, Mason, or Structural Engineer for your site? Book trusted local professionals in seconds.
                </p>
                <Link
                  to="/technicians"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-700 transition"
                >
                  <Wrench size={15} />
                  <span>Book a Technician</span>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {serviceBookings.map((booking: any, idx: number) => {
                  const isCompleted = booking.status === "COMPLETED";
                  const reqId = booking.serviceRequestId || booking.bookingId || booking.id;
                  return (
                    <div
                      key={reqId || idx}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase">Service Request ID:</span>
                          <span className="font-mono text-xs font-black text-orange-700 bg-orange-100/80 border border-orange-200 px-2 py-0.5 rounded">
                            #{reqId}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isCompleted
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {booking.status || "CONFIRMED"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                            {booking.serviceCategory || "General Technician"}
                          </span>
                          <h4 className="mt-1 font-bold text-gray-900 text-sm">
                            {booking.technicianName || "Professional Technician"}
                          </h4>
                          {booking.technicianPhone && (
                            <a
                              href={`tel:${booking.technicianPhone}`}
                              className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-orange-600 hover:underline"
                            >
                              <Phone size={11} /> {booking.technicianPhone}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-2.5">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-gray-400" />
                          <span><strong>Date:</strong> {booking.bookingDate || "Today"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-gray-400" />
                          <span><strong>Slot:</strong> {booking.timeSlot || "Standard hours"}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2"><strong>Address:</strong> {booking.customerAddress || booking.address || "On-site"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-xs">
                        <div>
                          <span className="text-gray-500">Estimated Total: </span>
                          <strong className="text-gray-900">₹{Number(booking.estimatedTotal || 350).toLocaleString("en-IN")}</strong>
                        </div>
                        {booking.technicianPhone && (
                          <a
                            href={`tel:${booking.technicianPhone}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-orange-700 transition"
                          >
                            <Phone size={11} />
                            <span>Call Partner</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACCOUNT DETAILS */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div
                onClick={() => setActiveTab("orders")}
                className="cursor-pointer group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-red-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-etukas-red group-hover:scale-105 transition-transform">
                  <ShoppingBag size={20} />
                </div>
                <h3 className="mt-3 font-bold text-gray-900 text-sm">Material Orders</h3>
                <p className="mt-1 text-xs text-gray-500">{customerOrders.length} past orders</p>
              </div>

              <div
                onClick={() => setActiveTab("services")}
                className="cursor-pointer group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 group-hover:scale-105 transition-transform">
                  <Wrench size={20} />
                </div>
                <h3 className="mt-3 font-bold text-gray-900 text-sm">Booked Services</h3>
                <p className="mt-1 text-xs text-gray-500">{serviceBookings.length} appointments</p>
              </div>

              <Link
                to="/cart"
                className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                  <ShoppingCart size={20} />
                </div>
                <h3 className="mt-3 font-bold text-gray-900 text-sm">Active Cart</h3>
                <p className="mt-1 text-xs text-gray-500">Review materials in cart</p>
              </Link>
            </div>

            {/* Security & Support info */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                <ShieldCheck size={18} className="text-etukas-red" />
                Customer Protection & Order Support
              </h3>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                All building materials and technician services booked through Etukas are protected with certified quality assurance, on-time delivery guarantees, and direct operator assistance.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Live Order Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-900 text-base">
                  Track Order #{trackingOrder.orderNumber || trackingOrder.id}
                </h3>
                <p className="text-xs text-gray-500">Store: {trackingOrder.storeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setTrackingOrderId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <DeliveryStepsTracker
              order={trackingOrder}
              onRefresh={handleRefreshLiveTracking}
              isRefreshing={isRefreshingLive}
              onReviewOrder={() => handleOpenReviewModal(trackingOrder)}
            />

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setTrackingOrderId(null)}
                className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-black transition"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Review & Rating Submission Modal */}
      {reviewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Star size={18} className="fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">
                    Rate &amp; Review Order
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    #{reviewingOrder.orderNumber || reviewingOrder.id} • {reviewingOrder.storeName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setReviewingOrder(null); setReviewError(null); setReviewSuccessMsg(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {reviewSuccessMsg ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2">
                <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                <h4 className="font-extrabold text-emerald-950 text-base">Feedback Recorded!</h4>
                <p className="text-xs text-emerald-800">{reviewSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Ordered Items summary */}
                <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 text-xs text-gray-700">
                  <span className="font-bold text-gray-900 block mb-1">Delivered Materials:</span>
                  <div className="space-y-0.5 text-[11px] text-gray-600">
                    {reviewingOrder.items?.map((it, idx) => (
                      <div key={idx} className="truncate">
                        • {it.quantity} {it.unit}s · {it.productName}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5-Star Interactive Rating Selection */}
                <div className="text-center py-2 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                    How would you rate your order &amp; delivery?
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (reviewHoverRating || reviewRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setReviewHoverRating(star)}
                          onMouseLeave={() => setReviewHoverRating(0)}
                          className="p-1 rounded-xl transition-transform hover:scale-125 focus:outline-none"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star
                            size={32}
                            className={`transition-colors ${
                              isFilled
                                ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                : "text-gray-200 hover:text-amber-200"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs font-black text-amber-800">
                    {reviewRating === 5 && "★★★★★ Excellent (5/5) — Superior Quality & Timely Delivery"}
                    {reviewRating === 4 && "★★★★☆ Very Good (4/5) — Satisfied with materials"}
                    {reviewRating === 3 && "★★★☆☆ Good (3/5) — Average Experience"}
                    {reviewRating === 2 && "★★☆☆☆ Fair (2/5) — Minor Issues"}
                    {reviewRating === 1 && "★☆☆☆☆ Poor (1/5) — Dissatisfied"}
                  </div>
                </div>

                {/* Quick Feedback Chips */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Quick Highlights
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Prompt Delivery",
                      "Fresh Batch Materials",
                      "Accurate Quantity",
                      "Courteous Driver",
                      "Competitive Wholesale Price",
                      "Certified Test Certificate"
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (reviewComment.includes(tag)) return;
                          setReviewComment((prev) => (prev ? `${prev}, ${tag}` : tag));
                        }}
                        className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 transition active:scale-95"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detailed Review Textarea */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Your Detailed Review <span className="text-gray-400 font-normal normal-case">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell us about the material quality, packaging condition, driver behavior, and delivery timeliness..."
                    maxLength={1000}
                    className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-800 shadow-xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                  <div className="text-[10px] text-gray-400 text-right mt-0.5">
                    {reviewComment.length}/1000 characters
                  </div>
                </div>

                {reviewError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-medium">
                    {reviewError}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setReviewingOrder(null); setReviewError(null); }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-white shadow-md hover:bg-amber-600 active:scale-95 transition disabled:opacity-50"
                  >
                    <Star size={13} className="fill-white" />
                    <span>{isSubmittingReview ? "Submitting..." : "Submit Review"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
