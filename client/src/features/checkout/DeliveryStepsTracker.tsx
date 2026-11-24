import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Truck, UserCheck, Phone, AlertCircle, RefreshCw, FileText, Star, XCircle, Info, Navigation } from "lucide-react";
import { isVehicleTrackingEnabledStatus } from "@etukas/shared";
import type { OrderRecord, DeliveryStatus } from "../../services/api";

export const TERMINAL_DELIVERY_STATUSES: ReadonlySet<string> = new Set([
  "DELIVERED",
  "REJECTED",
  "CANCELLED"
]);

export function isOrderTrackingTerminal(status?: string | null): boolean {
  return Boolean(status && TERMINAL_DELIVERY_STATUSES.has(status));
}

export function canCustomerCancelOrder(status?: string | null): boolean {
  return status === "PLACED" || status === "CONFIRMED";
}

export function canTrackVehicleLive(status?: string | null): boolean {
  return isVehicleTrackingEnabledStatus(status);
}

export function formatDeliveryStatusLabel(status?: string | null): string {
  switch (status) {
    case "PLACED":
      return "Order Placed";
    case "CONFIRMED":
    case "ACCEPTED":
      return "Confirmed by Seller";
    case "LOADING_VEHICLE":
    case "PREPARING":
      return "Loading on Vehicle";
    case "ASSIGNED_DRIVER":
    case "DISPATCHED":
      return "Assigned Delivery Partner";
    case "DELIVERED":
      return "Delivered";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status ? status.replace(/_/g, " ") : "Order Placed";
  }
}

