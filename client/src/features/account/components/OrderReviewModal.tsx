import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Edit3, Package, Star, Truck, X } from "lucide-react";
import { queryKeys } from "../../../lib/queryKeys";
import { marketplaceApi, type OrderRecord } from "../../../services/api";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../../utils/imageFallback";
import { formatDeliveryStatusLabel } from "../../checkout/DeliveryStepsTracker";

type LatestOrderReviewSectionProps = {
  orders: OrderRecord[];
  isLoading: boolean;
  onRateOrder: (order: OrderRecord, initialRating?: number) => void;
};

function getRatingWord(rating: number): string {
  if (rating >= 5) return "Great";
  if (rating === 4) return "Very Good";
  if (rating === 3) return "Good";
  if (rating === 2) return "Fair";
  return "Poor";
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

export function LatestOrderReviewSection({
  orders,
  isLoading,
  onRateOrder
}: LatestOrderReviewSectionProps) {
  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED");
  const latestDelivered = deliveredOrders[0] ?? null;
  const latestAnyOrder = orders[0] ?? null;

  const targetOrder = latestDelivered ?? latestAnyOrder;
  const firstItem = targetOrder?.items?.[0];
  const itemImage = firstItem?.imageUrl || FALLBACK_PRODUCT_IMAGE;
  const itemTitle =
    firstItem?.productName ||
    (targetOrder ? `Order #${targetOrder.orderNumber || targetOrder.id}` : "");
  const extraItemsCount = targetOrder?.items ? Math.max(0, targetOrder.items.length - 1) : 0;

  return (
    <section aria-labelledby="ratings-reviews-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="ratings-reviews-heading" className="text-[17px] font-extrabold tracking-tight text-etukas-black">
          Ratings &amp; Reviews
        </h2>
        <Link
          to="/account/reviews"
          className="text-sm font-bold text-etukas-red transition hover:underline"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3.5">
            <div className="h-16 w-16 rounded-xl bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-100" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
              <div className="h-4 w-1/3 rounded bg-gray-100" />
            </div>
          </div>
          <div className="mt-4 h-10 w-full rounded-xl bg-gray-100" />
        </div>
      ) : latestDelivered ? (
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <Link
              to="/account/reviews"
              className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-1.5"
            >
              <img
                src={itemImage}
                alt={itemTitle}
                className="h-full w-full object-contain"
                onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
              />
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                to="/account/reviews"
                className="block truncate text-sm font-bold text-etukas-black hover:text-etukas-red"
              >
                {itemTitle}
                {extraItemsCount > 0 ? (
                  <span className="ml-1 font-medium text-gray-500">+{extraItemsCount} more</span>
                ) : null}
              </Link>
              <p className="mt-0.5 text-xs text-gray-500">
                Delivered on {formatDate(latestDelivered.updatedAt || latestDelivered.createdAt)}
              </p>

              {/* Stars row matching Flipkart card */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {latestDelivered.review ? (
                  <span className="text-xs font-extrabold text-etukas-black">
                    {getRatingWord(latestDelivered.review.rating)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-gray-500">Rate order</span>
                )}

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = latestDelivered.review
                      ? star <= latestDelivered.review.rating
                      : false;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => onRateOrder(latestDelivered, star)}
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          size={18}
                          className={
                            filled
                              ? "fill-etukas-green text-etukas-green"
                              : "text-gray-300 hover:fill-etukas-red/30 hover:text-etukas-red"
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRateOrder(latestDelivered, latestDelivered.review?.rating ?? 5)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-etukas-red/40 bg-white px-4 py-2.5 text-sm font-bold text-etukas-red transition hover:border-etukas-red hover:bg-etukas-pink/50 active:scale-[0.99]"
          >
            {latestDelivered.review ? (
              <>
                <Edit3 size={16} />
                <span>Edit Review</span>
              </>
            ) : (
              <>
                <Star size={16} />
                <span>Write a Review</span>
              </>
            )}
          </button>
        </div>
      ) : targetOrder ? (
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-1.5">
              <img
                src={itemImage}
                alt={itemTitle}
                className="h-full w-full object-contain"
                onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-etukas-black">{itemTitle}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Status: <strong className="text-etukas-red">{formatDeliveryStatusLabel(targetOrder.status)}</strong>
              </p>
              <p className="mt-1.5 text-[11px] text-gray-500">
                You can rate and review this order once delivery is completed.
              </p>
            </div>
          </div>
          <Link
            to="/orders"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-etukas-red/40 bg-white px-4 py-2.5 text-sm font-bold text-etukas-red transition hover:border-etukas-red hover:bg-etukas-pink/50"
          >
            <Truck size={16} />
            <span>Track Latest Order</span>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 text-center shadow-xs">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-etukas-pink text-etukas-red">
            <Package size={20} />
          </div>
          <p className="mt-2.5 text-sm font-bold text-etukas-black">No delivered orders to review yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Once your building materials are delivered, share your feedback right from here.
          </p>
          <Link
            to="/products"
            className="mt-3.5 inline-flex items-center justify-center rounded-xl border border-etukas-red/40 px-4 py-2 text-xs font-bold text-etukas-red transition hover:bg-etukas-pink/50"
          >
            Browse Building Materials
          </Link>
        </div>
      )}
    </section>
  );
}

type OrderReviewModalProps = {
  order: OrderRecord | null;
  initialRating?: number;
  onClose: () => void;
  onSubmitted?: (updatedOrder: OrderRecord) => void;
};

const QUICK_HIGHLIGHTS = [
  "Prompt Delivery",
  "Fresh Batch Materials",
  "Accurate Quantity",
  "Courteous Driver",
  "Competitive Wholesale Price",
  "Certified Quality"
];

export function OrderReviewModal({
  order,
  initialRating,
  onClose,
  onSubmitted
}: OrderReviewModalProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    setRating(initialRating ?? order.review?.rating ?? 5);
    setHoverRating(0);
    setComment(order.review?.comment ?? "");
    setError(null);
    setSuccessMsg(null);
  }, [order, initialRating]);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await marketplaceApi.submitOrderReview(order.id, {
        rating,
        comment: comment.trim() || undefined
      });
      setSuccessMsg("Review saved successfully! Thank you for helping the Etukas community.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.customer() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) });
      if (order.orderNumber) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.orderNumber) });
      }
      onSubmitted?.(res.order);
      window.setTimeout(() => {
        onClose();
      }, 1300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit review. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-etukas-pink text-etukas-red">
              <Star size={18} className="fill-etukas-red text-etukas-red" />
            </div>
            <div>
              <h3 className="text-base font-black text-etukas-black">
                {order.review ? "Edit Order Review" : "Rate & Review Order"}
              </h3>
              <p className="font-mono text-xs text-gray-500">
                #{order.orderNumber || order.id} • {order.storeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
          >
            <X size={16} />
          </button>
        </div>

        {successMsg ? (
          <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 size={36} className="mx-auto text-etukas-green" />
            <h4 className="text-base font-extrabold text-emerald-950">Feedback Recorded!</h4>
            <p className="text-xs text-emerald-800">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ordered Items Summary */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
              <span className="mb-1 block font-bold text-etukas-black">Delivered Materials:</span>
              <div className="space-y-0.5 text-[11px] text-gray-600">
                {order.items?.map((item, idx) => (
                  <div key={item.id || idx} className="truncate">
                    • {item.quantity} {item.unit} · {item.productName}
                  </div>
                ))}
              </div>
            </div>

            {/* 5-Star Interactive Selector */}
            <div className="space-y-2 py-2 text-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                How would you rate your order &amp; delivery?
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`Rate ${star} stars`}
                      className="rounded-xl p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        size={32}
                        className={`transition-colors ${
                          isFilled
                            ? "fill-etukas-green text-etukas-green drop-shadow-xs"
                            : "text-gray-200 hover:text-emerald-200"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-black text-etukas-black">
                {rating === 5 && "Excellent (5/5) — Superior Quality & Timely Delivery"}
                {rating === 4 && "Very Good (4/5) — Satisfied with materials"}
                {rating === 3 && "Good (3/5) — Average Experience"}
                {rating === 2 && "Fair (2/5) — Minor Issues"}
                {rating === 1 && "Poor (1/5) — Dissatisfied"}
              </div>
            </div>

            {/* Quick Highlight Chips */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Quick Highlights
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_HIGHLIGHTS.map((tag) => {
                  const isIncluded = comment.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (isIncluded) return;
                        setComment((prev) => (prev ? `${prev}, ${tag}` : tag));
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                        isIncluded
                          ? "border-etukas-red bg-etukas-pink text-etukas-red"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:border-etukas-red/40 hover:bg-etukas-pink/50"
                      }`}
                    >
                      + {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Review */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                Your Detailed Review{" "}
                <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience about material quality, packaging, driver behavior, and timely delivery..."
                maxLength={1000}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-800 shadow-xs focus:border-etukas-red focus:outline-none focus:ring-2 focus:ring-etukas-pink"
              />
              <div className="mt-0.5 text-right text-[10px] text-gray-400">
                {comment.length}/1000 characters
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-etukas-red px-5 py-2 text-xs font-black text-white shadow-md shadow-red-500/20 transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
              >
                <Star size={13} className="fill-white" />
                <span>{isSubmitting ? "Submitting..." : "Submit Review"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
