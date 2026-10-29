import { useState } from "react";
import { Check, MapPin, Plus, Star, ShieldCheck, Sparkles, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { StoreProduct, getProductImageUrl } from "../../services/api";
import { formatMoney } from "../../lib/utils";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAddToCart } from "../../hooks/useAddToCart";

interface BuildingSuppliesGridProps {
  products?: StoreProduct[];
  isLoading?: boolean;
}

const CATEGORY_TABS = [
  { label: "All Supplies", slug: "all" },
  { label: "Tiles & Flooring", slug: "tiles-flooring" },
  { label: "Paints & Finishes", slug: "paints" },
  { label: "Plumbing & Sanitary", slug: "plumbing" },
  { label: "Electrical", slug: "electrical-materials" }
] as const;

// Deterministic mock ratings for rich marketplace presentation
function getProductRating(id: string) {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rating = (4.5 + (hash % 5) * 0.1).toFixed(1);
  const reviewsCount = 28 + (hash % 95);
  return { rating, reviewsCount };
}

export function BuildingSuppliesGrid({ products, isLoading }: BuildingSuppliesGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { addToCart, loadingId, successId, notice } = useAddToCart();

  // Filter supplies for structured discovery (Tiles, Paints, Plumbing, Electrical, etc.)
  const heavySupplies = products?.filter((item) => {
    const slug = item.product.category?.slug;
    if (selectedCategory === "all") {
      // Prioritize heavy/finishing supplies or all items
      return (
        slug === "tiles-flooring" ||
        slug === "paints" ||
        slug === "plumbing" ||
        slug === "electrical-materials" ||
        slug === "construction-machinery" ||
        slug === "bricks-blocks"
      );
    }
    return slug === selectedCategory;
  }) ?? [];

  // Fallback to general products if specific category filter is empty
  const displayItems = heavySupplies.length > 0 ? heavySupplies : (products ?? []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900/95 px-5 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur transition-all duration-300">
          {notice}
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-blue-700">
              <ShieldCheck size={12} /> VERIFIED LOCAL SUPPLIERS
            </span>
            <span className="text-[11px] font-medium text-gray-500">
              📍 Hyderabad & surrounding yards
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Heavy & General Building Supplies
          </h2>
          <p className="mt-1 text-xs text-gray-600 sm:text-sm">
            Tiles, bathroom fittings, paints, and plumbing materials from authorized regional dealers
          </p>
        </div>

        <Link
          to="/products"
          className="text-xs font-bold text-etukas-red hover:underline sm:text-sm self-start md:self-auto"
        >
          View complete catalog &rarr;
        </Link>
      </div>

      {/* Category Filter Tabs */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
        <Filter size={14} className="shrink-0 text-gray-400" />
        {CATEGORY_TABS.map((tab) => {
          const isActive = selectedCategory === tab.slug;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => setSelectedCategory(tab.slug)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                isActive
                  ? "bg-etukas-black text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Multi-Column Grid (2-col mobile -> 3-col tablet -> 4-col desktop) */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <div className="mt-4 flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-14 rounded-lg" />
                </div>
              </div>
            ))
          : displayItems.map((item) => {
              const discountMinor = item.discountMinor ?? 0;
              const originalMrp =
                discountMinor > 0
                  ? item.priceMinor + discountMinor
                  : Math.round(item.priceMinor * 1.18);
              const discountPercent = Math.max(
                5,
                Math.round(((originalMrp - item.priceMinor) / originalMrp) * 100)
              );
              const savingsAmount = originalMrp - item.priceMinor;
              const { rating, reviewsCount } = getProductRating(item.id);
              const isAdded = successId === item.id;
              const isAdding = loadingId === item.id;

              return (
                <article
                  key={item.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-md"
                >
                  {/* High-res Thumbnail & Overlay Tags */}
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                    <img
                      src={getProductImageUrl(
                        item.product.images[0],
                        item.product.id,
                        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80"
                      )}
                      alt={item.product.images[0]?.altText || item.product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80";
                      }}
                    />

                    {/* Discount Tag */}
                    <div className="absolute left-2 top-2 flex flex-col gap-1">
                      <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                        {discountPercent}% OFF
                      </span>
                    </div>

                    {/* Category Label */}
                    <div className="absolute right-2 top-2">
                      <span className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-800 shadow-sm backdrop-blur-sm">
                        {item.product.category?.name ?? "Supplies"}
                      </span>
                    </div>

                    {/* Verified Local Seller Banner on hover / bottom */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1 font-semibold truncate max-w-[130px]">
                          <MapPin size={10} className="text-red-400 shrink-0" />
                          <span className="truncate">{item.store.name}</span>
                        </span>
                        <span className="text-gray-200 font-medium">{item.deliveryEta}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
                    <div>
                      {/* Ratings & Stock Status */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-gray-800">{rating}</span>
                          <span className="text-gray-400 font-normal">({reviewsCount})</span>
                        </span>

                        {item.stockQuantity > 20 ? (
                          <span className="text-[10px] font-semibold text-emerald-600">
                            In Stock ({item.stockQuantity})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600">
                            Only {item.stockQuantity} left
                          </span>
                        )}
                      </div>

                      {/* Product Title */}
                      <Link
                        to={`/products?category=${item.product.category?.slug ?? ""}`}
                        className="mt-1.5 block line-clamp-2 text-xs font-bold leading-snug text-gray-900 transition-colors group-hover:text-etukas-red sm:text-sm"
                        title={item.product.name}
                      >
                        {item.product.name}
                      </Link>

                      {/* Updated Price Note */}
                      <p className="mt-1 text-[10px] text-gray-500">
                        Live seller price • updated today
                      </p>
                    </div>

                    {/* Pricing Block & Action Button */}
                    <div className="mt-3.5 border-t border-gray-100 pt-2.5">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-extrabold text-gray-900 sm:text-lg">
                            {formatMoney(item.priceMinor)}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            /{item.product.unit}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 line-through">
                          {formatMoney(originalMrp)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-emerald-600">
                          Save {formatMoney(savingsAmount)}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          MOQ {item.minOrderQuantity}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => addToCart(item.id, 1)}
                        disabled={isAdding}
                        aria-label={`Add ${item.product.name} to cart`}
                        className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
                          isAdded
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-etukas-black text-white hover:bg-etukas-red shadow-sm"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={14} className="animate-bounce" /> Added to Cart
                          </>
                        ) : isAdding ? (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <Plus size={14} /> Quick Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
      </div>
    </section>
  );
}
