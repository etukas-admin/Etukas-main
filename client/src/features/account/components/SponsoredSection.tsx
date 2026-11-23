import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Megaphone } from "lucide-react";
import { usePublicAdBanners } from "../../../hooks/useMarketplace";
import { DEFAULT_SPONSORED_BANNERS } from "../data/sponsoredData";

export function SponsoredSection() {
  const adBannersQuery = usePublicAdBanners();
  const liveAdBanners = adBannersQuery.data ?? [];
  const [activeIndex, setActiveIndex] = useState(0);

  const slideCount = liveAdBanners.length > 0 ? liveAdBanners.length : DEFAULT_SPONSORED_BANNERS.length;

  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slideCount]);

  const currentLiveAd = liveAdBanners.length > 0 ? liveAdBanners[activeIndex % liveAdBanners.length] : null;
  const fallbackSponsor = DEFAULT_SPONSORED_BANNERS[activeIndex % DEFAULT_SPONSORED_BANNERS.length];

  return (
    <section aria-labelledby="sponsored-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="sponsored-heading" className="text-[17px] font-extrabold tracking-tight text-etukas-black">
          Sponsored
        </h2>
        {slideCount > 1 ? (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: slideCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`View sponsored ad ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex % slideCount === idx ? "w-5 bg-etukas-red" : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {currentLiveAd ? (
        <Link
          to="/products"
          className="group relative block overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-sm transition hover:shadow-md"
        >
          <span className="absolute right-3 top-3 z-10 rounded bg-black/60 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur-xs">
            AD
          </span>
          <div className="aspect-[16/8.5] w-full overflow-hidden bg-gray-100 sm:aspect-[16/7]">
            <img
              src={currentLiveAd.imageUrl}
              alt={`Sponsored advertisement ${currentLiveAd.bannerNumber}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        </Link>
      ) : (
        <Link
          to={fallbackSponsor.ctaHref}
          className={`group relative block overflow-hidden rounded-2xl border border-etukas-red/20 bg-gradient-to-br ${fallbackSponsor.accentGradient} p-5 text-white shadow-sm transition hover:shadow-md sm:p-6`}
        >
          {/* Decorative geometric glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-red-400/20 blur-2xl"
          />

          <span className="absolute right-3.5 top-3.5 rounded bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur-xs">
            AD
          </span>

          <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-md space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-100">
                <Megaphone size={12} />
                <span>{fallbackSponsor.sponsorName}</span>
              </div>
              <h3 className="text-lg font-black leading-snug tracking-tight text-white sm:text-xl">
                {fallbackSponsor.headline}
              </h3>
              <p className="text-xs leading-relaxed text-red-50/90 sm:text-sm">
                {fallbackSponsor.subheadline}
              </p>
            </div>

            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-etukas-red shadow-sm transition group-hover:bg-etukas-pink">
              <span>{fallbackSponsor.ctaLabel}</span>
              <ArrowUpRight size={14} />
            </span>
          </div>
        </Link>
      )}
    </section>
  );
}
