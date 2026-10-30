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
} from "lucide-react";
import { SellerGroupSection } from "./SellerGroup";
import { OrderSummary } from "./OrderSummary";
import { ConfirmDialog } from "./ConfirmDialog";
import { useCartQuery, useClearCart } from "./useCart";
import { enrichCartItems, groupByStore } from "./cartTypes";
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
  const navigate = useNavigate();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Enrich + group cart items
  const enrichedItems = useMemo(
    () => (cart.data?.items ? enrichCartItems(cart.data.items) : []),
    [cart.data?.items]
  );
  const sellerGroups = useMemo(() => groupByStore(enrichedItems), [enrichedItems]);
  const totalQty = useMemo(
    () => enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
    [enrichedItems]
  );

  const handleCheckout = () => {
    navigate("/checkout");
  };

  const handleClearCart = () => {
    const ids = cart.data?.items.map((i) => i.id) ?? [];
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
            {cart.data && cart.data.items.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {cart.data.items.length} {cart.data.items.length === 1 ? "item" : "items"} from{" "}
                {sellerGroups.length} {sellerGroups.length === 1 ? "seller" : "sellers"}
              </p>
            )}
          </div>

          {/* Clear cart button */}
          {cart.data && cart.data.items.length > 0 && (
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

        {/* Content area */}
        {cart.isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <CartSkeleton />
            <div className="hidden lg:block">
              <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          </div>
        ) : isAuthError ? (
          <SignInPrompt />
        ) : cart.error ? (
          <CartError onRetry={() => cart.refetch()} />
        ) : !cart.data || cart.data.items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* ── Left: Seller-grouped items ── */}
            <div className="space-y-6">
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
                  cart={cart.data}
                  itemCount={cart.data.items.length}
                  totalQty={totalQty}
                  onCheckout={handleCheckout}
                  checkoutDisabled={cart.data.items.length === 0}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile sticky checkout bar */}
      {cart.data && cart.data.items.length > 0 && (
        <MobileStickyBar
          total={cart.data.totals.totalMinor}
          itemCount={cart.data.items.length}
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
