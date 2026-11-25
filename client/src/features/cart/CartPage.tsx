/**
 * CartPage – Main shopping cart view for Etukas.
 *
 * Layout:
 *   Desktop: 68% cart items | 32% sticky order summary
 *   Mobile:  full-width stacked, compact sticky summary at bottom
 *
 * Features:
 *   • Seller-wise cart grouping
 *   • Product-category–specific quantity controls
 *   • Remove with confirmation
 *   • Clear cart with confirmation
 *   • Empty-cart illustration
 *   • Loading / error / unauthenticated states
 *   • Responsive & accessible
 */

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Package,
  ArrowRight,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { SellerGroupSection } from "./SellerGroup";
import { TmtCartBatchCard } from "./TmtCartBatchCard";
import { OrderSummary } from "./OrderSummary";
import { ConfirmDialog } from "./ConfirmDialog";
import { useCartQuery, useClearCart } from "./useCart";
import { enrichCartItems, groupByStore } from "./cartTypes";
import { useTmtCart } from "../tmt/tmtCartStore";
import { TMT_WEIGHBRIDGE_NOTE } from "../../types/tmt";
import { formatMoney } from "../../lib/utils";

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-etukas-pink">
          <ShoppingCart size={48} className="text-etukas-red opacity-70" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
          <Package size={18} className="text-orange-500" />
        </div>
      </div>

      <h2 className="text-2xl font-extrabold text-etukas-black">Your cart is empty</h2>
      <p className="mt-2 max-w-xs text-sm text-gray-500">
        Looks like you haven't added any building materials yet. Explore our product catalogue to get started.
      </p>

      <Link
        to="/products"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-etukas-red px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
      >
        <ShoppingBag size={16} />
        Start Shopping
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

// ─── Unauthenticated State ────────────────────────────────────────────────────

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-etukas-pink mb-6">
        <ShoppingBag size={40} className="text-etukas-red opacity-70" />
      </div>
      <h2 className="text-xl font-extrabold text-etukas-black">Sign in to view your cart</h2>
      <p className="mt-2 text-sm text-gray-500">
        Your cart items are saved when you're signed in.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-14 bg-orange-50/60 border-b border-gray-100" />
          <div className="p-4 space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="flex gap-4 rounded-2xl border border-gray-100 p-4">
                <div className="h-24 w-24 shrink-0 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-16 rounded bg-gray-100" />
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-9 w-32 rounded-lg bg-gray-100" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function CartError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-4">
        <ShoppingCart size={32} className="text-etukas-red opacity-60" />
      </div>
      <h2 className="text-lg font-bold text-etukas-black">Couldn't load your cart</h2>
      <p className="mt-1 text-sm text-gray-500">Something went wrong. Please try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        <RefreshCw size={15} />
        Try Again
      </button>
    </div>
  );
}

// ─── Mobile Sticky Summary Bar ────────────────────────────────────────────────

