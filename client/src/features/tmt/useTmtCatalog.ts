import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketplaceApi } from "../../services/api";
import { queryKeys } from "../../lib/queryKeys";
import {
  buildTmtVariantsForBrand,
  findMasterTmtBrandBySlug,
  TMT_MASTER_BRANDS,
  type TmtBrandCatalogItem,
  type TmtBrandTier,
  type TmtGrade
} from "../../types/tmt";

export function useTmtBrands(params?: {
  tier?: TmtBrandTier | "all";
  grade?: TmtGrade | "all";
  q?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}) {
  const query = useQuery({
    queryKey: queryKeys.tmt.brands(params),
    queryFn: ({ signal }) => marketplaceApi.tmtBrands(params, { signal }),
    staleTime: 60_000,
    retry: 1
  });

  const fallbackBrands = useMemo<TmtBrandCatalogItem[]>(() => {
    const qLower = params?.q?.trim().toLowerCase() ?? "";
    return TMT_MASTER_BRANDS.filter((brand) => {
      if (params?.tier && params.tier !== "all" && brand.tier !== params.tier) {
        return false;
      }
      if (
        params?.grade &&
        params.grade !== "all" &&
        !brand.available_grades.includes(params.grade)
      ) {
        return false;
      }
      if (qLower) {
        const hay = `${brand.name} ${brand.manufacturer} ${brand.origin_region} ${brand.available_grades.join(" ")}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    }).map((b) => ({ ...b, variants: b.variants.map((v) => ({ ...v })) }));
  }, [params?.tier, params?.grade, params?.q]);

  const brands = query.data && query.data.length > 0 ? query.data : fallbackBrands;

  return {
    ...query,
    brands
  };
}

export function useTmtBrandDetail(
  brandSlug?: string,
  params?: {
    grade?: TmtGrade;
    city?: string;
    latitude?: number;
    longitude?: number;
  }
) {
  const query = useQuery({
    queryKey: queryKeys.tmt.brandDetail(brandSlug || "", params),
    queryFn: ({ signal }) =>
      marketplaceApi.tmtBrandBySlug(brandSlug || "", params, { signal }),
    enabled: Boolean(brandSlug),
    staleTime: 60_000,
    retry: 1
  });

  const fallbackDetail = useMemo(() => {
    if (!brandSlug) return null;
    const master = findMasterTmtBrandBySlug(brandSlug);
    if (!master) return null;
    const activeGrade =
      params?.grade && master.available_grades.includes(params.grade)
        ? params.grade
        : master.default_grade;

    return {
      brand: {
        ...master,
        default_grade: activeGrade,
        variants: buildTmtVariantsForBrand({
          brandSlug: master.slug,
          grade: activeGrade,
          baseRatePerTonInr: master.base_rate_per_ton_inr,
          supportsLiteVariants: master.supports_lite_variants,
          rodLengthMeters: master.rod_length_meters,
          gstIncluded: true
        })
      },
      offers: [] as TmtBrandCatalogItem[]
    };
  }, [brandSlug, params?.grade]);

  const detail = query.data ?? fallbackDetail;

  return {
    ...query,
    brand: detail?.brand ?? null,
    offers: detail?.offers ?? []
  };
}
