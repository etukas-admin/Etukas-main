import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Lock,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  Store
} from "lucide-react";
import { isVehicleTrackingEnabledStatus } from "@etukas/shared";
import { queryKeys } from "../../../lib/queryKeys";
import { formatMoney } from "../../../lib/utils";
import { marketplaceApi, type OrderRecord } from "../../../services/api";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../../utils/imageFallback";
import { CancelOrderModal } from "../../checkout/CancelOrderModal";
import {
  DeliveryStepsTracker,
  canCustomerCancelOrder,
  formatDeliveryStatusLabel,
  getDeliveryStatusBadgeClass,
  isOrderTrackingTerminal
} from "../../checkout/DeliveryStepsTracker";
import { AccountSubPageHeader } from "../components/AccountSubPageHeader";
import { OrderReviewModal } from "../components/OrderReviewModal";

export function OrderDetailsPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const location = useLocation();
  const initialOrder = (location.state as { initialOrder?: OrderRecord } | null)?.initialOrder;

  const [copiedId, setCopiedId] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<OrderRecord | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    order: OrderRecord;
    initialRating?: number;
  } | null>(null);

  const {
    data: order,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: ({ signal }) => marketplaceApi.getOrder(orderId, { signal }),
    enabled: Boolean(orderId),
    initialData:
      initialOrder && (initialOrder.id === orderId || initialOrder.orderNumber === orderId)
        ? initialOrder
        : undefined,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || isOrderTrackingTerminal(status)) return false;
      return 30_000;
    },
    refetchIntervalInBackground: false
  });

  const handleCopyOrderId = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.orderNumber || order.id).catch(() => undefined);
    setCopiedId(true);
    window.setTimeout(() => setCopiedId(false), 2000);
  };

  if (isLoading && !order) {
    return (
      <div className="min-h-screen bg-gray-50/70">
        <AccountSubPageHeader title="Order Details" backTo="/orders" />
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <Clock size={32} className="animate-spin text-etukas-red mb-3" />
          <p className="text-sm font-bold text-gray-700">Loading your order status & steps...</p>
        </div>
      </div>
    );
  }

  if ((error && !order) || !order) {
    return (
      <div className="min-h-screen bg-gray-50/70">
        <AccountSubPageHeader title="Order Details" backTo="/orders" />
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-etukas-red">
            <AlertCircle size={28} />
          </div>
          <h2 className="mt-4 text-xl font-black text-gray-900">Order Not Found</h2>
          <p className="mt-2 text-xs text-gray-500">
            We could not load Order #{orderId}. Please ensure you are signed into the account that placed this order.
          </p>
          <Link
            to="/orders"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-xs font-extrabold text-white shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to My Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  const displayOrderId = order.orderNumber || order.id;
  const trackMapUrl = `/track/${encodeURIComponent(displayOrderId)}`;
  const liveTrackEnabled = isVehicleTrackingEnabledStatus(order.status);
  const isTerminal = isOrderTrackingTerminal(order.status);

  return (
    <div className="min-h-screen bg-gray-50/70 pb-14">
      <AccountSubPageHeader
        title={`Order #${displayOrderId}`}
        backTo="/orders"
        rightSlot={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-etukas-red/40 hover:text-etukas-red"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin text-etukas-red" : ""} />
            <span className="hidden sm:inline">{isFetching ? "Refreshing" : "Refresh"}</span>
          </button>
        }
      />

      <main className="mx-auto max-w-3xl space-y-5 px-3 py-5 sm:px-6 sm:py-7">
        {/* ─── Top Order Overview Card ─── */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base sm:text-lg font-black text-gray-900">
                  #{displayOrderId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                  title="Copy Order ID"
                >
                  {copiedId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${getDeliveryStatusBadgeClass(
                    order.status
                  )}`}
                >
                  {formatDeliveryStatusLabel(order.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Placed on{" "}
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}{" "}
                · Store: <strong className="text-gray-800">{order.storeName}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-lg font-black text-gray-900">{formatMoney(order.totalMinor)}</div>
              <div className="text-[11px] font-semibold text-gray-500">
                {order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod} ·{" "}
                <span
                  className={
                    order.paymentStatus === "PAID" ? "text-emerald-600 font-bold" : "text-amber-700 font-bold"
                  }
                >
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Prominent Vehicle Live Track Action Bar (Enabled once Delivery Partner is assigned) */}
          {liveTrackEnabled ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-white p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Navigation size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs sm:text-sm font-black text-emerald-950">
                      Vehicle Tracking Enabled
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    {order.vehicleNumber
                      ? `Delivery partner assigned — track lorry ${order.vehicleNumber} live on the map with real-time ETA.`
                      : "Your delivery partner has been assigned — open the live map to track your vehicle."}
                  </p>
                </div>
              </div>

              <Link
                to={trackMapUrl}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-etukas-red px-4 py-2.5 text-xs sm:text-sm font-black text-white shadow-md hover:bg-red-700 active:scale-95 transition"
              >
                <Navigation size={15} />
                <span>Live Track Vehicle</span>
              </Link>
            </div>
          ) : !isTerminal ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50/90 p-3.5 text-xs text-gray-600">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-200/80 text-gray-500">
                  <Lock size={15} />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Vehicle Live Track Locked</p>
                  <p className="text-[11px] text-gray-500">
                    Live GPS map tracking unlocks automatically once a <strong>Delivery Partner</strong> is assigned.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2 text-xs font-bold text-gray-400 cursor-not-allowed"
              >
                <Navigation size={14} />
                <span>Live Track Vehicle</span>
              </button>
            </div>
          ) : null}
        </section>

        {/* ─── Full Order Delivery Process Steps Tracker ─── */}
        <DeliveryStepsTracker
          order={order}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
          onReviewOrder={() =>
            setReviewTarget({
              order,
              initialRating: order.review?.rating ?? 5
            })
          }
          onCancelOrder={
            canCustomerCancelOrder(order.status) ? () => setCancellingOrder(order) : undefined
          }
        />

        {/* ─── Ordered Materials & Price Breakdown ─── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-gray-900">
              <Package size={16} className="text-etukas-red" />
              <span>Ordered Materials</span>
            </h3>
            <span className="text-xs font-bold text-gray-500">
              {order.items.length} item{order.items.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {order.items.map((item, idx) => (
              <div key={item.id || idx} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-1">
                    <img
                      src={item.imageUrl || FALLBACK_PRODUCT_IMAGE}
                      alt={item.productName}
                      className="h-full w-full object-contain"
                      onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-xs sm:text-sm font-bold text-gray-900">
                      {item.productName}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Quantity:{" "}
                      <strong className="text-gray-900">
                        {item.quantity} {item.unit}
                        {item.quantity > 1 ? "s" : ""}
                      </strong>
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-gray-900">{formatMoney(item.totalMinor)}</p>
                  <p className="text-[10px] text-gray-400">
                    {formatMoney(item.priceMinor)}/{item.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Materials Subtotal</span>
              <span className="font-semibold text-gray-900">{formatMoney(order.subtotalMinor)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery & Transport</span>
              <span className="font-semibold text-gray-900">
                {order.deliveryChargeMinor > 0 ? formatMoney(order.deliveryChargeMinor) : "FREE"}
              </span>
            </div>
            {order.protectFeeMinor > 0 && (
              <div className="flex justify-between">
                <span>Site Inspection & Protect Fee</span>
                <span className="font-semibold text-gray-900">
                  {formatMoney(order.protectFeeMinor)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-sm font-black text-gray-900">
              <span>Total Amount</span>
              <span>{formatMoney(order.totalMinor)}</span>
            </div>
          </div>
        </section>

        {/* ─── Delivery Site & Store Details ─── */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-extrabold text-gray-900">
              <MapPin size={14} className="text-etukas-red" />
              <span>Delivery Site Address</span>
            </div>
            <p className="font-bold text-gray-800">{order.deliveryAddress?.contactName}</p>
            <p className="text-gray-600 leading-relaxed">
              {order.deliveryAddress?.line1}
              {order.deliveryAddress?.line2 ? `, ${order.deliveryAddress.line2}` : ""}
              {order.deliveryAddress?.city ? `, ${order.deliveryAddress.city}` : ""}
              {order.deliveryAddress?.state ? `, ${order.deliveryAddress.state}` : ""}
              {order.deliveryAddress?.postalCode ? ` - ${order.deliveryAddress.postalCode}` : ""}
            </p>
            {order.deliveryAddress?.mobile && (
              <p className="flex items-center gap-1 font-mono text-gray-700 pt-0.5">
                <Phone size={12} className="text-gray-400" />
                <span>{order.deliveryAddress.mobile}</span>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-extrabold text-gray-900">
              <Store size={14} className="text-etukas-red" />
              <span>Fulfilling Store Partner</span>
            </div>
            <p className="font-bold text-gray-800">{order.storeName}</p>
            {order.sellerPhone && (
              <a
                href={`tel:${order.sellerPhone}`}
                className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-700 hover:underline"
              >
                <Phone size={12} />
                <span>{order.sellerPhone}</span>
              </a>
            )}
            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 font-bold text-etukas-red hover:underline"
              >
                <ShoppingBag size={12} />
                <span>Order More Building Materials</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <CancelOrderModal
        order={cancellingOrder}
        onClose={() => setCancellingOrder(null)}
        onCancelled={() => void refetch()}
      />

      <OrderReviewModal
        order={reviewTarget?.order ?? null}
        initialRating={reviewTarget?.initialRating}
        onClose={() => setReviewTarget(null)}
      />
    </div>
  );
}
