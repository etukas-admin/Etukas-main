import { useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { marketplaceApi, type OrderRecord } from "../../services/api";
import { queryKeys } from "../../lib/queryKeys";

const QUICK_CANCEL_REASONS = [
  "Ordered by mistake",
  "Need to change material quantity or brand",
  "Found a better price / nearby supplier",
  "Construction work schedule delayed",
  "Need to change delivery site address",
  "Other reason"
] as const;

export function CancelOrderModal({
  order,
  onClose,
  onCancelled
}: {
  order: OrderRecord | null;
  onClose: () => void;
  onCancelled?: (updatedOrder: OrderRecord) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!order) return null;

  const displayId = order.orderNumber || order.id;

  const handleSelectPreset = (preset: string) => {
    setSelectedPreset(preset);
    setError(null);
    if (preset === "Other reason") {
      setReason("");
    } else {
      setReason(preset);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError("Please provide a reason for cancelling this order (at least 5 characters).");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await marketplaceApi.cancelOrder(order.id, trimmed);
      setSuccessMsg(res.message || "Order cancelled successfully.");

      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.customer() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.seller() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.admin() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) });
      if (order.orderNumber) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.orderNumber) });
      }
      queryClient.setQueryData(queryKeys.orders.detail(displayId), res.order);
      onCancelled?.(res.order);

      setTimeout(() => {
        setSuccessMsg(null);
        setSelectedPreset("");
        setReason("");
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Could not cancel order. Please refresh and check the order status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-etukas-red">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">Cancel Order #{displayId}</h3>
              <p className="text-xs text-gray-500">
                Store: {order.storeName} · Allowed before vehicle loading
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            aria-label="Close cancel dialog"
          >
            <X size={16} />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
            <h4 className="text-base font-extrabold text-gray-900">Order Cancelled</h4>
            <p className="text-xs text-gray-600">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
              Your cancellation reason will be sent immediately to <strong>{order.storeName}</strong> so they stop preparing your dispatch.
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Select a reason *
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_CANCEL_REASONS.map((preset) => {
                  const isActive = selectedPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? "border-etukas-red bg-red-50 text-etukas-red font-bold ring-2 ring-red-100"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Cancellation Reason *
              </label>
              <textarea
                required
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                placeholder="Please tell the seller why you are cancelling this order..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-etukas-red focus:ring-2 focus:ring-red-100 resize-none"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                <span>Required (min 5 characters)</span>
                <span>{reason.length}/500</span>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Keep Order
              </button>
              <button
                type="submit"
                disabled={isSubmitting || reason.trim().length < 5}
                className="rounded-xl bg-etukas-red px-5 py-2 text-xs font-black text-white shadow-md hover:bg-red-700 active:scale-95 transition disabled:opacity-50"
              >
                {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
