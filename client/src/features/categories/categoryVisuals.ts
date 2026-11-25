import type { ComponentType } from "react";
import {
  BricksBlocksIcon,
  CementArticlesIcon,
  CementIcon,
  ElectricalsIcon,
  IronBarsIcon,
  PaintsIcon,
  PlumbingIcon,
  SandIcon,
  StoneAggregateIcon,
  TilesMarblesIcon
} from "../../components/icons/CategoryIcons";
import { getProductImageUrl, type Category, type Store, type StoreProduct } from "../../services/api";

export type CategoryIconComponent = ComponentType<{ size?: number; className?: string }>;

type CategoryVisualMeta = {
  image: string;
  icon: CategoryIconComponent | null;
};

const CATEGORY_VISUALS: Record<string, CategoryVisualMeta> = {
  cement: {
    image: "/images/categories/cement.webp",
    icon: CementIcon
  },
  "bricks-blocks": {
    image: "/images/categories/bricks-blocks.webp",
    icon: BricksBlocksIcon
  },
  "sand-aggregates": {
    image: "/images/categories/sand-aggregates.webp",
    icon: SandIcon
  },
  "stones-aggregates": {
    image: "/images/categories/stones-aggregates.webp",
    icon: StoneAggregateIcon
  },
  "steel-iron-bars": {
    image: "/images/categories/steel-iron-bars.webp",
    icon: IronBarsIcon
  },
  "tiles-flooring": {
    image: "/images/categories/tiles-flooring.webp",
    icon: TilesMarblesIcon
  },
  paints: {
    image: "/images/categories/paints.webp",
    icon: PaintsIcon
  },
  plumbing: {
    image: "/images/categories/plumbing.webp",
    icon: PlumbingIcon
  },
  "electrical-materials": {
    image: "/images/categories/electrical-materials.webp",
    icon: ElectricalsIcon
  },
  "cement-poles": {
    image: "/images/categories/cement-articles.webp",
    icon: CementArticlesIcon
  },
  "construction-machinery": {
    image: "/images/machinery/jcb.webp",
    icon: null
  }
};

export function getCategoryLocalImage(slug: string): string | null {
  return CATEGORY_VISUALS[slug]?.image ?? null;
}

export function getCategoryIconComponent(slug: string): CategoryIconComponent | null {
  return CATEGORY_VISUALS[slug]?.icon ?? null;
}

/**
 * Resolves the display image for a category using verified local assets first,
 * falling back to the database sample product image when available.
 */
export function resolveCategoryImage(category: Pick<Category, "slug" | "sampleImageUrl">): string | null {
  const localImage = getCategoryLocalImage(category.slug);
  if (localImage) return localImage;

  const sampleUrl = category.sampleImageUrl?.trim();
  if (!sampleUrl) return null;

  const resolved = getProductImageUrl({ url: sampleUrl }, undefined, "");
  return resolved || null;
}

export function getTopLevelCategories(categories: Category[]): Category[] {
  const topLevel = categories.filter((category) => !category.parentId);
  return topLevel.length > 0 ? topLevel : categories;
}

export function filterCategoriesByQuery(categories: Category[], rawQuery: string): Category[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return categories;

  return categories.filter((category) => {
    if (category.name.toLowerCase().includes(query) || category.slug.toLowerCase().includes(query)) {
      return true;
    }
    return Boolean(
      category.children?.some(
        (child) => child.name.toLowerCase().includes(query) || child.slug.toLowerCase().includes(query)
      )
    );
  });
}

export function extractBrandsFromProducts(products: StoreProduct[]): string[] {
  const seen = new Map<string, string>();

  for (const item of products) {
    const rawBrand = item.product.brand?.trim();
    if (!rawBrand) continue;
    const key = rawBrand.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, rawBrand);
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export function extractStoresFromProducts(products: StoreProduct[]): Store[] {
  const byId = new Map<string, Store>();

  for (const item of products) {
    const existing = byId.get(item.store.id);
    if (!existing) {
      byId.set(item.store.id, {
        ...item.store,
        distanceKm: item.distanceKm ?? item.store.distanceKm
      });
    } else if (existing.distanceKm == null && item.distanceKm != null) {
      byId.set(item.store.id, { ...existing, distanceKm: item.distanceKm });
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (distA !== distB) return distA - distB;
    return a.name.localeCompare(b.name);
  });
}

export function computeDiscountPercent(priceMinor: number, discountMinor?: number): number | null {
  if (!discountMinor || discountMinor <= 0 || priceMinor <= 0) {
    return null;
  }
  const mrpMinor = priceMinor + discountMinor;
  if (mrpMinor <= 0) return null;
  return Math.round((discountMinor / mrpMinor) * 100);
}