function MobileStickyBar({
  total,
  itemCount,
  onCheckout,
  disabled,
}: {
  total: number;
  itemCount: number;
  onCheckout: () => void;
  disabled: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-4 pb-safe pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
          <p className="text-lg font-extrabold text-etukas-black">{formatMoney(total)}</p>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          disabled={disabled}
          className="flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Checkout
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CartPage() {
  const cart = useCartQuery();
  const clearCart = useClearCart();
  const tmtCart = useTmtCart();
  const navigate = useNavigate();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Enrich + group cart items
  const enrichedItems = useMemo(
    () => (cart.data?.items ? enrichCartItems(cart.data.items) : []),
    [cart.data?.items]
  );
  const sellerGroups = useMemo(() => groupByStore(enrichedItems), [enrichedItems]);
  const dbTotalQty = useMemo(
    () => enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
    [enrichedItems]
  );

  const hasTmtBatches = tmtCart.batches.length > 0;
  const hasDbItems = Boolean(cart.data && cart.data.items.length > 0);
  const hasAnyItems = hasDbItems || hasTmtBatches;

  const combinedCartTotals = useMemo(() => {
    const dbTotals = cart.data?.totals ?? {
      subtotalMinor: 0,
      taxMinor: 0,
      discountMinor: 0,
      totalMinor: 0
    };
    const tmtMinor = tmtCart.summary.totalMinor;
    return {
      subtotalMinor: dbTotals.subtotalMinor + tmtMinor,
      taxMinor: dbTotals.taxMinor,
      discountMinor: dbTotals.discountMinor,
      totalMinor: dbTotals.totalMinor + tmtMinor
    };
  }, [cart.data?.totals, tmtCart.summary.totalMinor]);

  const combinedSummaryCart = useMemo(
    () => ({
      id: cart.data?.id ?? "tmt-local-cart",
      items: cart.data?.items ?? [],
      totals: combinedCartTotals
    }),
    [cart.data?.id, cart.data?.items, combinedCartTotals]
  );

  const combinedItemCount =
    (cart.data?.items.length ?? 0) + tmtCart.summary.totalLines;
  const combinedTotalQty = dbTotalQty + tmtCart.summary.totalBundles;

  const handleCheckout = () => {
    const tmtCheckoutItems = tmtCart.batches.flatMap((batch) =>
      batch.lines.map((line) => ({
        id: `${batch.id}__${line.label}`,
        storeProductId: batch.storeProductId,
        productName: `${batch.brandName} ${batch.grade} ${line.label} (${batch.rodLengthMeters}m)`,
        unit: "bundle",
        quantity: line.bundles,
        priceMinor: Math.round(line.pricePerBundleInr * 100),
        originalPriceMinor: Math.round(line.pricePerBundleInr * 100),
        imageUrl: batch.imageUrl,
        category: "Steel and iron bars",
        storeId: batch.storeId,
        storeName: batch.storeName
      }))
    );

    const dbCheckoutItems = enrichedItems.map((item) => ({
      id: item.id,
      storeProductId: item.storeProduct.id,
      productName: item.storeProduct.product.name,
      unit: item.storeProduct.product.unit || "piece",
      quantity: item.quantity,
      priceMinor: item.storeProduct.priceMinor,
      originalPriceMinor: Math.round(item.storeProduct.priceMinor * 1.3),
      imageUrl: item.storeProduct.product.images?.[0]?.url,
      category: item.storeProduct.product.category?.name || "Building Material",
      storeId: item.storeProduct.store.id,
      storeName: item.storeProduct.store.name
    }));

    navigate("/checkout", {
      state: {
        cartItems: [...tmtCheckoutItems, ...dbCheckoutItems],
        hasTmtItems: hasTmtBatches,
        initialNotes: hasTmtBatches ? TMT_WEIGHBRIDGE_NOTE : undefined
      }
    });
  };

  const handleClearCart = () => {
    const ids = cart.data?.items.map((i) => i.id) ?? [];
    tmtCart.clearAll();
    if (ids.length === 0) {
      setShowClearConfirm(false);
      return;
    }
    clearCart.mutate(ids, {
      onSuccess: () => setShowClearConfirm(false),
    });
  };

  // ─── Render states ──────────────────────────────────────────────────────────

  const isAuthError =
    cart.error &&
    (String(cart.error).includes("401") ||
      String(cart.error).includes("Unauthorized") ||
      String(cart.error).includes("AUTH") ||
      (cart.error as any)?.status === 401);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6 pb-32 lg:pb-8">
        {/* Page header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-etukas-black">Shopping Cart</h1>
            {hasAnyItems && (
              <p className="mt-1 text-sm text-gray-500">
                {combinedItemCount} {combinedItemCount === 1 ? "item" : "items"}
                {hasTmtBatches ? ` • ${tmtCart.summary.totalTons.toFixed(2)} Tons TMT Steel` : ""}
              </p>
            )}
          </div>

          {/* Clear cart button */}
          {hasAnyItems && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-etukas-red"
            >
              <Trash2 size={14} />
              Clear Cart
            </button>
          )}
        </div>

        {/* Booked Service Requests Tracker Banner */}
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/70 p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Wrench size={16} />
              </span>
              <div>
                <p className="text-xs font-bold text-gray-900">
                  Booked Technicians & Professionals Services
                </p>
                <p className="text-[11px] text-gray-600">
                  Track your booked service requests (e.g. ID <span className="font-mono font-bold text-orange-700">ETPS...</span>), technician appointments, and status.
                </p>
              </div>
            </div>
            <Link
              to="/account?tab=services"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-600 transition active:scale-95"
            >
              <span>View Booked Services</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Content area */}
        {cart.isLoading && !hasTmtBatches ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <CartSkeleton />
            <div className="hidden lg:block">
              <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          </div>
        ) : isAuthError && !hasTmtBatches ? (
          <SignInPrompt />
        ) : cart.error && !hasTmtBatches && !isAuthError ? (
          <CartError onRetry={() => cart.refetch()} />
        ) : !hasAnyItems ? (
          <EmptyCart />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* ── Left: TMT Steel Batches + Seller-grouped items ── */}
            <div className="space-y-6">
              {tmtCart.batches.map((batch) => (
                <TmtCartBatchCard
                  key={batch.id}
                  batch={batch}
                  onUpdateLineQuantity={tmtCart.updateLineQuantity}
                  onRemoveBatch={tmtCart.removeBatch}
                />
              ))}

              {sellerGroups.map((group, idx) => (
                <SellerGroupSection key={group.storeId} group={group} index={idx} />
              ))}

              {/* Continue shopping – desktop */}
              <div className="hidden lg:block">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-etukas-red hover:underline"
                >
                  ← Continue Shopping
                </Link>
              </div>
            </div>

            {/* ── Right: Order Summary (sticky on desktop) ── */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <OrderSummary
                  cart={combinedSummaryCart}
                  itemCount={combinedItemCount}
                  totalQty={combinedTotalQty}
                  onCheckout={handleCheckout}
                  checkoutDisabled={!hasAnyItems}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile sticky checkout bar */}
      {hasAnyItems && (
        <MobileStickyBar
          total={combinedCartTotals.totalMinor}
          itemCount={combinedItemCount}
          onCheckout={handleCheckout}
          disabled={false}
        />
      )}

      {/* Clear cart confirmation dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        title="Clear your entire cart?"
        description="All items from all sellers will be removed. This action cannot be undone."
        confirmLabel="Yes, clear cart"
        variant="danger"
        loading={clearCart.isPending}
        onConfirm={handleClearCart}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}
