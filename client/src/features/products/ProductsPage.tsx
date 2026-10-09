import { SlidersHorizontal } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useProducts } from "../../hooks/useMarketplace";
import { formatMoney } from "../../lib/utils";

export function ProductsPage() {
  const products = useProducts();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-extrabold">Products</h1>
          <p className="mt-2 text-gray-600">Compare live listings from nearby verified stores.</p>
        </div>
        <Button variant="secondary"><SlidersHorizontal size={18} /> Filters</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.isLoading
          ? Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-72" />)
          : products.data?.map((item) => (
              <article key={item.id} className="rounded-md border border-gray-100">
                <img className="h-40 w-full rounded-t-md object-cover" src={item.product.images[0]?.url} alt={item.product.name} />
                <div className="p-4">
                  <h2 className="font-bold">{item.product.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">{item.store.name}</p>
                  <p className="mt-2 text-sm text-gray-600">MOQ {item.minOrderQuantity} {item.product.unit} • Stock {item.stockQuantity}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <strong>{formatMoney(item.priceMinor)}</strong>
                    <Button className="min-h-9 px-3">Add</Button>
                  </div>
                </div>
              </article>
            ))}
      </div>
    </main>
  );
}