export function getDeliveryStatusBadgeClass(status?: string | null): string {
  switch (status) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-800";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    case "ASSIGNED_DRIVER":
    case "DISPATCHED":
      return "bg-blue-100 text-blue-800";
    case "LOADING_VEHICLE":
    case "PREPARING":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

const STEPS: { status: DeliveryStatus; label: string; desc: string }[] = [
  { status: "PLACED", label: "Order Placed", desc: "Sent to store partner" },
  { status: "CONFIRMED", label: "Confirmed by Seller", desc: "Material verified & packed" },
  { status: "LOADING_VEHICLE", label: "Loading on Vehicle", desc: "Dispatched from warehouse" },
  { status: "ASSIGNED_DRIVER", label: "Assigned Delivery Partner", desc: "Out for site delivery" },
  { status: "DELIVERED", label: "Delivered", desc: "Site unloading complete" }
];

function getStepIndex(status: DeliveryStatus): number {
  switch (status) {
    case "PLACED":
      return 0;
    case "CONFIRMED":
      return 1;
    case "LOADING_VEHICLE":
      return 2;
    case "ASSIGNED_DRIVER":
      return 3;
    case "DELIVERED":
      return 4;
    case "REJECTED":
    case "CANCELLED":
      return -1;
    default:
      return 0;
  }
}

export function DeliveryStepsTracker({
  order,
  onRefresh,
  isRefreshing,
  onReviewOrder,
  onCancelOrder
}: {
  order: OrderRecord;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onReviewOrder?: () => void;
  onCancelOrder?: () => void;
}) {
  const isRejected = order.status === "REJECTED" || order.status === "CANCELLED";
  const isFullyDelivered = order.status === "DELIVERED";
  const isCancellable = canCustomerCancelOrder(order.status);
  const currentStepIdx = getStepIndex(order.status);

  if (isRejected) {
    const isCustomerCancelled = order.status === "CANCELLED" && order.cancelledBy === "Customer";
    const displayReason =
      order.cancellationReason ||
      order.rejectionReason ||
      (order.status === "CANCELLED"
        ? "Cancelled before vehicle loading"
        : "Store inventory or delivery route unavailable");

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-100 p-2 text-red-600">
              <AlertCircle size={22} />
            </div>
            <div>
              <h4 className="font-extrabold text-red-900 text-sm sm:text-base">
                {isCustomerCancelled
                  ? "Order Cancelled by Customer"
                  : order.status === "CANCELLED"
                  ? "Order Cancelled"
                  : "Order Rejected"}
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-red-800">
                Reason: <strong>{displayReason}</strong>
              </p>
              <p className="mt-1 text-xs text-red-600">
                {isCustomerCancelled
                  ? `The store partner (${order.storeName}) has been notified of this cancellation.`
                  : "Our customer care executive is reviewing alternatives. You will be contacted shortly."}
              </p>
            </div>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition active:scale-95 disabled:opacity-50"
              title="Refresh live tracking"
            >
              <RefreshCw size={12} className={isRefreshing ? "animate-spin text-etukas-red" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const latestPartnerNote =
    order.statusNote ||
    (order.statusHistory &&
      order.statusHistory
        .slice()
        .reverse()
        .find((h) => h.note && h.actor !== "Customer")?.note);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-4">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 sm:text-base">Live Delivery Status</h3>
          <p className="text-xs text-gray-500">
            Real-time status updates from {order.storeName}
            {!isFullyDelivered ? " · Auto-updates every 30s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-700 hover:border-etukas-red hover:bg-red-50 hover:text-etukas-red transition active:scale-95 disabled:opacity-50"
              title="Refresh live tracking"
            >
              <RefreshCw size={12} className={isRefreshing ? "animate-spin text-etukas-red" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${getDeliveryStatusBadgeClass(order.status)}`}>
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${isFullyDelivered ? "" : "animate-pulse"}`} />
            {formatDeliveryStatusLabel(order.status)}
          </span>
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
        {STEPS.map((step, idx) => {
          const isDone = isFullyDelivered ? true : currentStepIdx > idx;
          const isCurrent = isFullyDelivered ? false : currentStepIdx === idx;

          return (
            <div key={step.status} className="relative">
              {/* Stepper Dot */}
              <div
                className={`absolute -left-6 sm:-left-8 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? "bg-emerald-600 text-white shadow-xs"
                    : isCurrent
                    ? "bg-etukas-red text-white ring-4 ring-red-100 shadow-xs"
                    : "bg-gray-100 text-gray-400 border border-gray-300"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={14} />
                ) : isCurrent ? (
                  <Clock size={13} className="animate-spin" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className={`text-xs sm:text-sm font-extrabold ${
                    isDone || isCurrent ? "text-gray-900" : "text-gray-400"
                  }`}>
                    {step.label}
                  </h4>
                  {isCurrent && (
                    <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-etukas-red">
                      In Progress
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[11px] font-semibold text-emerald-600">
                      ✓ Done
                    </span>
                  )}
                </div>

                <p className={`mt-0.5 text-xs ${isDone || isCurrent ? "text-gray-600" : "text-gray-400"}`}>
                  {step.desc}
                </p>

                {/* Loading Vehicle Details (Step 3) */}
                {step.status === "LOADING_VEHICLE" && order.vehicleNumber && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-900">
                    <Truck size={14} className="text-purple-600" />
                    <span>Vehicle No: <strong className="font-mono text-purple-950">{order.vehicleNumber}</strong></span>
                  </div>
                )}

                {/* Assigned Driver Details, Live Track Vehicle & Direct Call Option (Step 4) */}
                {step.status === "ASSIGNED_DRIVER" &&
                  (order.driverName || order.driverPhone || canTrackVehicleLive(order.status)) && (
                  <div className="mt-2.5 rounded-xl bg-blue-50/80 border border-blue-200 p-3 max-w-md space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <UserCheck size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {order.driverName || "Delivery Driver"}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          Assigned Partner • {order.vehicleNumber || "Truck"}
                        </p>
                      </div>
                    </div>

                    {(canTrackVehicleLive(order.status) || order.driverPhone) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {canTrackVehicleLive(order.status) && (
                          <Link
                            to={`/track/${encodeURIComponent(order.orderNumber || order.id)}`}
                            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-etukas-red px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-red-700 active:scale-95 transition"
                          >
                            <Navigation size={13} />
                            <span>Live Track Vehicle</span>
                          </Link>
                        )}
                        {order.driverPhone && (
                          <a
                            href={`tel:${order.driverPhone}`}
                            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                          >
                            <Phone size={13} />
                            <span>Call Driver</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Cancellation Window Notice & Action (only before vehicle loading) */}
      {isCancellable && onCancelOrder && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-amber-950 font-semibold">
            <Info size={15} className="shrink-0 text-amber-600" />
            <span>You can cancel this order before loading the vehicle.</span>
          </div>
          <button
            type="button"
            onClick={onCancelOrder}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-extrabold text-red-700 hover:bg-red-50 hover:border-red-400 active:scale-95 transition"
          >
            <XCircle size={13} />
            <span>Cancel Order</span>
          </button>
        </div>
      )}

      {/* Live Status Note from Store Partner / Admin */}
      {latestPartnerNote && (
        <div className="mt-6 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50/90 to-amber-50/90 p-4 text-xs shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
              <FileText size={15} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-orange-950 uppercase tracking-wider text-[10px]">
                  Status Note from Store Partner / Admin:
                </span>
                <span className="rounded-full bg-orange-200/70 px-2 py-0.5 text-[9px] font-bold text-orange-800">
                  Live Dispatch Update
                </span>
              </div>
              <p className="text-orange-950 font-bold text-xs sm:text-sm leading-relaxed">
                "{latestPartnerNote}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Tracking Audit Log */}
      {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
        <details className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-2.5 text-xs">
          <summary className="cursor-pointer font-bold text-gray-700 select-none">
            Tracking Activity Log ({order.statusHistory.length})
          </summary>
          <ul className="mt-2.5 space-y-2 border-t border-gray-200/80 pt-2.5">
            {order.statusHistory
              .slice()
              .reverse()
              .map((entry, i) => (
                <li key={`${entry.timestamp}-${i}`} className="flex items-start justify-between gap-3 text-[11px]">
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900">{formatDeliveryStatusLabel(entry.status)}</span>
                    {entry.actor ? <span className="text-gray-400"> · {entry.actor}</span> : null}
                    {entry.note ? <p className="text-gray-600 mt-0.5">{entry.note}</p> : null}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-gray-400">
                    {new Date(entry.timestamp).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}

      {/* Customer Review Section when Order is Delivered */}
      {isFullyDelivered && (
        <div className="mt-6">
          {order.review ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-950">Your Rating: {order.review.rating} / 5.0</span>
                      <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] font-bold text-amber-900">
                        Verified Review
                      </span>
                    </div>
                    {order.review.comment && (
                      <p className="text-xs text-amber-900 font-medium mt-0.5 italic">
                        "{order.review.comment}"
                      </p>
                    )}
                  </div>
                </div>
                {onReviewOrder && (
                  <button
                    type="button"
                    onClick={onReviewOrder}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                  >
                    Edit Review
                  </button>
                )}
              </div>
            </div>
          ) : (
            onReviewOrder && (
              <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Star size={18} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">How was your delivery &amp; material quality?</h4>
                    <p className="text-[11px] text-amber-800">Rate your experience to help local builders &amp; stores</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onReviewOrder}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-black text-white shadow-xs hover:bg-amber-600 active:scale-95 transition"
                >
                  <Star size={13} className="fill-white" />
                  <span>Rate &amp; Review Order</span>
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
