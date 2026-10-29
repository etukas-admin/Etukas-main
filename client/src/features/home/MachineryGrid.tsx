import { Link } from "react-router-dom";
import { ArrowRight, Tractor } from "lucide-react";

/**
 * Machinery / Vehicle Service categories in Flipkart-style product grid
 * with background color #c7c5c5, increased sizing compared to TechniciansGrid,
 * and high-resolution WebP images.
 */

const machineryServices = [
  {
    name: "JCB",
    slug: "jcb",
    image: "/images/machinery/jcb.webp?v=1",
    tagline: "Excavation & Loading",
  },
  {
    name: "Borewell",
    slug: "borewell",
    image: "/images/machinery/borewell.webp?v=1",
    tagline: "Drilling & Rig Works",
  },
  {
    name: "RMC",
    slug: "rmc",
    image: "/images/machinery/rmc.webp?v=1",
    tagline: "Ready-Mix Concrete",
  },
  {
    name: "Concrete Mixer",
    slug: "concrete-mixer",
    image: "/images/machinery/concrete-mixer.webp?v=1",
    tagline: "Batching & Site Mixing",
  },
  {
    name: "Blade Tractor",
    slug: "blade-tractor",
    image: "/images/machinery/blade-tractor.webp?v=1",
    tagline: "Grading & Land Leveling",
  },
  {
    name: "Road Roller",
    slug: "road-roller",
    image: "/images/machinery/road-roller.webp?v=1",
    tagline: "Road Work & Compaction",
  },
  {
    name: "Big Roller",
    slug: "big-roller",
    image: "/images/machinery/big-roller.webp?v=1",
    tagline: "Soil & Heavy Compaction",
  },
  {
    name: "Small Cranes",
    slug: "small-cranes",
    image: "/images/machinery/small-cranes.webp?v=1",
    tagline: "Hydra & Material Lifting",
  },
] as const;

export function MachineryGrid() {
  return (
    <section className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-5 lg:px-6">
      {/* Container with #c7c5c5 background */}
      <div className="overflow-hidden rounded-2xl bg-[#c7c5c5] p-3 shadow-sm sm:p-4 md:p-5">
        {/* Header bar */}
        <div className="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-sm shadow-inner sm:h-9 sm:w-9">
              <Tractor size={19} className="text-gray-900" />
            </span>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-gray-900 sm:text-lg">
                Machinery / Vehicle Service
              </h2>
              <p className="text-[11px] font-medium text-gray-800 sm:text-xs leading-tight">
                Hire heavy equipment & construction vehicles for your site
              </p>
            </div>
          </div>
          <Link
            to="/products?category=machinery"
            className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-etukas-red shadow-sm transition-all hover:bg-gray-50 active:scale-95 sm:text-sm"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {/* Scrollable grid strip on mobile, 4-column layout on medium+ screens */}
        <div className="flex gap-3 overflow-x-auto pb-2 pt-2 sm:gap-4 no-scrollbar md:grid md:grid-cols-4 md:overflow-visible">
          {machineryServices.map((item) => (
            <Link
              key={item.slug}
              to={`/products?category=${item.slug}`}
              className="group flex min-w-[150px] max-w-[185px] flex-1 flex-col items-center justify-between rounded-xl bg-white p-3 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 sm:min-w-0 sm:max-w-none sm:p-3.5"
            >
              {/* Image container: increased size, clean aspect ratio */}
              <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-white p-1.5 transition-transform duration-200 group-hover:scale-105">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-110"
                  loading="lazy"
                />
              </div>

              {/* Title & Tagline */}
              <div className="mt-2 w-full">
                <span className="line-clamp-1 w-full text-xs font-extrabold text-gray-900 transition-colors group-hover:text-etukas-red sm:text-sm">
                  {item.name}
                </span>
                <span className="mt-0.5 block line-clamp-1 text-[10px] font-medium text-gray-500 sm:text-[11px]">
                  {item.tagline}
                </span>
              </div>

              {/* Increased size Book Service button in Etukas Red */}
              <span className="mt-2.5 inline-flex items-center justify-center rounded-full bg-etukas-red px-3 py-1 text-[10px] font-bold text-white shadow-xs transition-all duration-150 group-hover:brightness-110 sm:text-[11px]">
                Book Service
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
