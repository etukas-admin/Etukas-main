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

export const TECHNICIANS_TAB_SLUG = "technicians";
export const MACHINERY_TAB_SLUG = "construction-machinery";

type BuildingMaterialCatalogEntry = {
  name: string;
  slug: string;
  iconName: string;
  image: string;
  icon: CategoryIconComponent | null;
};

/**
 * Exact Building Materials order matching HomePage side-scroll strip.
 */
export const BUILDING_MATERIAL_CATALOG: readonly BuildingMaterialCatalogEntry[] = [
  {
    name: "Bricks & Blocks",
    slug: "bricks-blocks",
    iconName: "BrickWall",
    image: "/images/pngimages/bricks-blocks.webp",
    icon: BricksBlocksIcon
  },
  {
    name: "Cement",
    slug: "cement",
    iconName: "Package",
    image: "/images/pngimages/cement.webp",
    icon: CementIcon
  },
  {
    name: "Sand",
    slug: "sand-aggregates",
    iconName: "Mountain",
    image: "/images/pngimages/sand.webp",
    icon: SandIcon
  },
  {
    name: "Stone / Aggregate",
    slug: "stones-aggregates",
    iconName: "Mountain",
    image: "/images/pngimages/stone-aggregates.webp",
    icon: StoneAggregateIcon
  },
  {
    name: "Iron Bars",
    slug: "steel-iron-bars",
    iconName: "Grip",
    image: "/images/pngimages/steel-iron-bars.webp",
    icon: IronBarsIcon
  },
  {
    name: "Tiles / Marbles",
    slug: "tiles-flooring",
    iconName: "Layers",
    image: "/images/pngimages/tiles-flooring.webp",
    icon: TilesMarblesIcon
  },
  {
    name: "Paints",
    slug: "paints",
    iconName: "Paintbrush",
    image: "/images/pngimages/paints.webp",
    icon: PaintsIcon
  },
  {
    name: "Plumbing",
    slug: "plumbing",
    iconName: "Pipes",
    image: "/images/pngimages/plumbing.webp",
    icon: PlumbingIcon
  },
  {
    name: "Electricals",
    slug: "electrical-materials",
    iconName: "Cable",
    image: "/images/pngimages/electrical-materials.webp",
    icon: ElectricalsIcon
  },
  {
    name: "Cement Articles",
    slug: "cement-poles",
    iconName: "UtilityPole",
    image: "/images/pngimages/cement-articles.webp",
    icon: CementArticlesIcon
  }
];

export type ServiceDirectoryItem = {
  name: string;
  slug: string;
  image: string;
  tagline: string;
};

export const TECHNICIAN_SERVICES: readonly ServiceDirectoryItem[] = [
  { name: "Plumber", slug: "plumber", image: "/images/technicians/plumber.webp", tagline: "Pipes & Taps" },
  { name: "Painter", slug: "painter", image: "/images/technicians/painter.webp", tagline: "Home Painting" },
  { name: "Electrician", slug: "electrician", image: "/images/technicians/electrician.webp", tagline: "Wiring & Power" },
  { name: "Mason Worker", slug: "mason-worker", image: "/images/technicians/mason-worker.webp", tagline: "Civil & Bricks" },
  { name: "Welder", slug: "welder", image: "/images/technicians/welder.webp", tagline: "Grills & Gates" },
  { name: "Carpenter", slug: "carpenter", image: "/images/technicians/carpenter.webp", tagline: "Wood & Furniture" },
  { name: "Civil Engineer", slug: "civil-engineer", image: "/images/technicians/civil-engineer.webp", tagline: "Site Plans & Design" },
  { name: "Others", slug: "others", image: "/images/technicians/others.webp", tagline: "Site & Heavy Work" }
];

export const MACHINERY_SERVICES: readonly ServiceDirectoryItem[] = [
  { name: "JCB", slug: "jcb", image: "/images/machinery/jcb.webp", tagline: "Excavation & Loading" },
  { name: "Borewell", slug: "borewell", image: "/images/machinery/borewell.webp", tagline: "Drilling & Rig Works" },
  { name: "RMC", slug: "rmc", image: "/images/machinery/rmc.webp", tagline: "Ready-Mix Concrete" },
  { name: "Concrete Mixer", slug: "concrete-mixer", image: "/images/machinery/concrete-mixer.webp", tagline: "Batching & Site Mixing" },
  { name: "Blade Tractor", slug: "blade-tractor", image: "/images/machinery/blade-tractor.webp", tagline: "Grading & Land Leveling" },
  { name: "Road Roller", slug: "road-roller", image: "/images/machinery/road-roller.webp", tagline: "Road Work & Compaction" },
  { name: "Big Roller", slug: "big-roller", image: "/images/machinery/big-roller.webp", tagline: "Soil & Heavy Compaction" },
  { name: "Small Cranes", slug: "small-cranes", image: "/images/machinery/small-cranes.webp", tagline: "Hydra & Material Lifting" }
];

type CategoryVisualMeta = {
  image: string;
  icon: CategoryIconComponent | null;
};

const CATEGORY_VISUALS: Record<string, CategoryVisualMeta> = {
  ...Object.fromEntries(
    BUILDING_MATERIAL_CATALOG.map((entry) => [
      entry.slug,
      { image: entry.image, icon: entry.icon }
    ])
  ),
  [MACHINERY_TAB_SLUG]: {
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

/**
 * Merges live DB categories with the canonical building-materials catalog
 * in the exact Homepage side-scroll order (excluding machinery, which has its own rail tab).
 */
export function buildOrderedMaterialCategories(dbCategories: Category[]): Category[] {
  const topLevel = getTopLevelCategories(dbCategories).filter(
    (category) => category.slug !== MACHINERY_TAB_SLUG
  );

  const bySlug = new Map<string, Category>();
  for (const cat of topLevel) {
    bySlug.set(cat.slug, cat);
  }

  const canonicalSlugs = new Set(BUILDING_MATERIAL_CATALOG.map((entry) => entry.slug));
  const ordered: Category[] = [];

  for (const entry of BUILDING_MATERIAL_CATALOG) {
    const dbMatch = bySlug.get(entry.slug);
    if (dbMatch) {
      ordered.push({
        ...dbMatch,
        name: entry.name
      });
    } else {
      ordered.push({
        id: `catalog-${entry.slug}`,
        name: entry.name,
        slug: entry.slug,
        icon: entry.iconName,
        parentId: null,
        productCount: 0,
        sampleImageUrl: null,
        children: []
      });
    }
  }

  const extra = topLevel
    .filter((cat) => !canonicalSlugs.has(cat.slug))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...ordered, ...extra];
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

export function filterServicesByQuery<T extends { name: string; slug: string; tagline: string }>(
  items: readonly T[],
  rawQuery: string
): T[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [...items];

  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.slug.toLowerCase().includes(query) ||
      item.tagline.toLowerCase().includes(query)
  );
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
