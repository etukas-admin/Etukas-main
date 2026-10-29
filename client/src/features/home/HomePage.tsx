import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useProducts, useStores } from "../../hooks/useMarketplace";
import { useMobileScrollState } from "../../hooks/useMobileScrollState";
import { FlashDealsCarousel } from "./FlashDealsCarousel";
import { BuildingSuppliesGrid } from "./BuildingSuppliesGrid";
import { TechniciansGrid } from "./TechniciansGrid";
import { MachineryGrid } from "./MachineryGrid";
import { marketplaceApi, getProductImageUrl } from "../../services/api";
import type { AdBannerImage } from "../../services/api";
import {
  BricksBlocksIcon,
  CementIcon,
  IronBarsIcon,
  SandIcon,
  StoneAggregateIcon,
  TilesMarblesIcon,
  PaintsIcon,
  PlumbingIcon,
  ElectricalsIcon,
  StatuesIcon,
  CementArticlesIcon,
} from "../../components/icons/CategoryIcons";

type HomeCategory = {
  name: string;
  slug: string;
  image: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  bg: string;
};

const homeCategories: readonly HomeCategory[] = [
  {
    name: "Bricks & Blocks",
    slug: "bricks-blocks",
    image: "/images/pngimages/bricks-blocks.webp",
    icon: BricksBlocksIcon,
    bg: "from-orange-50 to-amber-100/70 border-orange-200/60",
  },
  {
    name: "Cement",
    slug: "cement",
    image: "/images/pngimages/cement.webp",
    icon: CementIcon,
    bg: "from-red-50 to-rose-100/70 border-red-200/60",
  },
  {
    name: "Iron Bars",
    slug: "steel-iron-bars",
    image: "/images/pngimages/steel-iron-bars.webp",
    icon: IronBarsIcon,
    bg: "from-sky-50 to-blue-100/70 border-blue-200/60",
  },
  {
    name: "Sand",
    slug: "sand-aggregates",
    image: "/images/pngimages/sand.webp",
    icon: SandIcon,
    bg: "from-amber-50 to-yellow-100/70 border-amber-200/60",
  },
  {
    name: "Stone / Aggregate",
    slug: "sand-aggregates",
    image: "/images/pngimages/stone-aggregates.webp",
    icon: StoneAggregateIcon,
    bg: "from-stone-100 to-slate-200/70 border-stone-300/60",
  },
  {
    name: "Tiles/Marbles",
    slug: "tiles-flooring",
    image: "/images/pngimages/tiles-flooring.webp",
    icon: TilesMarblesIcon,
    bg: "from-teal-50 to-emerald-100/70 border-teal-200/60",
  },
  {
    name: "Paints",
    slug: "paints",
    image: "/images/pngimages/paints.webp",
    icon: PaintsIcon,
    bg: "from-pink-50 to-rose-100/70 border-pink-200/60",
  },
  {
    name: "Plumbing",
    slug: "plumbing",
    image: "/images/pngimages/plumbing.webp",
    icon: PlumbingIcon,
    bg: "from-cyan-50 to-sky-100/70 border-cyan-200/60",
  },
  {
    name: "Electricals",
    slug: "electrical-materials",
    image: "/images/pngimages/electrical-materials.webp",
    icon: ElectricalsIcon,
    bg: "from-yellow-50 to-amber-100/80 border-yellow-200/70",
  },
  {
    name: "Cement Articles",
    slug: "cement-poles",
    image: "/images/pngimages/cement-articles.webp",
    icon: CementArticlesIcon,
    bg: "from-slate-50 to-gray-200/70 border-slate-300/60",
  },
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

function AdBannerDisplay({ images, section, className, autoSlide = false }: { images: AdBannerImage[]; section: number; className: string; autoSlide?: boolean }) {
  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    if (!autoSlide || images.length < 2) {
      setActiveSlide(0);
      return;
    }
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % images.length), 4500);
    return () => window.clearInterval(timer);
  }, [autoSlide, images.length]);

  if (!images.length) return null;
  if (autoSlide) {
    return (
      <div className={`mx-auto ${className}`} aria-label={`Homepage ad banners, section ${section}`}>
        <div className="relative h-full overflow-hidden rounded-2xl bg-gray-100">
          <div className="flex h-full transition-transform duration-700 ease-in-out motion-reduce:transition-none" style={{ width: `${images.length * 100}%`, transform: `translateX(-${activeSlide * (100 / images.length)}%)` }}>
            {images.map((image) => (
              <Link key={image.id} to="/products" style={{ width: `${100 / images.length}%` }} className="relative block h-full flex-none overflow-hidden rounded-2xl">
                <img src={image.imageUrl} alt={`Sponsored banner ${image.bannerNumber}`} className="h-full w-full rounded-2xl object-contain" />
                <span className="absolute right-3 top-3 rounded bg-black/55 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">AD</span>
              </Link>
            ))}
          </div>
        </div>
        {images.length > 1 ? (
          <div className="mt-2 flex h-2 items-center justify-center gap-1.5" aria-label="Choose spotlight banner">
            {images.map((image, index) => (
              <button key={image.id} type="button" aria-label={`Show spotlight banner ${image.bannerNumber}`} aria-current={index === activeSlide} onClick={() => setActiveSlide(index)} className={`h-1.5 rounded-full transition-all ${index === activeSlide ? "w-8 bg-black" : "w-5 bg-gray-300"}`} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex snap-x snap-mandatory gap-3 overflow-x-auto ${className}`} aria-label={`Homepage ad banners, section ${section}`}>
      {images.map((image) => (
        <Link key={image.id} to="/products" className="relative flex h-full w-full flex-none snap-center items-center justify-center overflow-hidden rounded-2xl bg-gray-50">
          <img src={image.imageUrl} alt={`Sponsored banner ${image.bannerNumber}`} className="h-full w-full object-contain" />
          <span className="absolute right-3 top-3 rounded bg-black/55 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">AD</span>
        </Link>
      ))}
    </div>
  );
}

export function HomePage() {
  const isMobileScrolled = useMobileScrollState();
  const [activePromo, setActivePromo] = useState(0);
  const products = useProducts({ pageSize: 24 });
  const stores = useStores();
  const banners = useQuery({ queryKey: ["home", "banners"], queryFn: marketplaceApi.publicBanners });
  const adBanners = useQuery({ queryKey: ["home", "ad-banners"], queryFn: marketplaceApi.publicAdBanners });
  const sectionOneAds = adBanners.data?.filter((banner) => banner.section === 1) ?? [];
  const sectionTwoAds = adBanners.data?.filter((banner) => banner.section === 2) ?? [];
  const sectionThreeAds = adBanners.data?.filter((banner) => banner.section === 3) ?? [];
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
        <div className={`category-strip flex gap-3 overflow-x-auto px-0.5 md:grid md:grid-cols-5 md:gap-4 md:pb-2 lg:grid-cols-10 ${isMobileScrolled ? "pb-0 md:pb-2" : "pb-1.5"}`}>
          {homeCategories.map(({ name, slug, image, icon: Icon, bg }) => (
            <Link
              key={name + slug}
              to={`/products?category=${slug}`}
              className="group flex min-w-[74px] flex-col items-center text-center transition-transform md:min-w-[84px]"
            >
              <div
                className={`relative mx-auto flex items-center justify-center transition-all duration-300 ease-out group-hover:-translate-y-1 active:scale-95 ${
                  isMobileScrolled
                    ? "h-11 w-11 md:h-16 md:w-16"
                    : "h-16 w-16 md:h-20 md:w-20"
                }`}
              >
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="h-full w-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
                    loading="eager"
                  />
                ) : (
                  <Icon
                    size={isMobileScrolled ? 34 : 52}
                    className="transition-transform duration-300 drop-shadow-sm group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-1.5 line-clamp-2 max-w-[76px] text-center text-[11px] font-bold leading-tight text-gray-900 transition-colors group-hover:text-etukas-red md:max-w-[88px] md:text-xs">
                {name}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {banners.isError ? <p className="sr-only" role="status">Homepage promotions could not be refreshed; default promotions are shown.</p> : null}

      <section className={`mx-auto max-w-7xl space-y-3 px-4 py-3 md:hidden ${sectionOneAds.length ? "hidden" : ""}`}>
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
            src={
              ("imageUrl" in currentPromo ? currentPromo.mobileImageUrl || currentPromo.imageUrl : undefined) ??
              getProductImageUrl(
                products.data?.[activeIndex % (products.data.length || 1)]?.product.images[0],
                products.data?.[activeIndex % (products.data.length || 1)]?.product.id,
                "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80"
              )
            }
            alt={"imageUrl" in currentPromo ? currentPromo.title : ""}
            className="absolute inset-y-0 right-0 -z-0 h-full w-[48%] object-cover opacity-55 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80";
            }}
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

      {sectionOneAds.length ? <section className="mx-auto max-w-7xl px-4 py-3 md:hidden"><AdBannerDisplay images={sectionOneAds} section={1} className="h-36" /></section> : null}

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

        <div className={`${sectionOneAds.length ? "hidden" : ""} overflow-hidden rounded-md bg-etukas-red text-white`}>
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
        {sectionOneAds.length ? <AdBannerDisplay images={sectionOneAds} section={1} className="h-[300px] w-full" /> : null}
      </section>

      {/* 1. Horizontal Side-Scroll Product Grid (Carousel) */}
      <FlashDealsCarousel products={products.data} isLoading={products.isLoading} />

      {/* 2. Technicians & Professionals Grid (Flipkart-style) */}
      <TechniciansGrid />

      {/* Machine Vehicles Service Grid */}
      <MachineryGrid />

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

      {/* In the Spotlight sponsored banner */}
      <section className="mx-auto max-w-7xl px-4 py-4 lg:px-6" aria-labelledby="spotlight-heading">
        <h2 id="spotlight-heading" className="mb-4 text-xl font-extrabold text-gray-900 sm:text-2xl">In the spotlight</h2>
        {sectionTwoAds.length ? (
          <AdBannerDisplay images={sectionTwoAds} section={2} autoSlide className="h-[190px] max-w-5xl sm:h-[240px] lg:h-[280px]" />
        ) : (
          <Link to={promoLink} className="group relative mx-auto flex h-[190px] max-w-5xl items-center justify-center overflow-hidden rounded-2xl bg-yellow-300 shadow-sm sm:h-[240px] lg:h-[280px]" aria-label={`Sponsored: ${currentPromo.title}`}>
            <img
              src="/images/AdBannerImages/ultratech-banner.png"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "imageUrl" in currentPromo
                  ? currentPromo.imageUrl
                  : "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=85";
              }}
              alt="UltraTech Cement: Strong foundations for a better tomorrow"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
            <span className="absolute right-3 top-3 rounded bg-black/55 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">AD</span>
          </Link>
        )}
      </section>

      {/* 3. Vertical Blocks Grid (Multi-Column Grid) */}
      <BuildingSuppliesGrid products={products.data} isLoading={products.isLoading} />

      {sectionThreeAds.length ? <section className="mx-auto max-w-7xl px-4 py-4 lg:px-6"><AdBannerDisplay images={sectionThreeAds} section={3} className="h-[190px] sm:h-[240px] lg:h-[280px]" /></section> : null}

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
