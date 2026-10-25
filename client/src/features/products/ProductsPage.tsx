import { SlidersHorizontal } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useProducts } from "../../hooks/useMarketplace";
import { formatMoney } from "../../lib/utils";

const cementBrands = [
  {
    name: "Ramco",
    colors: "from-[#ffeb69] via-[#f7b234] to-[#e45426]",
    imageUrl: "https://d91ztqmtx7u1k.cloudfront.net/ClientContent/Images/ExtraLarge/ramco-super-grade-ppc-fly-ash-cement20240102112321.png"
  },
  { name: "Ultratech", colors: "from-[#ffe06a] via-[#f4bd27] to-[#a4831a]" },
  { name: "Deccan", colors: "from-[#f9fafb] via-[#e5e7eb] to-[#cfd5dc]" },
  { name: "KCP", colors: "from-[#fff06b] via-[#f7c737] to-[#ffffff]" },
  { name: "Nagarjuna", colors: "from-[#f9fafb] via-[#e5e7eb] to-[#c8d1dc]" },
  { name: "Sagar", colors: "from-[#f5f5f4] via-[#d6d3d1] to-[#a8a29e]" },
  { name: "Parasakti", colors: "from-[#f8e45c] via-[#e9bf23] to-[#d59b10]" },
  { name: "Penna", colors: "from-[#f8e55b] via-[#2563eb] to-[#1d4ed8]" },
  { name: "Raasi Gold", colors: "from-[#fbd34d] via-[#f59e0b] to-[#ef7d22]" },
  { name: "MAHA", colors: "from-[#fde047] via-[#facc15] to-[#eab308]" },
  { name: "Bharathi", colors: "from-[#f4f4f5] via-[#e4e4e7] to-[#a1a1aa]" },
  { name: "Birla Gold", colors: "from-[#ffe45c] via-[#f5b52b] to-[#d97706]" },
  { name: "Priya", colors: "from-[#f6d15d] via-[#e2a923] to-[#b7791f]" },
  { name: "Dalmia", colors: "from-[#f8d23c] via-[#1559b7] to-[#0f3e84]" },
  { name: "JSW Cement", colors: "from-[#f472b6] via-[#e11d48] to-[#be123c]" }
] as const;

function CementBag({ name, colors, imageUrl }: { name: string; colors: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <div className="mx-auto flex h-16 w-16 items-center justify-center">
        <img src={imageUrl} alt={`${name} cement bag`} className="h-16 w-16 object-contain" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-16 w-12 items-center justify-center rounded-sm bg-gray-100 shadow-sm">
      <div className={`relative h-14 w-10 rounded-[3px] bg-gradient-to-br ${colors} shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]`}>
        <div className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/55" />
        <div className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-black/10" />
        <div className="absolute left-1/2 top-1/2 w-8 -translate-x-1/2 -translate-y-1/2 rounded bg-white/75 px-0.5 py-1 text-center text-[7px] font-black leading-none text-etukas-black shadow-sm">
          {name.split(" ")[0]}
        </div>
      </div>
    </div>
  );
}

function CementBrandGrid() {
  return (
    <section className="mx-auto max-w-md bg-white px-3 pb-8 md:max-w-3xl">
      <div className="mb-3 border-b-2 border-gray-200 pb-2">
        <span className="inline-block border-b-2 border-etukas-red pr-10 text-base font-extrabold text-[#ff623d]">(! One bag =50kgs )</span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-5">
        {cementBrands.map((brand) => (
          <Link
            key={brand.name}
            to={`/products?category=cement&brand=${encodeURIComponent(brand.name.toLowerCase())}`}
            className="flex min-h-28 flex-col items-center justify-end border-b-2 border-gray-200 px-1 pb-2 text-center hover:bg-etukas-pink"
          >
            <CementBag name={brand.name} colors={brand.colors} imageUrl={"imageUrl" in brand ? brand.imageUrl : undefined} />
            <span className="mt-1 min-h-9 text-[15px] font-extrabold leading-tight text-black">{brand.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const products = useProducts({ category: category ?? undefined, pageSize: 24 });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      {category === "cement" ? <CementBrandGrid /> : null}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-extrabold">{category ? `${category.replace(/-/g, " ")} products` : "Products"}</h1>
          <p className="mt-2 text-gray-600">Compare live listings from nearby verified stores.</p>
        </div>
        <Button variant="secondary"><SlidersHorizontal size={18} /> Filters</Button>
      </div>
      {products.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-72" />)}
        </div>
      ) : products.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.data.map((item) => (
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
      ) : (
        <p className="rounded-md border border-gray-100 p-6 text-center text-gray-600">
          No products are currently listed{category ? " in this category" : ""}.
        </p>
      )}
    </main>
  );
}
