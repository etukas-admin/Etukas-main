import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { marketplaceApi, getProductImageUrl } from "../../services/api";
import { formatMoney } from "../../lib/utils";

export function CartPage() {
  const cart = useQuery({ queryKey: ["cart"], queryFn: marketplaceApi.cart, retry: false });
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold">Cart</h1>
      {cart.error ? (
        <div className="mt-6 rounded-md border border-gray-100 p-8 text-center">
          <ShoppingBag className="mx-auto text-gray-400" />
          <p className="mt-3 font-semibold">Sign in to view your cart.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <section className="space-y-3">
            {cart.data?.items.length === 0 ? <p className="rounded-md border border-gray-100 p-6 text-gray-600">Your cart is empty.</p> : null}
            {cart.data?.items.map((item) => (
              <article key={item.id} className="flex gap-4 rounded-md border border-gray-100 p-4">
                <img
                  className="h-20 w-20 rounded-md object-cover"
                  src={getProductImageUrl(item.storeProduct.product.images[0], item.storeProduct.product.id)}
                  alt={item.storeProduct.product.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80";
                  }}
                />
                <div className="flex-1">
                  <h2 className="font-bold">{item.storeProduct.product.name}</h2>
                  <p className="text-sm text-gray-500">{item.storeProduct.store.name}</p>
                  <p className="mt-2 text-sm">Qty {item.quantity}</p>
                </div>
                <strong>{formatMoney(item.storeProduct.priceMinor * item.quantity)}</strong>
              </article>
            ))}
          </section>
          <aside className="h-fit rounded-md border border-gray-100 p-5">
            <h2 className="font-bold">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex justify-between"><span>Subtotal</span><span>{formatMoney(cart.data?.totals.subtotalMinor ?? 0)}</span></p>
              <p className="flex justify-between"><span>Tax</span><span>{formatMoney(cart.data?.totals.taxMinor ?? 0)}</span></p>
              <p className="flex justify-between font-bold"><span>Total</span><span>{formatMoney(cart.data?.totals.totalMinor ?? 0)}</span></p>
            </div>
            <Button className="mt-5 w-full">Checkout</Button>
          </aside>
        </div>
      )}
    </main>
  );
}
