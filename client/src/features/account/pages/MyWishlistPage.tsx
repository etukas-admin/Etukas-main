import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Search, ShoppingCart, Store as StoreIcon, Trash2, X } from "lucide-react";
import { useAddToCart } from "../../../hooks/useAddToCart";
import { formatMoney } from "../../../lib/utils";
import { createSafeImageHandler, FALLBACK_PRODUCT_IMAGE } from "../../../utils/imageFallback";
import { AccountSubPageHeader } from "../components/AccountSubPageHeader";
import { useWishlist } from "../store/wishlistStore";

export function MyWishlistPage() {
  const { items, remove, clear } = useWishlist();
  const { addToCart, isLoading: isAdding, notice } = useAddToCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.storeName.toLowerCase().includes(q) ||
        (item.categoryName ?? "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const handleMoveToCart = async (storeProductId: string, minQty: number) => {
    setAddingId(storeProductId);
    try {
      await addToCart(storeProductId, Math.max(1, minQty));
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 pb-12">
      <AccountSubPageHeader
        title="My Wishlist"
        subtitle={items.length > 0 ? `${items.length} saved item${items.length === 1 ? "" : "s"}` : undefined}
        backTo="/customer"
        rightSlot={
          items.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:border-etukas-red/40 hover:text-etukas-red"
            >
              Clear all
            </button>
          ) : null
        }
      />

      {notice ? (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-etukas-black px-5 py-2.5 text-xs font-bold text-white shadow-xl">
          {notice}
        </div>
      ) : null}

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {items.length > 0 ? (
          <label className="relative block">
            <span className="sr-only">Search wishlist</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved materials or stores"
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
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-etukas-pink text-etukas-red">
              <Heart size={28} />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-etukas-black">Your Wishlist is Empty</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-gray-500">
              Tap the heart icon on any cement, steel, brick, or electrical product to bookmark materials for your construction project.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-red-500/20 hover:bg-red-700"
            >
              <ShoppingCart size={15} />
              <span>Explore Materials</span>
            </Link>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm font-bold text-etukas-black">No wishlist items match "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs font-bold text-etukas-red hover:underline"
            >
              Reset search
            </button>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {filteredItems.map((item) => {
              const mrpMinor =
                (item.discountMinor ?? 0) > 0
                  ? item.priceMinor + (item.discountMinor ?? 0)
                  : Math.round(item.priceMinor * 1.12);
              const offPct = Math.max(
                1,
                Math.round(((mrpMinor - item.priceMinor) / mrpMinor) * 100)
              );

              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-etukas-red/35 hover:shadow-sm"
                >
                  <div className="flex gap-3.5">
                    <Link
                      to={`/product/${item.id}`}
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-2"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-contain"
                        onError={createSafeImageHandler(FALLBACK_PRODUCT_IMAGE)}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/product/${item.id}`}
                          className="line-clamp-2 text-sm font-extrabold text-etukas-black hover:text-etukas-red"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          aria-label={`Remove ${item.name} from wishlist`}
                          className="rounded-lg p-1 text-gray-400 transition hover:bg-etukas-pink hover:text-etukas-red"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
                        <StoreIcon size={12} className="shrink-0 text-etukas-red" />
                        <span className="truncate">{item.storeName}</span>
                      </p>

                      <div className="mt-2 flex flex-wrap items-baseline gap-2">
                        <span className="text-base font-black text-etukas-black">
                          {formatMoney(item.priceMinor)}
                        </span>
                        <span className="text-[11px] text-gray-400 line-through">
                          {formatMoney(mrpMinor)}
                        </span>
                        <span className="text-[11px] font-extrabold text-etukas-green">
                          {offPct}% off
                        </span>
                      </div>

                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Min. {item.minOrderQuantity} {item.unit}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                    <Link
                      to={`/product/${item.id}`}
                      className="flex-1 rounded-xl border border-gray-200 py-2 text-center text-xs font-bold text-etukas-black transition hover:border-etukas-red/40 hover:bg-etukas-pink/40"
                    >
                      View Details
                    </Link>
                    <button
                      type="button"
                      disabled={isAdding && addingId === item.id}
                      onClick={() => void handleMoveToCart(item.id, item.minOrderQuantity)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-etukas-red py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-60"
                    >
                      <ShoppingCart size={13} />
                      <span>{isAdding && addingId === item.id ? "Adding..." : "Add to Cart"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
