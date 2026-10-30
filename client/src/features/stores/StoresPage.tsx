import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MapPin, Store as StoreIcon, Truck } from "lucide-react";
import { useStores } from "../../hooks/useMarketplace";
import { ADDRESS_CHANGE_EVENT, getSelectedAddress } from "../location/locationStore";

export function StoresPage() {
  const [address, setAddress] = useState(getSelectedAddress);
  const stores = useStores({ city: address.city || address.district });

  useEffect(() => {
    const handleAddressChange = () => setAddress(getSelectedAddress());
    window.addEventListener(ADDRESS_CHANGE_EVENT, handleAddressChange);
    return () => window.removeEventListener(ADDRESS_CHANGE_EVENT, handleAddressChange);
  }, []);

  const scopeLabel =
    address.pricingScope === "district"
      ? `${address.district || "District"} Wholesale Stores`
      : `${address.city} 25 km Radius Stores`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      {/* Location Banner */}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center rounded-2xl bg-gradient-to-r from-etukas-pink/80 via-white to-etukas-pink/40 border border-etukas-red/20 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-etukas-red text-white shadow-sm">
            <StoreIcon size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-etukas-red">
                Store Location Active
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-gray-700 border border-gray-200">
                {scopeLabel}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-900 mt-0.5">
              Verified suppliers delivering to: <strong className="text-etukas-black font-extrabold">{address.city || address.line1}</strong>
              {address.district && address.district !== address.city && (
                <span className="text-gray-500 font-medium"> ({address.district} Dist.)</span>
              )}
            </p>
          </div>
        </div>

        <Link
          to="/location"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-etukas-red px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow self-start sm:self-auto shrink-0"
        >
          <MapPin size={14} />
          <span>Change Location</span>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold">Nearby Verified Stores</h1>
        <p className="mt-1 text-sm text-gray-600">
          Showing verified material suppliers, dealers, and depots serving {address.city || "your area"}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stores.data?.map((store) => (
          <article key={store.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-etukas-red/40 hover:shadow-md transition">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-extrabold text-gray-900">{store.name}</h2>
              {store.sellerProfile?.verificationStatus === "APPROVED" && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                  <CheckCircle2 size={11} /> VERIFIED
                </span>
              )}
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin size={14} className="text-etukas-red shrink-0" />
              <span>{store.city}, {store.state}</span>
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Truck size={13} className="text-stone-700" />
                <span>Radius: {store.serviceRadiusKm ?? 25} km</span>
              </span>
              <Link
                to={`/products?q=${encodeURIComponent(store.name)}`}
                className="font-bold text-etukas-red hover:underline"
              >
                View Products →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
