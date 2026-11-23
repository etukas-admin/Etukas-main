import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Edit3, MessageSquareQuote, Package, Star } from "lucide-react";
import { queryKeys } from "../../../lib/queryKeys";
import { getStoredUser, marketplaceApi, type OrderRecord } from "../../../services/api";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../../utils/imageFallback";
import { AccountSubPageHeader } from "../components/AccountSubPageHeader";
import { OrderReviewModal } from "../components/OrderReviewModal";

type ReviewTab = "all" | "pending" | "published";

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
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

export function MyReviewsPage() {
  const currentUser = getStoredUser();
  const [activeTab, setActiveTab] = useState<ReviewTab>("all");
  const [reviewTarget, setReviewTarget] = useState<{ order: OrderRecord; initialRating?: number } | null>(null);

  const { data: customerOrders = [], isLoading } = useQuery({
    queryKey: queryKeys.orders.customer(),
    queryFn: ({ signal }) => marketplaceApi.getCustomerOrders({ signal }),
    enabled: Boolean(currentUser),
    staleTime: 30_000
  });

  const deliveredOrders = useMemo(
    () => customerOrders.filter((order) => order.status === "DELIVERED"),
    [customerOrders]
  );

  const pendingOrders = useMemo(
    () => deliveredOrders.filter((order) => !order.review),
    [deliveredOrders]
  );

  const reviewedOrders = useMemo(
    () => deliveredOrders.filter((order) => Boolean(order.review)),
    [deliveredOrders]
  );

  const averageRating = useMemo(() => {
    if (reviewedOrders.length === 0) return null;
    const sum = reviewedOrders.reduce((acc, o) => acc + (o.review?.rating ?? 0), 0);
    return (sum / reviewedOrders.length).toFixed(1);
  }, [reviewedOrders]);

  const displayedOrders =
    activeTab === "pending"
      ? pendingOrders
      : activeTab === "published"
      ? reviewedOrders
      : deliveredOrders;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white">
        <AccountSubPageHeader title="My Reviews" backTo="/customer" />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-etukas-pink text-etukas-red">
            <Star size={28} />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-etukas-black">Sign in to manage your reviews</h2>
          <p className="mt-1.5 text-xs text-gray-500">
            Rate delivered building materials and view your published feedback.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-etukas-red px-6 py-3 text-sm font-extrabold text-white shadow-md hover:bg-red-700"
          >
            Sign In
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-12">
      <AccountSubPageHeader
        title="My Reviews"
        subtitle={`${reviewedOrders.length} published • ${pendingOrders.length} pending`}
        backTo="/customer"
      />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {/* Summary Stats Bar */}
        <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 text-center shadow-xs">
            <p className="text-xl font-black text-etukas-black">{reviewedOrders.length}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-gray-500">Published</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 text-center shadow-xs">
            <p className="text-xl font-black text-etukas-red">{pendingOrders.length}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-gray-500">To Review</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 text-center shadow-xs">
            <p className="inline-flex items-center justify-center gap-1 text-xl font-black text-etukas-green">
              <span>{averageRating ?? "—"}</span>
              <Star size={16} className="fill-etukas-green text-etukas-green" />
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-gray-500">Avg. Rating</p>
          </div>
        </section>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["all", `All Delivered (${deliveredOrders.length})`],
              ["pending", `To Review (${pendingOrders.length})`],
              ["published", `Published (${reviewedOrders.length})`]
            ] as const
          ).map(([id, label]) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition sm:text-sm ${
                  active
                    ? "border-etukas-black bg-etukas-black text-white shadow-xs"
                    : "border-gray-200 bg-white text-gray-700 hover:border-etukas-red/40 hover:text-etukas-red"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Review Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex gap-3.5">
                  <div className="h-16 w-16 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-gray-100" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-etukas-pink text-etukas-red">
              {activeTab === "pending" ? <CheckCircle2 size={28} /> : <Package size={28} />}
            </div>
            <h3 className="mt-3 text-base font-extrabold text-etukas-black">
              {activeTab === "pending"
                ? "All caught up!"
                : activeTab === "published"
                ? "No reviews published yet"
                : "No delivered orders yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
              {activeTab === "pending"
                ? "You have reviewed all your delivered building material orders. Thank you!"
                : "Once your orders are delivered, you can rate material quality and delivery experience here."}
            </p>
            <Link
              to="/orders"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-etukas-red px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-red-700"
            >
              Go to My Orders
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayedOrders.map((order) => {
              const firstItem = order.items?.[0];
              const extraCount = Math.max(0, (order.items?.length ?? 1) - 1);
              const itemImg = firstItem?.imageUrl || FALLBACK_PRODUCT_IMAGE;

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-1.5">
                      <img
                        src={itemImg}
                        alt={firstItem?.productName || "Delivered order"}
                        className="h-full w-full object-contain"
                        onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-extrabold text-etukas-black">
                          {firstItem?.productName || `Order #${order.orderNumber || order.id}`}
                          {extraCount > 0 ? (
                            <span className="ml-1 font-medium text-gray-500">+{extraCount} more</span>
                          ) : null}
                        </h3>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-etukas-green">
                          Verified Purchase
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-gray-500">
                        {order.storeName} • Delivered on {formatDate(order.updatedAt || order.createdAt)}
                      </p>

                      {/* Interactive Star Bar */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {order.review ? (
                          <span className="text-xs font-extrabold text-etukas-black">
                            {getRatingWord(order.review.rating)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-500">Tap to rate</span>
                        )}

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
                                  size={19}
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
                    </div>
                  </div>

                  {/* Published Comment Block */}
                  {order.review?.comment ? (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
                      <MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-etukas-red" />
                      <p className="leading-relaxed">"{order.review.comment}"</p>
                    </div>
                  ) : null}

                  <div className="mt-3.5 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="font-mono text-[11px] text-gray-400">
                      Order #{order.orderNumber || order.id}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setReviewTarget({ order, initialRating: order.review?.rating ?? 5 })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-etukas-red/40 bg-white px-4 py-2 text-xs font-bold text-etukas-red transition hover:border-etukas-red hover:bg-etukas-pink/50"
                    >
                      {order.review ? (
                        <>
                          <Edit3 size={13} />
                          <span>Edit Review</span>
                        </>
                      ) : (
                        <>
                          <Star size={13} />
                          <span>Write Review</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <OrderReviewModal
        order={reviewTarget?.order ?? null}
        initialRating={reviewTarget?.initialRating}
        onClose={() => setReviewTarget(null)}
      />
    </div>
  );
}
