import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, MapPin, Package, Search, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useCategories, useProducts, useStores } from "../../hooks/useMarketplace";
import { useMobileScrollState } from "../../hooks/useMobileScrollState";
import { formatMoney } from "../../lib/utils";

const iconMap = [Package, ShieldCheck, Truck, BadgeCheck];
const promoSlides = [
  {
    eyebrow: "ETUKAS BUILDING DAYS",
    title: "Build strong.\nSpend smart.",
    description: "Find trusted materials from nearby sellers.",
    className: "from-[#a90018] via-[#d51d32] to-[#f27a36]"
  },
  {
    eyebrow: "PROJECT READY",
    title: "Everything starts\nwith the right base.",
    description: "Explore cement, bricks, steel and more.",
    className: "from-[#14245c] via-[#2455a2] to-[#31a6bd]"
  },
  {
    eyebrow: "LOCAL STORES, EASY DISCOVERY",
    title: "Your next project\nstarts here.",
    description: "Browse products available around Hyderabad.",
    className: "from-[#262137] via-[#633d75] to-[#c14854]"
  }
] as const;

export function HomePage() {
  const isMobileScrolled = useMobileScrollState();
  const [activePromo, setActivePromo] = useState(0);
  const categories = useCategories();
  const products = useProducts();
  const stores = useStores();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePromo((current) => (current + 1) % promoSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main>
      <section className={`sticky z-30 mx-auto -mt-px max-w-7xl border-b border-gray-400/50 bg-white px-3 transition-[padding,top] duration-300 ease-in-out md:static md:mt-0 md:border-b-0 md:bg-transparent md:px-4 md:py-4 lg:px-6 ${isMobileScrolled ? "top-[39px] py-1" : "top-[145px] py-2"}`}>
        <div className={`flex justify-end md:mb-4 ${isMobileScrolled ? "hidden md:flex" : "mb-2"}`}>
          <Link to="/categories" className="inline-flex items-center gap-1 text-sm font-semibold text-etukas-red">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        <div className={`category-strip flex gap-3 overflow-x-auto md:grid md:grid-cols-5 md:gap-4 md:pb-2 lg:grid-cols-10 ${isMobileScrolled ? "pb-0 md:pb-2" : "pb-1"}`}>
          {categories.isLoading
            ? Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className={`${isMobileScrolled ? "h-16" : "h-20"} min-w-20 md:h-28 md:min-w-24`} />)
            : categories.data?.map((category, index) => {
                const Icon = iconMap[index % iconMap.length];
                return (
                  <Link key={category.id} to={`/products?category=${category.slug}`} className="group min-w-20 text-center md:min-w-24">
                    <div className={`mx-auto grid place-items-center rounded-full bg-etukas-pink text-etukas-black transition-[height,width] duration-300 ease-in-out group-hover:text-etukas-red md:h-16 md:w-16 ${isMobileScrolled ? "h-9 w-9 md:h-16 md:w-16" : "h-11 w-11 md:h-16 md:w-16"}`}>
                      <Icon size={20} className={`transform transition-transform duration-300 ease-in-out md:hidden ${isMobileScrolled ? "scale-[0.8]" : "scale-100"}`} />
                      <Icon size={28} className="hidden md:block" />
                    </div>
                    <div className="mt-1 text-[10px] font-semibold leading-tight md:mt-2 md:text-xs">{category.name}</div>
                  </Link>
                );
              })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-3 px-4 py-3 md:hidden">
        <div className={`relative isolate flex h-36 overflow-hidden rounded-xl bg-gradient-to-r ${promoSlides[activePromo].className} p-4 text-white shadow-sm`}>
          <div className="relative z-10 flex w-[62%] flex-col justify-center">
            <span className="text-[9px] font-bold tracking-[0.16em] text-white/80">{promoSlides[activePromo].eyebrow}</span>
            <h1 className="mt-1 whitespace-pre-line text-xl font-extrabold leading-tight">{promoSlides[activePromo].title}</h1>
            <p className="mt-1 text-[10px] leading-snug text-white/90">{promoSlides[activePromo].description}</p>
            <Link to="/products" className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-etukas-red">
              Explore products <ArrowRight size={12} />
            </Link>
          </div>
          <img
            src={products.data?.[activePromo % (products.data.length || 1)]?.product.images[0]?.url ?? "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80"}
            alt=""
            className="absolute inset-y-0 right-0 -z-0 h-full w-[48%] object-cover opacity-55 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
          />
          <div className="absolute bottom-2 right-3 z-10 flex gap-1.5" aria-label="Choose promotion">
            {promoSlides.map((slide, index) => (
              <button
                key={slide.eyebrow}
                type="button"
                aria-label={`Show promotion ${index + 1}`}
                aria-current={activePromo === index}
                onClick={() => setActivePromo(index)}
                className={`h-1.5 rounded-full transition-all ${activePromo === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
              />
            ))}
          </div>
        </div>

        <Link to="/products" className="flex min-h-[66px] items-center justify-between overflow-hidden rounded-xl bg-gradient-to-r from-[#9b1022] to-[#df3546] px-4 py-2 text-white shadow-sm">
          <div>
            <p className="text-[10px] font-semibold text-white/80">PLANNING A BIG PROJECT?</p>
            <p className="mt-0.5 text-sm font-extrabold">Explore bulk material deals</p>
          </div>
          <ArrowRight size={20} />
        </Link>

        <section className="overflow-hidden rounded-xl bg-gradient-to-br from-[#182ca2] to-[#365cf3] p-3 text-white shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Popular picks</h2>
            <Link to="/products" className="inline-flex items-center gap-1 text-[10px] font-semibold">See all <ArrowRight size={12} /></Link>
          </div>
          <div className="category-strip flex snap-x snap-mandatory gap-2 overflow-x-auto">
            {products.isLoading
              ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 min-w-28 bg-white/20" />)
              : products.data?.map((item) => (
                  <Link key={item.id} to={`/products?category=${item.product.category.slug}`} className="w-28 shrink-0 snap-start overflow-hidden rounded-lg bg-white text-etukas-black">
                    <img className="h-20 w-full bg-gray-100 object-cover" src={item.product.images[0]?.url} alt={item.product.images[0]?.altText ?? item.product.name} />
                    <div className="p-2">
                      <p className="truncate text-[10px] font-bold">{item.product.name}</p>
                      <p className="mt-0.5 text-[10px] font-extrabold text-etukas-red">{formatMoney(item.priceMinor)} <span className="font-medium text-gray-500">/{item.product.unit}</span></p>
                    </div>
                  </Link>
                ))}
          </div>
        </section>
      </section>

      <section className="hidden bg-etukas-black px-4 py-2 text-xs font-semibold text-white md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden">
          <span className="h-2 w-2 rounded-full bg-etukas-red" />
          Verified sellers, live stock checks, COD-ready checkout, and city-based discovery for Hyderabad demo data
        </div>
      </section>

      <section className="mx-auto hidden max-w-7xl gap-6 px-4 py-6 md:grid lg:grid-cols-[220px_1fr] lg:px-6">
        <aside className="hidden rounded-md border border-gray-100 p-3 lg:block">
          <h2 className="px-2 text-sm font-bold">Marketplace</h2>
          {["Products", "Workers and professionals", "Construction equipment", "Rentals", "Real estate", "Designs and services"].map((item) => (
            <Link key={item} to="/products" className="mt-1 block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-etukas-pink hover:text-etukas-red">
              {item}
            </Link>
          ))}
        </aside>

        <div className="overflow-hidden rounded-md bg-etukas-red text-white">
          <div className="grid min-h-[300px] gap-6 p-6 md:grid-cols-[1fr_0.9fr] md:p-10">
            <div className="flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-normal">Building materials marketplace</p>
              <h1 className="mt-3 max-w-xl text-4xl font-extrabold leading-tight md:text-6xl">Build Better. Buy Smarter.</h1>
              <p className="mt-4 max-w-lg text-base text-red-50 md:text-lg">Find trusted building material suppliers near you.</p>
              <div className="mt-6 flex max-w-xl flex-col gap-2 rounded-md bg-white p-2 sm:flex-row">
                <label className="relative flex-1">
                  <span className="sr-only">Search marketplace</span>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input className="h-11 w-full rounded-md border-0 pl-10 text-sm text-etukas-black outline-none" placeholder="Search cement, bricks, tiles..." />
                </label>
                <Button className="min-w-28">Search</Button>
              </div>
            </div>
            <div className="relative min-h-52 overflow-hidden rounded-md">
              <img className="h-full w-full object-cover" src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80" alt="Construction materials and building site" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:px-6">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Nearby Stores</h2>
            <Link to="/stores" className="text-sm font-semibold text-etukas-red">View All Stores</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stores.data?.map((store) => (
              <article key={store.id} className="rounded-md border border-gray-100 p-4">
                <span className="rounded bg-etukas-green px-2 py-1 text-xs font-bold text-white">In Stock</span>
                <h3 className="mt-3 font-bold">{store.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><MapPin size={15} /> {store.city}, {store.state}</p>
                <p className="mt-3 text-sm text-gray-700">Service radius {store.serviceRadiusKm} km</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 hidden items-center justify-between md:flex">
            <h2 className="text-xl font-extrabold">Popular Products</h2>
            <Link to="/products" className="text-sm font-semibold text-etukas-red">View Products</Link>
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
            {products.isLoading
              ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72" />)
              : products.data?.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-md border border-gray-100 bg-white">
                    <img className="h-36 w-full object-cover" src={item.product.images[0]?.url} alt={item.product.images[0]?.altText ?? item.product.name} />
                    <div className="p-4">
                      <span className="rounded bg-etukas-green px-2 py-1 text-xs font-bold text-white">In Stock</span>
                      <h3 className="mt-3 min-h-12 font-bold">{item.product.name}</h3>
                      <p className="text-sm text-gray-500">{item.store.name} • Delivery in {item.deliveryEta}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <strong>{formatMoney(item.priceMinor)} <span className="text-xs font-medium text-gray-500">/{item.product.unit}</span></strong>
                        <Button className="min-h-9 px-3">Add</Button>
                      </div>
                    </div>
                  </article>
                ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50 px-4 py-10">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {["Bulk pricing for large projects", "Trusted sellers and manufacturers", "Rental, real estate, and professionals modules ready to extend"].map((text) => (
            <div key={text} className="rounded-md bg-white p-5 text-sm font-semibold text-gray-800">
              {text}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
