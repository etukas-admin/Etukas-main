import { useState, useMemo, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Share2,
  ShoppingBag,
  Star,
  Truck,
  Store as StoreIcon,
  Calendar,
  CheckCircle2,
  Search,
  ShoppingCart,
  Minus,
  Plus,
  PackageCheck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { StoreProduct, getProductImageUrl } from "../../services/api";
import { formatMoney } from "../../lib/utils";
import { getSelectedAddress } from "../location/locationStore";
import { useAddToCart } from "../../hooks/useAddToCart";
import { useCartQuery } from "../cart/useCart";
import { marketplaceApi, getStoredUser } from "../../services/api";
import { queryKeys } from "../../lib/queryKeys";
import { FALLBACK_PRODUCT_IMAGE } from "../../utils/imageFallback";

interface ProductDetailsViewProps {
  product: StoreProduct;
  relatedProducts?: StoreProduct[];
  onBack: () => void;
  onSelectProduct?: (product: StoreProduct) => void;
}

// Cement Grade options with price adjustments per bag
const CEMENT_GRADES = [
  { id: "opc-43", label: "OPC 43 Grade", priceDelta: 0, tag: "Standard High Strength" },
  { id: "opc-53", label: "OPC 53 Grade", priceDelta: 1500, tag: "Super High Early Strength" },
  { id: "ppc-flyash", label: "PPC (Fly Ash)", priceDelta: -1000, tag: "Weather & Crack Resistant" },
  { id: "psc-slag", label: "PSC (Slag)", priceDelta: -1500, tag: "Sulphate & Marine Resistant" },
];

// Iron Bar (TMT) Size options with price adjustments
const IRON_BAR_SIZES = [
  { id: "4mm", label: "4 mm", multiplier: 1.05 },
  { id: "6mm", label: "6 mm", multiplier: 1.03 },
  { id: "8mm-lite", label: "8 mm (Lite)", multiplier: 0.96 },
  { id: "8mm", label: "8 mm", multiplier: 1.0 },
  { id: "10mm", label: "10 mm", multiplier: 0.99 },
  { id: "12mm", label: "12 mm", multiplier: 1.0 },
  { id: "16mm", label: "16 mm", multiplier: 0.99 },
  { id: "20mm", label: "20 mm", multiplier: 0.98 },
];

export function ProductDetailsView({
  product,
  relatedProducts = [],
  onBack,
  onSelectProduct
}: ProductDetailsViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToCart, isLoading: isAdding, notice } = useAddToCart();
  const [isBuying, setIsBuying] = useState(false);
  const currentUser = getStoredUser();

  // Fetch genuine customer reviews for this material from verified delivered orders
  const { data: reviewsData } = useQuery({
    queryKey: ["product-reviews", product.id],
    queryFn: ({ signal }) => marketplaceApi.getProductReviews(product.id, { signal }),
    staleTime: 30000
  });

  const genuineReviews = reviewsData?.reviews ?? [];
  const averageRating = reviewsData?.rating;
  const reviewsCount = reviewsData?.reviewsCount ?? 0;
  const topGenuineReview = genuineReviews.length > 0 ? genuineReviews[0] : null;
  const remainingReviews = genuineReviews.length > 1 ? genuineReviews.slice(1) : [];

  const cartQuery = useCartQuery();
  const cartCount = cartQuery.data?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  // Detect category type
  const categorySlug = (product.product.category?.slug || "").toLowerCase();
  const categoryName = (product.product.category?.name || "").toLowerCase();
  const productNameLower = product.product.name.toLowerCase();

  const isCement =
    categorySlug.includes("cement") ||
    categoryName.includes("cement") ||
    productNameLower.includes("cement");

  const isIronBar =
    categorySlug.includes("iron") ||
    categorySlug.includes("steel") ||
    categoryName.includes("iron") ||
    categoryName.includes("steel") ||
    productNameLower.includes("tmt") ||
    productNameLower.includes("iron") ||
    productNameLower.includes("steel");

  // Selection states
  const [selectedGrade, setSelectedGrade] = useState<string>("opc-53");
  const [selectedIronSize, setSelectedIronSize] = useState<string>("12mm");
  const [quantity, setQuantity] = useState<number>(product.minOrderQuantity || 1);
  const [quantityInput, setQuantityInput] = useState<string>(String(product.minOrderQuantity || 1));
  const [isDeliveryDetailsOpen, setIsDeliveryDetailsOpen] = useState<boolean>(true);
  const [isReviewsOpen, setIsReviewsOpen] = useState<boolean>(true);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  // Address
  const activeAddress = getSelectedAddress();

  // Instant Price Calculation
  const unitBasePriceMinor = product.priceMinor;

  const adjustedUnitBasePrice = useMemo(() => {
    if (isCement) {
      const grade = CEMENT_GRADES.find((g) => g.id === selectedGrade);
      const delta = grade ? grade.priceDelta : 0;
      return Math.max(1000, unitBasePriceMinor + delta);
    }
    if (isIronBar) {
      const sizeOpt = IRON_BAR_SIZES.find((s) => s.id === selectedIronSize);
      const multiplier = sizeOpt ? sizeOpt.multiplier : 1.0;
      return Math.round(unitBasePriceMinor * multiplier);
    }
    return unitBasePriceMinor;
  }, [isCement, isIronBar, selectedGrade, selectedIronSize, unitBasePriceMinor]);

  const effectiveQuantity = Math.max(1, quantity);
  const totalPriceMinor = adjustedUnitBasePrice * effectiveQuantity;

  const originalUnitPrice =
    (product.discountMinor ?? 0) > 0
      ? adjustedUnitBasePrice + (product.discountMinor || 0)
      : Math.round(adjustedUnitBasePrice * 1.15);

  const totalOriginalPriceMinor = originalUnitPrice * effectiveQuantity;
  const discountPercent = Math.max(
    5,
    Math.round(((totalOriginalPriceMinor - totalPriceMinor) / totalOriginalPriceMinor) * 100)
  );

  // Handle Quantity Change
  const updateQuantity = (newQty: number) => {
    const min = product.minOrderQuantity || 1;
    const validQty = Math.max(min, Math.min(newQty, product.stockQuantity || 99999));
    setQuantity(validQty);
    setQuantityInput(String(validQty));
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuantityInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setQuantity(Math.min(parsed, product.stockQuantity || 99999));
    }
  };

  const handleQuantityInputBlur = () => {
    const min = product.minOrderQuantity || 1;
    const parsed = parseInt(quantityInput, 10);
    if (isNaN(parsed) || parsed < min) {
      updateQuantity(min);
    } else {
      updateQuantity(parsed);
    }
  };

  const imageUrl = getProductImageUrl(
    product.product.images[0],
    product.product.id,
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"
  );

  // Keep page title and Open Graph meta tags synced with the active product
  useEffect(() => {
    const prevTitle = document.title;
    const priceLabel = `${formatMoney(adjustedUnitBasePrice)}/${product.product.unit}`;
    const fullTitle = `${product.product.name} (${priceLabel}) | Etukas`;
    const desc =
      product.product.description && product.product.description !== product.product.name
        ? product.product.description
        : `Buy ${product.product.name} from ${product.store.name} on Etukas.`;
    const absoluteImageUrl = imageUrl.startsWith("http")
      ? imageUrl
      : `${window.location.origin}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;

    document.title = fullTitle;

    const upsertMeta = (attr: "property" | "name", key: string, content: string) => {
      let tag = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    upsertMeta("property", "og:type", "product");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:image", absoluteImageUrl);
    upsertMeta("property", "og:url", window.location.href);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", absoluteImageUrl);

    return () => {
      document.title = prevTitle;
    };
  }, [adjustedUnitBasePrice, imageUrl, product]);

  // Share handler: attaches the actual product image file on supported mobile browsers
  // so Android/iOS Share Sheet & WhatsApp display the real product photo instead of the site favicon.
  const handleShare = async () => {
    if (isSharing) return;
    const productUrl = window.location.href;
    const priceText = `${formatMoney(adjustedUnitBasePrice)}/${product.product.unit}`;
    const shareTitle = `${product.product.name} - ${priceText}`;
    const shareCaption = `Check out ${product.product.name} (${priceText}) on Etukas\n${productUrl}`;

    if (!navigator.share) {
      try {
        await navigator.clipboard?.writeText(productUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {}
      return;
    }

    setIsSharing(true);
    try {
      let imageFile: File | null = null;
      try {
        const res = await fetch(imageUrl, { mode: "cors" });
        if (res.ok) {
          let blob = await res.blob();
          if (blob.type.startsWith("image/") && blob.size > 0) {
            // Convert WebP to JPEG for maximum compatibility with WhatsApp & Android Share Sheet
            if (blob.type === "image/webp" && typeof createImageBitmap === "function") {
              try {
                const bitmap = await createImageBitmap(blob);
                const canvas = document.createElement("canvas");
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(bitmap, 0, 0);
                  const jpegBlob = await new Promise<Blob | null>((resolve) =>
                    canvas.toBlob(resolve, "image/jpeg", 0.88)
                  );
                  if (jpegBlob) blob = jpegBlob;
                }
                bitmap.close();
              } catch {
                // Keep original image blob if conversion fails
              }
            }

            const ext =
              blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
            const safeSlug =
              product.product.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 40) || "etukas-product";
            imageFile = new File([blob], `${safeSlug}.${ext}`, {
              type: blob.type || "image/jpeg"
            });
          }
        }
      } catch {
        // Fallback to URL share if image fetch fails
      }

      if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
        await navigator.share({
          title: shareTitle,
          text: shareCaption,
          files: [imageFile]
        });
        return;
      }

      await navigator.share({
        title: shareTitle,
        text: `Check out ${product.product.name} (${priceText}) on Etukas`,
        url: productUrl
      });
    } catch (err) {
      // Ignore user cancellation (AbortError); fallback to clipboard on other errors
      if (err instanceof Error && err.name !== "AbortError") {
        try {
          await navigator.clipboard?.writeText(productUrl);
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
        } catch {}
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Instant Buy Now handler (navigates directly to Checkout)
  const handleBuyNow = async () => {
    setIsBuying(true);
    const directItem = {
      id: `direct-${product.id}`,
      storeProductId: product.id,
      productName: product.product.name,
      unit: product.product.unit || "piece",
      quantity: effectiveQuantity,
      priceMinor: adjustedUnitBasePrice,
      originalPriceMinor: originalUnitPrice,
      imageUrl: product.product.images?.[0]?.url || FALLBACK_PRODUCT_IMAGE,
      category: product.product.category?.name || "Building Material",
      storeId: product.store.id,
      storeName: product.store.name || "Etukas Verified Partner Store"
    };

    try {
      if (currentUser) {
        await marketplaceApi.addToCart(product.id, effectiveQuantity);
        await queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      }
    } catch (err) {
      console.warn("Could not sync backend cart prior to checkout:", err);
    } finally {
      setIsBuying(false);
      navigate("/checkout", { state: { directItem } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900/95 px-5 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur transition-all duration-300">
          {notice}
        </div>
      )}

      {/* Minimized Header Only (h-10): [<- Back] [Logo] [Search Bar] [Cart] */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-10 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          {/* Back button left of logo */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 hover:text-black focus:outline-none"
          >
            <ArrowLeft size={19} className="stroke-[2.5]" />
          </button>

          {/* Etukas Icon Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-1.5 focus:outline-none" aria-label="Etukas Home">
            <img src="/favicon.png" alt="Etukas" className="h-6 w-6 object-contain" />
            <span className="hidden text-sm font-black tracking-tight text-gray-900 sm:inline-block">
              ETUKAS<span className="text-etukas-red">.COM</span>
            </span>
          </Link>

          {/* Search Bar */}
          <div className="relative min-w-0 flex-1">
            <span className="sr-only">Search building materials</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              readOnly
              onClick={() => navigate("/products")}
              placeholder="Search building materials"
              className="h-8 w-full cursor-pointer rounded-full border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white focus:border-etukas-red focus:bg-white focus:outline-none"
            />
          </div>

          {/* Cart Symbol with Badge */}
          <Link
            to="/cart"
            aria-label="View Cart"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 hover:text-etukas-red focus:outline-none"
          >
            <ShoppingCart size={19} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-etukas-red px-1 text-[9px] font-black text-white shadow-sm">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Main Product Container */}
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Product Image with Share Button */}
          <div className="lg:col-span-6">
            <div className="sticky top-14 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-50 sm:aspect-square">
                <img
                  src={imageUrl}
                  alt={product.product.name}
                  className="h-full w-full object-contain p-2 transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80";
                  }}
                />

                {/* Rating Badge */}
                <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-gray-900 shadow-md backdrop-blur">
                  {averageRating ? (
                    <>
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                      <span>{averageRating}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-600 font-semibold">{reviewsCount} {reviewsCount === 1 ? "Review" : "Reviews"}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span className="text-gray-800 font-semibold">Verified Material</span>
                    </>
                  )}
                </div>

                {/* Share Button at Top Right Corner */}
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  disabled={isSharing}
                  aria-label="Share product details"
                  title="Share product with photo"
                  className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md transition hover:bg-white hover:text-etukas-red active:scale-95 disabled:opacity-60"
                >
                  <Share2 size={18} className={isSharing ? "animate-pulse text-etukas-red" : ""} />
                </button>

                {shareCopied && (
                  <div className="absolute right-3 top-14 rounded-md bg-black/80 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur">
                    Link copied!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Title, Store, Dynamic Grade/Size, Quantity, Price, Delivery Details */}
          <div className="flex flex-col gap-5 lg:col-span-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              {/* Category & Verified Store Tag */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-etukas-red">
                    {product.product.category?.name || "Building Material"}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-600">
                    <StoreIcon size={14} className="text-gray-400" />
                    {product.store.name}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  {product.deliveryEta}
                </span>
              </div>

              {/* Title & Brand */}
              <h1 className="mt-3 text-xl font-extrabold leading-tight text-gray-900 sm:text-2xl">
                {product.product.name}
              </h1>

              {product.product.description && (
                <p className="mt-2 text-xs leading-relaxed text-gray-600 sm:text-sm">
                  {product.product.description}
                </p>
              )}

              {/* Out of delivery range alert when customer opens a direct link outside seller radius */}
              {product.isDeliverable === false && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-extrabold">Outside seller&apos;s delivery radius</p>
                      <p className="mt-0.5 text-red-700">
                        This product delivers within <strong>{product.deliveryRadiusKm ?? product.store.serviceRadiusKm ?? 25} km</strong> of {product.store.city}
                        {product.distanceKm != null ? ` (your site is ${product.distanceKm} km away)` : ""}.
                      </p>
                    </div>
                    <Link
                      to="/location"
                      className="rounded-lg bg-etukas-red px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Change Location
                    </Link>
                  </div>
                </div>
              )}

              {/* Cement Grade Selection (Radio Buttons) */}
              {isCement && (
                <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                      Select Cement Grade:
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">One Bag = 50 Kgs</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {CEMENT_GRADES.map((grade) => {
                      const isSelected = selectedGrade === grade.id;
                      const gradePrice = Math.max(1000, unitBasePriceMinor + grade.priceDelta);
                      return (
                        <label
                          key={grade.id}
                          className={`relative flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                            isSelected
                              ? "border-etukas-red bg-white shadow-sm ring-1 ring-etukas-red"
                              : "border-gray-200 bg-white/70 hover:border-gray-300 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="cement-grade"
                              value={grade.id}
                              checked={isSelected}
                              onChange={() => setSelectedGrade(grade.id)}
                              className="h-4 w-4 text-etukas-red focus:ring-etukas-red"
                            />
                            <div>
                              <div className="text-xs font-extrabold text-gray-900">{grade.label}</div>
                              <div className="text-[10px] text-gray-500">{grade.tag}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-gray-900">{formatMoney(gradePrice)}</div>
                            <div className="text-[10px] text-gray-400">/{product.product.unit}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Iron Bar (TMT) Size Selection */}
              {isIronBar && (
                <div className="mt-5 rounded-xl border border-sky-200/80 bg-sky-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-sky-900">
                      Select Iron Bar Size:
                    </span>
                    <span className="text-[11px] font-bold text-sky-700">ISI Certified Fe-550D</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {IRON_BAR_SIZES.map((size) => {
                      const isSelected = selectedIronSize === size.id;
                      const sizePrice = Math.round(unitBasePriceMinor * size.multiplier);
                      return (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => setSelectedIronSize(size.id)}
                          className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                            isSelected
                              ? "border-etukas-red bg-white text-gray-900 shadow-sm ring-2 ring-etukas-red"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <span className="text-xs font-black">{size.label}</span>
                          <span className="mt-1 text-[11px] font-extrabold text-etukas-red">
                            {formatMoney(sizePrice)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Counter (- [input] +) */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-gray-100 py-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Quantity</div>
                  <div className="text-[11px] text-gray-500">
                    Minimum Order: {product.minOrderQuantity} {product.product.unit}s • In stock: {product.stockQuantity}
                  </div>
                </div>

                <div className="flex items-center rounded-xl border-2 border-gray-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => updateQuantity(quantity - 1)}
                    disabled={quantity <= (product.minOrderQuantity || 1)}
                    aria-label="Decrease quantity"
                    className="flex h-10 w-10 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="number"
                    min={product.minOrderQuantity || 1}
                    max={product.stockQuantity || 99999}
                    value={quantityInput}
                    onChange={handleQuantityInputChange}
                    onBlur={handleQuantityInputBlur}
                    aria-label="Enter quantity number"
                    className="h-10 w-16 text-center text-sm font-black text-gray-900 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => updateQuantity(quantity + 1)}
                    disabled={quantity >= (product.stockQuantity || 99999)}
                    aria-label="Increase quantity"
                    className="flex h-10 w-10 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:opacity-30"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Instant Price Display */}
              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Total Calculated Price ({effectiveQuantity} {product.product.unit}s)
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                        {formatMoney(totalPriceMinor)}
                      </span>
                      <span className="text-sm font-semibold text-gray-400 line-through">
                        {formatMoney(totalOriginalPriceMinor)}
                      </span>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-etukas-red">
                        {discountPercent}% OFF
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs font-semibold text-gray-500">
                    <div>Unit: {formatMoney(adjustedUnitBasePrice)}/{product.product.unit}</div>
                    <div className="text-emerald-600 font-bold">GST inclusive</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Details Dropdown Section with Down Arrow Symbol */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setIsDeliveryDetailsOpen(!isDeliveryDetailsOpen)}
                className="flex w-full items-center justify-between p-4 text-left font-extrabold text-gray-900 transition hover:bg-gray-50 sm:p-5"
              >
                <div className="flex items-center gap-2.5">
                  <Truck size={20} className="text-etukas-red" />
                  <span className="text-sm sm:text-base">Delivery Details & Local Fulfillment</span>
                </div>
                {isDeliveryDetailsOpen ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </button>

              {isDeliveryDetailsOpen && (
                <div className="border-t border-gray-100 bg-gray-50/60 p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
                  {/* Delivery Address */}
                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 border border-gray-100">
                    <MapPin size={18} className="text-etukas-red shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Delivery Address
                      </div>
                      <div className="mt-0.5 font-bold text-gray-900">
                        {activeAddress.line1 || activeAddress.city}
                      </div>
                      <div className="text-xs text-gray-500">
                        {activeAddress.city}, {activeAddress.state || "Andhra Pradesh"} - {activeAddress.postalCode}
                      </div>
                    </div>
                    <Link
                      to="/location"
                      className="shrink-0 text-xs font-bold text-etukas-red hover:underline"
                    >
                      Change
                    </Link>
                  </div>

                  {/* Delivery Date / ETA */}
                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 border border-gray-100">
                    <Calendar size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Delivery Date & Schedule
                      </div>
                      <div className="mt-0.5 font-bold text-gray-900">
                        Estimated Arrival: {product.deliveryEta}
                      </div>
                      <div className="text-xs text-gray-500">
                        Standard express yard dispatch with transit insurance
                      </div>
                    </div>
                  </div>

                  {/* Store Name & Yard Info */}
                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 border border-gray-100">
                    <StoreIcon size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Fulfilling Store & Yard
                      </div>
                      <div className="mt-0.5 font-bold text-gray-900">
                        {product.store.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        <span>{product.store.city}, {product.store.state}</span>
                        <span className="mx-1.5 text-gray-400">•</span>
                        <span>Delivery Range: {product.deliveryRadiusKm ?? product.store.serviceRadiusKm ?? 25} km</span>
                        {product.distanceKm != null && (
                          <>
                            <span className="mx-1.5 text-gray-400">•</span>
                            <span className="font-semibold text-emerald-700">{product.distanceKm} km from your site</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Reviews & Rating Details Dropdown Section */}
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setIsReviewsOpen(!isReviewsOpen)}
            className="flex w-full items-center justify-between p-4 text-left font-extrabold text-gray-900 transition hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80">
                <Star size={18} className="fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-gray-900">Ratings & Reviews</span>
                  {averageRating ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900">
                      <Star size={11} className="fill-amber-900 text-amber-900" /> {averageRating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                      New Listing
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  {reviewsCount > 0
                    ? `${reviewsCount} verified rating${reviewsCount === 1 ? "" : "s"} & review${reviewsCount === 1 ? "" : "s"} from local site buyers`
                    : "No customer reviews yet from delivered orders"}
                </p>
              </div>
            </div>
            {isReviewsOpen ? (
              <ChevronUp size={20} className="text-gray-500 shrink-0" />
            ) : (
              <ChevronDown size={20} className="text-gray-500 shrink-0" />
            )}
          </button>

          {isReviewsOpen && (
            <div className="border-t border-gray-100 p-4 sm:p-6 bg-gray-50/40">
              {genuineReviews.length > 0 ? (
                <>
                  {/* TOP RATED REVIEW - Prominently Displayed in Big Size */}
                  {topGenuineReview && (
                    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-4 sm:p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                            <Star size={10} className="fill-white text-white" /> Top Rated Review
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 size={13} /> Verified Project Buyer
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          {topGenuineReview.date}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={
                              i < topGenuineReview.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-200"
                            }
                          />
                        ))}
                        <span className="ml-1 text-xs font-extrabold text-gray-800">
                          {topGenuineReview.rating}.0 / 5.0
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-gray-800 font-medium">
                        "{topGenuineReview.comment}"
                      </p>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-amber-100/80 pt-3 text-xs">
                        <div className="font-black text-gray-900">{topGenuineReview.author}</div>
                        {topGenuineReview.site && (
                          <div className="text-gray-500 font-medium">
                            Site: {topGenuineReview.site}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* REMAINING REVIEWS IN HORIZONTAL SIDE-SCROLL RECTANGLE CARDS */}
                  {remainingReviews.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
                          More Reviews from Nearby Sites
                        </span>
                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                          Scroll horizontally <ArrowRight size={12} />
                        </span>
                      </div>

                      <div className="flex gap-3.5 overflow-x-auto pb-3 pt-1 scroll-smooth">
                        {remainingReviews.map((review) => (
                          <div
                            key={review.id}
                            className="w-[280px] sm:w-[320px] shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-amber-400">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={12}
                                      className={
                                        i < review.rating
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-gray-200"
                                      }
                                    />
                                  ))}
                                </div>
                                <span className="text-[11px] text-gray-400">
                                  {review.date}
                                </span>
                              </div>

                              <p className="mt-2.5 text-xs text-gray-700 leading-relaxed line-clamp-3">
                                {review.comment}
                              </p>
                            </div>

                            <div className="mt-3.5 border-t border-gray-100 pt-2 flex items-center justify-between text-[11px]">
                              <span className="font-bold text-gray-900">{review.author}</span>
                              {review.site && (
                                <span className="text-gray-400 truncate max-w-[140px]">
                                  {review.site}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Clean Empty State when no delivered reviews yet */
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                    <Star size={24} className="fill-amber-400 text-amber-400" />
                  </div>
                  <h3 className="mt-3 text-sm font-extrabold text-gray-900">No Customer Reviews Yet</h3>
                  <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                    Reviews on Etukas are only collected from verified delivered orders to guarantee 100% genuine feedback from real project sites.
                  </p>
                  <div className="mt-4">
                    <Link
                      to="/account"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                    >
                      View Delivered Orders to Rate <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <section className="mt-8 mb-6">
            <h2 className="mb-4 text-lg font-black text-gray-900 sm:text-xl">Related Materials</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {relatedProducts.slice(0, 4).map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => {
                    onSelectProduct?.(rel);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-etukas-red hover:shadow-md"
                >
                  <img
                    src={getProductImageUrl(rel.product.images[0], rel.product.id)}
                    alt={rel.product.name}
                    className="aspect-square w-full rounded-lg object-contain bg-gray-50"
                  />
                  <div className="mt-2 line-clamp-2 text-xs font-bold text-gray-900">{rel.product.name}</div>
                  <div className="mt-1 text-sm font-black text-gray-900">{formatMoney(rel.priceMinor)}</div>
                  <div className="text-[10px] text-gray-400">/{rel.product.unit}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Fixed Bottom Action Bar with Add to Cart and Buy Now Buttons */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-8px_20px_rgba(0,0,0,0.12)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          {/* Price summary preview */}
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total ({effectiveQuantity} {product.product.unit}{effectiveQuantity > 1 ? "s" : ""})
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {formatMoney(totalPriceMinor)}
              </span>
              <span className="text-xs text-gray-400 line-through">
                {formatMoney(totalOriginalPriceMinor)}
              </span>
            </div>
          </div>

          {/* Action Buttons: Add to cart & Buy now (in Etukas Red) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => addToCart(product.id, effectiveQuantity)}
              disabled={isAdding || product.isDeliverable === false}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={16} />
              <span>{isAdding ? "Adding..." : "Add to cart"}</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isBuying || isAdding || product.isDeliverable === false}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-etukas-red px-5 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-black text-white shadow-md transition hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {product.isDeliverable === false ? "Out of range" : isBuying ? "Proceeding..." : "Buy now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
