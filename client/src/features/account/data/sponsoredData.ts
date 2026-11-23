import type { SponsorBannerItem } from "../types";

/**
 * Future-ready sponsorship configuration.
 * When a brand partners with Etukas for Account-page sponsorships,
 * add or replace entries here (or upload via Admin Ad Banners).
 */
export const DEFAULT_SPONSORED_BANNERS: SponsorBannerItem[] = [
  {
    id: "etukas-sponsor-slot-1",
    sponsorName: "Etukas Brand Partner",
    tagline: "SPONSORED PLACEMENT",
    headline: "Advertise Your Construction Brand Here",
    subheadline: "Reach active homeowners, builders & contractors directly on Etukas Account.",
    ctaLabel: "Partner with Etukas",
    ctaHref: "/partner-hub",
    accentGradient: "from-[#1A1A1A] via-[#4A1215] to-[#C52228]",
    isPlaceholder: true
  }
];
