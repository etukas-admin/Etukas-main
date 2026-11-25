import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { sendOk } from "../../utils/http.js";

export type RawCategoryProductImage = {
  id: string;
  productId: string;
  url: string;
  sortOrder: number;
};

export type RawCategoryChild = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string | null;
  isActive: boolean;
};

export type RawCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  children?: RawCategoryChild[];
  products?: Array<{
    id: string;
    images: RawCategoryProductImage[];
  }>;
};

export type FormattedCategoryChild = RawCategoryChild & {
  productCount: number;
  sampleImageUrl: string | null;
};

export type FormattedCategory = Omit<RawCategoryRecord, "products" | "children"> & {
  children: FormattedCategoryChild[];
  productCount: number;
  sampleImageUrl: string | null;
};

function resolveSampleImageUrl(products?: RawCategoryRecord["products"]): string | null {
  if (!products?.length) return null;
  for (const product of products) {
    const img = product.images?.[0];
    if (!img) continue;
    if (img.url && img.url.trim() !== "") {
      return img.url;
    }
    return `/api/v1/products/${img.productId}/images/${img.id}`;
  }
  return null;
}

export function formatCategoriesResponse(rawCategories: RawCategoryRecord[]): FormattedCategory[] {
  const directStatsById = new Map<string, { productCount: number; sampleImageUrl: string | null }>();

  for (const category of rawCategories) {
    directStatsById.set(category.id, {
      productCount: category.products?.length ?? 0,
      sampleImageUrl: resolveSampleImageUrl(category.products)
    });
  }

  return rawCategories.map(({ products: _products, children = [], ...rest }) => {
    const formattedChildren: FormattedCategoryChild[] = children.map((child) => {
      const childStats = directStatsById.get(child.id);
      return {
        ...child,
        productCount: childStats?.productCount ?? 0,
        sampleImageUrl: childStats?.sampleImageUrl ?? null
      };
    });

    const ownStats = directStatsById.get(rest.id);
    const directCount = ownStats?.productCount ?? 0;
    const childCount = formattedChildren.reduce((sum, child) => sum + child.productCount, 0);
    const childSampleImage = formattedChildren.find((child) => Boolean(child.sampleImageUrl))?.sampleImageUrl ?? null;

    return {
      ...rest,
      children: formattedChildren,
      productCount: directCount + childCount,
      sampleImageUrl: ownStats?.sampleImageUrl ?? childSampleImage
    };
  });
}

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            parentId: true,
            isActive: true
          }
        },
        products: {
          where: {
            listings: {
              some: {
                isActive: true,
                store: {
                  isActive: true,
                  sellerProfile: { verificationStatus: "APPROVED" }
                }
              }
            }
          },
          select: {
            id: true,
            images: {
              select: {
                id: true,
                productId: true,
                url: true,
                sortOrder: true
              },
              orderBy: { sortOrder: "asc" },
              take: 1
            }
          }
        }
      }
    });

    const formatted = formatCategoriesResponse(categories);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return sendOk(res, formatted);
  } catch (error) {
    next(error);
  }
});
