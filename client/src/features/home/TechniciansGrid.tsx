import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Professional / technician categories in Flipkart-style product grid
 * with background color #faa6a5, compact mobile sizing, distinct mascots,
 * Civil Engineer option, and reduced-size Book Service button in Etukas Red.
 */

const professionals = [
  {
    name: "Plumber",
    slug: "plumber",
    image: "/images/technicians/plumber.webp?v=2",
    tagline: "Pipes & Taps",
  },
  {
    name: "Painter",
    slug: "painter",
    image: "/images/technicians/painter.webp?v=2",
    tagline: "Home Painting",
  },
  {
    name: "Electrician",
    slug: "electrician",
    image: "/images/technicians/electrician.webp?v=2",
    tagline: "Wiring & Power",
  },
  {
    name: "Mason Worker",
    slug: "mason-worker",
    image: "/images/technicians/mason-worker.webp?v=3",
    tagline: "Civil & Bricks",
  },
  {
    name: "Welder",
    slug: "welder",
    image: "/images/technicians/welder.webp?v=2",
    tagline: "Grills & Gates",
  },
  {
    name: "Carpenter",
    slug: "carpenter",
    image: "/images/technicians/carpenter.webp?v=2",
    tagline: "Wood & Furniture",
  },
  {
    name: "Civil Engineer",
    slug: "civil-engineer",
    image: "/images/technicians/civil-engineer.webp?v=1",
    tagline: "Site Plans & Design",
  },
  {
    name: "Others",
    slug: "others",
    image: "/images/technicians/others.webp?v=5",
    tagline: "Site & Heavy Work",
  },
] as const;

export function TechniciansGrid() {
  return (
    <section className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-5 lg:px-6">
      {/* Container with #faa6a5 background */}
      <div className="overflow-hidden rounded-2xl bg-[#faa6a5] p-2.5 shadow-sm sm:p-3.5">
        {/* Header bar */}
        <div className="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/40 text-sm shadow-inner sm:h-8 sm:w-8">
              <Sparkles size={16} className="text-red-700" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-gray-900 sm:text-base">
                Technicians and Professionals
              </h2>
              <p className="text-[10px] font-medium text-red-950/85 sm:text-[11px] leading-tight">
                Hire verified local service experts near you
              </p>
            </div>
          </div>
          <Link
            to="/products?category=professionals"
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-etukas-red shadow-sm transition-all hover:bg-gray-50 active:scale-95 sm:text-xs"
          >
            View All <ArrowRight size={13} />
          </Link>
        </div>

        {/* Scrollable grid strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1.5 sm:gap-2.5 no-scrollbar md:grid md:grid-cols-4 lg:grid-cols-8 md:overflow-visible">
          {professionals.map((pro) => (
            <Link
              key={pro.slug}
              to={`/products?category=${pro.slug}`}
              className="group flex min-w-[96px] max-w-[108px] flex-1 flex-col items-center justify-between rounded-xl bg-white p-2 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 sm:min-w-0 sm:max-w-none sm:p-2.5"
            >
              {/* Image container: clean white, large character */}
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-gray-50/50 p-1 transition-transform duration-200 group-hover:scale-105">
                <img
                  src={pro.image}
                  alt={pro.name}
                  className="h-full w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-110"
                  loading="lazy"
                />
              </div>

              {/* Title & Tagline */}
              <div className="mt-1.5 w-full">
                <span className="line-clamp-1 w-full text-[11px] font-extrabold text-gray-900 transition-colors group-hover:text-etukas-red sm:text-xs">
                  {pro.name}
                </span>
                <span className="mt-0.5 block line-clamp-1 text-[9px] font-medium text-gray-500 sm:text-[10px]">
                  {pro.tagline}
                </span>
              </div>

              {/* Reduced size Book Service button in Etukas Red */}
              <span className="mt-1.5 inline-flex items-center justify-center rounded-full bg-etukas-red px-2 py-0.5 text-[9px] font-bold text-white shadow-xs transition-all duration-150 group-hover:brightness-110 sm:text-[10px]">
                Book Service
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
