import { CheckCircle2, Clock, Truck, UserCheck, PackageCheck, Phone, AlertCircle } from "lucide-react";
import type { OrderRecord, DeliveryStatus } from "../../services/api";

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

export function DeliveryStepsTracker({ order }: { order: OrderRecord }) {
  const isRejected = order.status === "REJECTED" || order.status === "CANCELLED";
  const currentStepIdx = getStepIndex(order.status);

  if (isRejected) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-100 p-2 text-red-600">
            <AlertCircle size={22} />
          </div>
          <div>
            <h4 className="font-extrabold text-red-900 text-sm sm:text-base">Order Rejected / Cancelled</h4>
            <p className="mt-1 text-xs sm:text-sm text-red-800">
              Reason: <strong>{order.rejectionReason || "Store inventory or delivery route unavailable"}</strong>
            </p>
            <p className="mt-1 text-xs text-red-600">
              Our customer care executive is reviewing alternatives. You will be contacted shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 sm:text-base">Live Delivery Status</h3>
          <p className="text-xs text-gray-500">Real-time status updates from {order.storeName}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
          order.status === "DELIVERED"
            ? "bg-emerald-100 text-emerald-800"
            : order.status === "ASSIGNED_DRIVER"
            ? "bg-blue-100 text-blue-800"
            : order.status === "LOADING_VEHICLE"
            ? "bg-purple-100 text-purple-800"
            : "bg-amber-100 text-amber-800"
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          {STEPS.find((s) => s.status === order.status)?.label || order.status}
        </span>
      </div>

      {/* Stepper Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
        {STEPS.map((step, idx) => {
          const isDone = currentStepIdx > idx;
          const isCurrent = currentStepIdx === idx;
          const isPending = currentStepIdx < idx;

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

                {/* Assigned Driver Details & Direct Call Option (Step 4) */}
                {step.status === "ASSIGNED_DRIVER" && (order.driverName || order.driverPhone) && (
                  <div className="mt-2.5 rounded-xl bg-blue-50/80 border border-blue-200 p-3 max-w-md">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                          <UserCheck size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {order.driverName || "Delivery Driver"}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Assigned Partner • {order.vehicleNumber || "Truck"}
                          </p>
                        </div>
                      </div>

                      {order.driverPhone && (
                        <a
                          href={`tel:${order.driverPhone}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                        >
                          <Phone size={13} />
                          <span>Call Driver</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

