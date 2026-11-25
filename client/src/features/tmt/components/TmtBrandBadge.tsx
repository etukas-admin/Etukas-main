import type { TmtBrandCatalogItem } from "../../../types/tmt";

interface TmtBrandBadgeProps {
  brand: Pick<
    TmtBrandCatalogItem,
    "monogram" | "accent_from" | "accent_to" | "tier" | "name" | "has_live_seller_listing"
  >;
  size?: "sm" | "md" | "lg";
}

export function TmtBrandBadge({ brand, size = "md" }: TmtBrandBadgeProps) {
  const dimensions =
    size === "sm"
      ? "h-10 w-10 text-xs rounded-xl"
      : size === "lg"
      ? "h-14 w-14 text-base rounded-2xl"
      : "h-12 w-12 text-sm rounded-xl";

  return (
    <div className="relative shrink-0">
      <div
        className={`flex ${dimensions} items-center justify-center font-black tracking-tight text-white shadow-sm ring-1 ring-black/10`}
        style={{
          backgroundImage: `linear-gradient(135deg, ${brand.accent_from}, ${brand.accent_to})`
        }}
        aria-label={`${brand.name} emblem`}
      >
        {brand.monogram}
      </div>
      {brand.has_live_seller_listing ? (
        <span
          className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow"
          title="Live local yard rate active"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        </span>
      ) : null}
    </div>
  );
}
