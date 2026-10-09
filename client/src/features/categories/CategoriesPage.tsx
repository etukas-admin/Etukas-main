import { ArrowLeft, Search, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const categoryRail = [
  {
    name: "For You",
    href: "/categories",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=160&q=80"
  },
  {
    name: "Cement",
    href: "/products?category=cement",
    image: "https://d91ztqmtx7u1k.cloudfront.net/ClientContent/Images/ExtraLarge/ramco-super-grade-ppc-fly-ash-cement20240102112321.png"
  },
  {
    name: "Bricks",
    href: "/products?category=bricks-blocks",
    image: "https://images.unsplash.com/photo-1585369916121-02ad6b595198?auto=format&fit=crop&w=160&q=80"
  },
  {
    name: "Tiles",
    href: "/products?category=tiles-flooring",
    image: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=160&q=80"
  },
  {
    name: "Paints",
    href: "/products?category=paints",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=160&q=80"
  },
  {
    name: "Electrical",
    href: "/products?category=electrical-materials",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=160&q=80"
  },
  {
    name: "Machinery",
    href: "/products?category=construction-machinery",
    image: "https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?auto=format&fit=crop&w=160&q=80"
  }
] as const;

const popularStores = [
  {
    name: "Live now",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=220&q=80"
  },
  {
    name: "Builder Luxe",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=220&q=80"
  },
  {
    name: "Value 365",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=220&q=80"
  },
  {
    name: "Fast delivery",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=220&q=80"
  }
] as const;

const launches = [
  {
    name: "Ramco cement",
    badge: "BUY NOW",
    image: "https://d91ztqmtx7u1k.cloudfront.net/ClientContent/Images/ExtraLarge/ramco-super-grade-ppc-fly-ash-cement20240102112321.png"
  },
  {
    name: "Smart fittings",
    badge: "SALE IS LIVE",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=220&q=80"
  },
  {
    name: "Door locks",
    badge: "BUY NOW",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=220&q=80"
  },
  {
    name: "Premium paint",
    badge: "BUY NOW",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=220&q=80"
  },
  {
    name: "Bathroom set",
    badge: "SALE IS LIVE",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=220&q=80"
  },
  {
    name: "Wall tiles",
    badge: "BUY NOW",
    image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=220&q=80"
  }
] as const;

export function CategoriesPage() {
  return (
    <main className="min-h-screen bg-[#f7eef2] pb-16 md:bg-white">
      <div className="mx-auto min-h-screen max-w-md bg-white md:max-w-5xl">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-gray-100 bg-white px-4">
          <Link to="/" aria-label="Back to home" className="focus-ring rounded-md p-1">
            <ArrowLeft size={23} />
          </Link>
          <h1 className="flex-1 text-lg font-medium text-black">All Categories</h1>
          <button className="focus-ring rounded-md p-1" aria-label="Search categories">
            <Search size={22} />
          </button>
          <Link to="/cart" aria-label="Cart" className="focus-ring rounded-md p-1">
            <ShoppingCart size={22} />
          </Link>
        </header>

        <div className="grid grid-cols-[104px_1fr] md:grid-cols-[132px_1fr]">
          <aside className="sticky top-14 h-[calc(100vh-7.5rem)] overflow-y-auto border-r border-gray-100 bg-gray-50">
            {categoryRail.map((category, index) => {
              const active = index === 0;
              return (
                <Link key={category.name} to={category.href} className={`relative flex min-h-[86px] flex-col items-center justify-center border-b border-gray-200 px-2 text-center ${active ? "bg-white text-[#2258ff]" : "text-[#6b83a7]"}`}>
                  {active ? <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-[#2258ff]" /> : null}
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm">
                    <img src={category.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <span className="mt-1 text-[11px] font-bold leading-tight">{category.name}</span>
                </Link>
              );
            })}
          </aside>

          <section className="min-w-0 px-3 py-5 md:px-6">
            <h2 className="text-base font-extrabold text-black">Popular Store</h2>
            <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5">
              {popularStores.map((store) => (
                <Link key={store.name} to="/stores" className="text-center">
                  <img src={store.image} alt="" className="mx-auto h-20 w-20 rounded-2xl bg-gray-100 object-cover md:h-24 md:w-24" />
                  <span className="mt-2 block text-[11px] font-semibold leading-tight text-black md:text-xs">{store.name}</span>
                </Link>
              ))}
            </div>

            <h2 className="mt-8 text-base font-extrabold text-black">New & Upcoming Launches</h2>
            <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5 md:gap-x-4">
              {launches.map((item) => (
                <Link key={item.name} to="/products" className="text-center">
                  <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-2xl bg-gray-100 md:h-24 md:w-24">
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 bg-[#078765] px-1 py-0.5 text-[10px] font-black leading-none text-white">{item.badge}</span>
                  </div>
                  <span className="mt-1 block text-[11px] font-semibold leading-tight text-black md:text-xs">{item.name}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
