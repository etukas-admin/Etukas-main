import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProducts } from "../../hooks/useMarketplace";
import { ProductDetailsView } from "./ProductDetailsView";
import { getSelectedAddress, ADDRESS_CHANGE_EVENT } from "../location/locationStore";
import { Skeleton } from "../../components/ui/Skeleton";

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeAddress, setActiveAddress] = useState(getSelectedAddress);

  useEffect(() => {
    const handleAddressChange = () => setActiveAddress(getSelectedAddress());
    window.addEventListener(ADDRESS_CHANGE_EVENT, handleAddressChange);
    return () => window.removeEventListener(ADDRESS_CHANGE_EVENT, handleAddressChange);
  }, []);

  const products = useProducts({
    pageSize: 50,
    latitude: activeAddress?.latitude,
    longitude: activeAddress?.longitude,
  });

  const product = products.data?.find((item) => item.id === id);
  const relatedProducts = product
    ? (products.data ?? []).filter(
        (item) =>
          item.product.category?.slug === product.product.category?.slug &&
          item.id !== product.id
      )
    : [];

  if (products.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="h-14 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900">Product not found</h2>
        <p className="mt-2 text-sm text-gray-500">
          The requested product may not be available in your area or has been removed.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 rounded-xl bg-etukas-red px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-red-700"
        >
          &larr; Go Back
        </button>
      </div>
    );
  }

  return (
    <ProductDetailsView
      product={product}
      relatedProducts={relatedProducts}
      onBack={() => navigate(-1)}
      onSelectProduct={(newProduct) => navigate(`/product/${newProduct.id}`)}
    />
  );
}

