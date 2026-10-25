import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, MapPin, Package, Search, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useProducts, useStores } from "../../hooks/useMarketplace";
import { useMobileScrollState } from "../../hooks/useMobileScrollState";
import { FlashDealsCarousel } from "./FlashDealsCarousel";
import { BuildingSuppliesGrid } from "./BuildingSuppliesGrid";
import { marketplaceApi } from "../../services/api";

const homeCategories = [
  { name: "Bricks and blocks", slug: "bricks-blocks", icon: Package },
  { name: "Cement", slug: "cement", icon: ShieldCheck },
  { name: "Cement poles", slug: "cement-poles", icon: Truck },
  { name: "Construction machinery", slug: "construction-machinery", icon: BadgeCheck },
  { name: "Electrical materials", slug: "electrical-materials", icon: Package },
  { name: "Paints", slug: "paints", icon: ShieldCheck },
  { name: "Plumbing", slug: "plumbing", icon: Truck },
  { name: "Sand and aggregates", slug: "sand-aggregates", icon: BadgeCheck },
  { name: "Steel and iron bars", slug: "steel-iron-bars", icon: Package },
  { name: "Tiles and flooring", slug: "tiles-flooring", icon: ShieldCheck }
] as const;

const defaultPromoSlides = [
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
  const products = useProducts({ pageSize: 24 });
  const stores = useStores();
  const banners = useQuery({ queryKey: ["home", "banners"], queryFn: marketplaceApi.publicBanners });
  const promoSlides = banners.data?.length ? banners.data : defaultPromoSlides;
  const slideCount = promoSlides.length;
  const activeIndex = activePromo % slideCount;
  const currentPromo = promoSlides[activeIndex];
  const currentLink = "linkUrl" in currentPromo ? currentPromo.linkUrl : undefined;
  const promoLink = currentLink?.startsWith("/") && !currentLink.startsWith("//") ? currentLink : "/products";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePromo((current) => (current + 1) % slideCount);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [slideCount]);

  return (
    <main>
      <section className={`sticky z-30 mx-auto -mt-px max-w-7xl border-b border-gray-400/50 bg-white px-3 transition-[padding,top] duration-300 ease-in-out md:static md:mt-0 md:border-b-0 md:bg-transparent md:px-4 md:py-4 lg:px-6 ${isMobileScrolled ? "top-[39px] py-1" : "top-[145px] py-2"}`}>
        <div className={`flex justify-end md:mb-4 ${isMobileScrolled ? "hidden md:flex" : "mb-2"}`}>
          <Link to="/categories" className="inline-flex items-center gap-1 text-sm font-semibold text-etukas-red">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        <div className={`category-strip flex gap-3 overflow-x-auto md:grid md:grid-cols-5 md:gap-4 md:pb-2 lg:grid-cols-10 ${isMobileScrolled ? "pb-0 md:pb-2" : "pb-1"}`}>
          {homeCategories.map(({ name, slug, icon: Icon }) => (
            <Link key={slug} to={`/products?category=${slug}`} className="group min-w-20 text-center md:min-w-24">
              <div className={`mx-auto grid place-items-center rounded-full bg-etukas-pink text-etukas-black transition-[height,width] duration-300 ease-in-out group-hover:text-etukas-red md:h-16 md:w-16 ${isMobileScrolled ? "h-9 w-9 md:h-16 md:w-16" : "h-11 w-11 md:h-16 md:w-16"}`}>
                <Icon size={20} className={`transform transition-transform duration-300 ease-in-out md:hidden ${isMobileScrolled ? "scale-[0.8]" : "scale-100"}`} />
                <Icon size={28} className="hidden md:block" />
              </div>
              <div className="mt-1 text-[10px] font-semibold leading-tight md:mt-2 md:text-xs">{name}</div>
            </Link>
          ))}
        </div>
      </section>

      {banners.isError ? <p className="sr-only" role="status">Homepage promotions could not be refreshed; default promotions are shown.</p> : null}

      <section className="mx-auto max-w-7xl space-y-3 px-4 py-3 md:hidden">
        <div className={`relative isolate flex h-36 overflow-hidden rounded-xl bg-gradient-to-r ${"className" in currentPromo ? currentPromo.className : "from-[#a90018] via-[#d51d32] to-[#f27a36]"} p-4 text-white shadow-sm`}>
          <div className="relative z-10 flex w-[62%] flex-col justify-center">
            <span className="text-[9px] font-bold tracking-[0.16em] text-white/80">{currentPromo.eyebrow}</span>
            <h1 className="mt-1 whitespace-pre-line text-xl font-extrabold leading-tight">{currentPromo.title}</h1>
            <p className="mt-1 text-[10px] leading-snug text-white/90">{currentPromo.description}</p>
            <Link to={promoLink} className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-etukas-red">
              Explore products <ArrowRight size={12} />
            </Link>
          </div>
          <img
            src={("imageUrl" in currentPromo ? currentPromo.mobileImageUrl || currentPromo.imageUrl : undefined) ?? products.data?.[activeIndex % (products.data.length || 1)]?.product.images[0]?.url ?? "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80"}
            alt={"imageUrl" in currentPromo ? currentPromo.title : ""}
            className="absolute inset-y-0 right-0 -z-0 h-full w-[48%] object-cover opacity-55 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
          />
          <div className="absolute bottom-2 right-3 z-10 flex gap-1.5" aria-label="Choose promotion">
            {promoSlides.map((slide, index) => (
              <button key={slide.eyebrow + index} type="button" aria-label={`Show promotion ${index + 1}`} aria-current={activeIndex === index} onClick={() => setActivePromo(index)} className={`h-1.5 rounded-full transition-all ${activeIndex === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
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
      </section>

      <section className="hidden bg-etukas-black px-4 py-2 text-xs font-semibold text-white md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden">
          <span className="h-2 w-2 rounded-full bg-etukas-red" />
          Verified sellers, live yard stock checks, COD-ready checkout, and city-based discovery for Hyderabad
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
              <p className="text-xs font-bold uppercase tracking-normal">{banners.data?.length ? currentPromo.eyebrow : "Building materials marketplace"}</p>
              <h1 className="mt-3 max-w-xl whitespace-pre-line text-4xl font-extrabold leading-tight md:text-6xl">{banners.data?.length ? currentPromo.title : "Build Better. Buy Smarter."}</h1>
              <p className="mt-4 max-w-lg text-base text-red-50 md:text-lg">{banners.data?.length ? currentPromo.description : "Find trusted building material suppliers near you."}</p>
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
              <img className="h-full w-full object-cover" src={"imageUrl" in currentPromo ? currentPromo.imageUrl : "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80"} alt={"imageUrl" in currentPromo ? currentPromo.title : "Construction materials and building site"} />
            </div>
          </div>
        </div>
      </section>

      {/* 1. Horizontal Side-Scroll Product Grid (Carousel) */}
      <FlashDealsCarousel products={products.data} isLoading={products.isLoading} />

      {/* Nearby Stores Section */}
      <section className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl">Nearby Stores & Yards</h2>
            <p className="text-xs text-gray-500 sm:text-sm">Verified suppliers in your area with fast local fulfillment</p>
          </div>
          <Link to="/stores" className="text-xs font-bold text-etukas-red sm:text-sm hover:underline">View All Stores &rarr;</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {stores.data?.map((store) => (
            <article key={store.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="rounded bg-etukas-green/10 px-2 py-0.5 text-xs font-bold text-etukas-green">Verified Yard</span>
                <span className="text-[11px] text-gray-400">Radius {store.serviceRadiusKm} km</span>
              </div>
              <h3 className="mt-3 font-bold text-gray-900">{store.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><MapPin size={13} className="text-etukas-red shrink-0" /> {store.city}, {store.state}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 2. Vertical Blocks Grid (Multi-Column Grid) */}
      <BuildingSuppliesGrid products={products.data} isLoading={products.isLoading} />

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
