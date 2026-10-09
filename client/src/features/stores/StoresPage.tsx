import { MapPin } from "lucide-react";
import { useStores } from "../../hooks/useMarketplace";

export function StoresPage() {
  const stores = useStores();
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="text-3xl font-extrabold">Nearby Stores</h1>
      <p className="mt-2 text-gray-600">Location discovery works without a paid map provider in the MVP.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {stores.data?.map((store) => (
          <article key={store.id} className="rounded-md border border-gray-100 p-5">
            <h2 className="text-lg font-bold">{store.name}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-600"><MapPin size={16} /> {store.city}, {store.state}</p>
            <p className="mt-3 text-sm">Seller status: <strong>{store.sellerProfile?.verificationStatus ?? "PENDING"}</strong></p>
          </article>
        ))}
      </div>
    </main>
  );
}
