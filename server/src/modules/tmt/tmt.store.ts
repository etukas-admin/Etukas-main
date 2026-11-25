import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTmtVariantsForBrand,
  calcBundlePriceInr,
  calcWeightPerMeterKg,
  findMasterTmtBrandBySlug,
  getSizeExtraPerTon,
  STANDARD_TMT_LENGTH_METERS,
  TMT_CATEGORY_SLUG,
  TMT_MASTER_BRANDS,
  type SellerTmtQuickRateInput,
  type TmtBrandCatalogItem,
  type TmtBrandTier,
  type TmtGrade,
  type TmtMetadata,
  type TmtVariant
} from "@etukas/shared";
import { prisma } from "../../config/prisma.js";
import { evaluateProductDeliveryRange } from "../../utils/geo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMT_FALLBACK_FILE = path.resolve(__dirname, "../../../data/tmt-listings.json");

export interface FallbackTmtListingRecord {
  listingId: string;
  productId: string;
  sellerProfileId: string;
  storeId: string;
  storeName: string;
  storeCity: string;
  storeState: string;
  storeLat: number | null;
  storeLng: number | null;
  storeRadiusKm: number;
  deliveryRadiusKm: number;
  isActive: boolean;
  metadata: TmtMetadata;
  variants: TmtVariant[];
  updatedAt: string;
}

const memoryFallbackListings = new Map<string, FallbackTmtListingRecord>();

function ensureFallbackDir() {
  const dir = path.dirname(TMT_FALLBACK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadFallbackTmtListings(): FallbackTmtListingRecord[] {
  try {
    if (fs.existsSync(TMT_FALLBACK_FILE)) {
      const raw = fs.readFileSync(TMT_FALLBACK_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const rec of parsed) {
          if (rec?.listingId) {
            memoryFallbackListings.set(rec.listingId, rec as FallbackTmtListingRecord);
          }
        }
      }
    }
  } catch {
    // Ignore file read errors in serverless environments
  }
  return Array.from(memoryFallbackListings.values());
}

export function saveFallbackTmtListing(record: FallbackTmtListingRecord): void {
  memoryFallbackListings.set(record.listingId, record);
  try {
    ensureFallbackDir();
    fs.writeFileSync(
      TMT_FALLBACK_FILE,
      JSON.stringify(Array.from(memoryFallbackListings.values()), null, 2),
      "utf8"
    );
  } catch {
    // Non-fatal in read-only serverless file systems
  }
}

export function getFallbackTmtListingById(listingId: string): FallbackTmtListingRecord | undefined {
  const existing = memoryFallbackListings.get(listingId);
  if (existing) return existing;
  const loaded = loadFallbackTmtListings();
  return loaded.find((item) => item.listingId === listingId);
}

/**
 * Checks whether a Prisma error is caused by the product_variants table or tmtMetadata
 * column not yet being migrated in the connected database.
 */
export function isMissingTmtSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string; meta?: { column?: string; table?: string } };
  if (err.code !== "P2021" && err.code !== "P2022") return false;
  const hay = `${err.meta?.column ?? ""} ${err.meta?.table ?? ""} ${err.message ?? ""}`.toLowerCase();
  return hay.includes("tmtmetadata") || hay.includes("product_variants") || hay.includes("productvariant");
}

function mapDbVariant(row: any): TmtVariant {
  return {
    id: row.id,
    product_id: row.productId,
    diameter_mm: Number(row.diameterMm),
    label: row.label,
    is_lite: Boolean(row.isLite),
    pieces_per_bundle: Number(row.piecesPerBundle),
    weight_per_meter_kg: Number(row.weightPerMeterKg),
    approx_weight_per_bundle_kg: Number(row.weightPerBundleKg),
    price_per_bundle_inr: Number(row.pricePerBundleInr),
    price_per_ton_inr: Number(row.pricePerTonInr),
    common_use: row.commonUse,
    stock_bundles: Number(row.stockQuantity ?? 0),
    min_order_quantity: Number(row.minOrderQuantity ?? 1),
    is_active: row.isActive !== false
  };
}

function sortVariants(variants: TmtVariant[]): TmtVariant[] {
  return [...variants].sort((a, b) => {
    if (a.diameter_mm !== b.diameter_mm) return a.diameter_mm - b.diameter_mm;
    if (Boolean(a.is_lite) !== Boolean(b.is_lite)) return a.is_lite ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
}

function mapLiveRecordToBrandOffer(params: {
  listingId: string;
  productId: string;
  storeId: string;
  storeName: string;
  storeCity: string;
  distanceKm: number | null;
  deliveryEta: string;
  imageUrl?: string | null;
  metadata: TmtMetadata;
  variants: TmtVariant[];
  updatedAt: string;
}): TmtBrandCatalogItem {
  const master = findMasterTmtBrandBySlug(params.metadata.brand_slug);
  const activeVariants = sortVariants(params.variants.filter((v) => v.is_active !== false));
  const finalVariants =
    activeVariants.length > 0
      ? activeVariants
      : buildTmtVariantsForBrand({
          brandSlug: params.metadata.brand_slug,
          grade: params.metadata.grade,
          baseRatePerTonInr: params.metadata.base_rate_per_ton_inr,
          supportsLiteVariants: params.metadata.supports_lite_variants,
          rodLengthMeters: params.metadata.logistics?.rod_length_meters ?? STANDARD_TMT_LENGTH_METERS,
          gstIncluded: params.metadata.logistics?.gst_included ?? true
        });

  return {
    id: master?.id ?? `tmt-live-${params.metadata.brand_slug}`,
    name: params.metadata.brand_name || master?.name || "TMT Steel",
    slug: params.metadata.brand_slug,
    tier: params.metadata.tier ?? master?.tier ?? "regional",
    manufacturer: master?.manufacturer ?? `${params.metadata.brand_name} Rolling Mills`,
    origin_region: master?.origin_region ?? params.storeCity,
    tagline: master?.tagline ?? `${params.metadata.brand_name} IS 1786 certified structural TMT bars`,
    available_grades: master?.available_grades
      ? Array.from(new Set([...master.available_grades, params.metadata.grade]))
      : [params.metadata.grade],
    default_grade: params.metadata.grade,
    base_rate_per_ton_inr: params.metadata.base_rate_per_ton_inr,
    supports_lite_variants:
      params.metadata.supports_lite_variants || finalVariants.some((v) => Boolean(v.is_lite)),
    monogram:
      master?.monogram ??
      params.metadata.brand_name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join(""),
    accent_from: master?.accent_from ?? "#c52228",
    accent_to: master?.accent_to ?? "#1e293b",
    badge_text: master?.badge_text ?? "Verified Yard Rate",
    suggested_image_url:
      params.imageUrl || master?.suggested_image_url || "/images/pngimages/steel-iron-bars.webp",
    rod_length_meters:
      params.metadata.logistics?.rod_length_meters ??
      master?.rod_length_meters ??
      STANDARD_TMT_LENGTH_METERS,
    billing_mode:
      params.metadata.logistics?.billing_mode ??
      master?.billing_mode ??
      (params.metadata.tier === "primary" ? "theoretical" : "weighbridge"),
    certifications: master?.certifications ?? ["IS 1786"],
    variants: finalVariants,
    store_product_id: params.listingId,
    store_id: params.storeId,
    store_name: params.storeName,
    store_city: params.storeCity,
    distance_km: params.distanceKm,
    delivery_eta: params.deliveryEta,
    has_live_seller_listing: true,
    updated_at: params.updatedAt,
    logistics: params.metadata.logistics ?? master?.logistics
  };
}

export async function fetchLiveTmtOffers(location?: {
  city?: string;
  latitude?: number;
  longitude?: number;
}): Promise<TmtBrandCatalogItem[]> {
  const offers: TmtBrandCatalogItem[] = [];
  const seenListingIds = new Set<string>();

  try {
    const dbListings = await prisma.storeProduct.findMany({
      where: {
        isActive: true,
        store: {
          isActive: true,
          sellerProfile: { verificationStatus: "APPROVED" }
        },
        product: {
          category: { slug: TMT_CATEGORY_SLUG },
          tmtMetadata: { not: null as any }
        }
      },
      include: {
        store: true,
        product: {
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            variants: { where: { isActive: true }, orderBy: { diameterMm: "asc" } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    for (const row of dbListings) {
      const meta = (row.product as any).tmtMetadata as TmtMetadata | null;
      if (!meta?.brand_slug) continue;

      const range = evaluateProductDeliveryRange({
        customerLat: location?.latitude,
        customerLng: location?.longitude,
        customerCity: location?.city,
        storeLat: row.store.latitude,
        storeLng: row.store.longitude,
        storeCity: row.store.city,
        productRadiusKm: (row as any).deliveryRadiusKm,
        storeRadiusKm: row.store.serviceRadiusKm
      });

      if (location?.latitude !== undefined && location?.longitude !== undefined && !range.isDeliverable) {
        continue;
      }

      const rawVariants = ((row.product as any).variants ?? []) as any[];
      const mappedVariants = rawVariants.map(mapDbVariant);
      const imageUrl = row.product.images?.[0]?.url || null;

      seenListingIds.add(row.id);
      offers.push(
        mapLiveRecordToBrandOffer({
          listingId: row.id,
          productId: row.product.id,
          storeId: row.store.id,
          storeName: row.store.name,
          storeCity: row.store.city,
          distanceKm: range.distanceKm,
          deliveryEta: row.deliveryEta,
          imageUrl,
          metadata: meta,
          variants: mappedVariants,
          updatedAt: row.updatedAt.toISOString()
        })
      );
    }
  } catch (err) {
    if (!isMissingTmtSchemaError(err)) {
      // Fallback gracefully when DB is offline in local dev / tests
    }
  }

  // Merge fallback JSON records (if DB migration isn't applied yet)
  for (const rec of loadFallbackTmtListings()) {
    if (!rec.isActive || seenListingIds.has(rec.listingId)) continue;
    const range = evaluateProductDeliveryRange({
      customerLat: location?.latitude,
      customerLng: location?.longitude,
      customerCity: location?.city,
      storeLat: rec.storeLat,
      storeLng: rec.storeLng,
      storeCity: rec.storeCity,
      productRadiusKm: rec.deliveryRadiusKm,
      storeRadiusKm: rec.storeRadiusKm
    });
    if (location?.latitude !== undefined && location?.longitude !== undefined && !range.isDeliverable) {
      continue;
    }
    offers.push(
      mapLiveRecordToBrandOffer({
        listingId: rec.listingId,
        productId: rec.productId,
        storeId: rec.storeId,
        storeName: rec.storeName,
        storeCity: rec.storeCity,
        distanceKm: range.distanceKm,
        deliveryEta: "Same day",
        metadata: rec.metadata,
        variants: rec.variants,
        updatedAt: rec.updatedAt
      })
    );
  }

  return offers;
}

export async function getMergedTmtBrands(filters?: {
  tier?: TmtBrandTier | "all";
  grade?: TmtGrade | "all";
  q?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}): Promise<TmtBrandCatalogItem[]> {
  const liveOffers = await fetchLiveTmtOffers({
    city: filters?.city,
    latitude: filters?.latitude,
    longitude: filters?.longitude
  });

  const liveBySlug = new Map<string, TmtBrandCatalogItem[]>();
  for (const offer of liveOffers) {
    const existing = liveBySlug.get(offer.slug) ?? [];
    existing.push(offer);
    liveBySlug.set(offer.slug, existing);
  }

  const merged: TmtBrandCatalogItem[] = [];
  const usedSlugs = new Set<string>();

  for (const master of TMT_MASTER_BRANDS) {
    usedSlugs.add(master.slug);
    const matchingLive = liveBySlug.get(master.slug) ?? [];
    if (matchingLive.length > 0) {
      // Pick closest or lowest-rate live yard offer for the brand card
      const preferred = [...matchingLive].sort((a, b) => {
        const distA = a.distance_km ?? Number.POSITIVE_INFINITY;
        const distB = b.distance_km ?? Number.POSITIVE_INFINITY;
        if (distA !== distB) return distA - distB;
        return a.base_rate_per_ton_inr - b.base_rate_per_ton_inr;
      })[0];

      const unionGrades = Array.from(
        new Set([...master.available_grades, ...matchingLive.map((o) => o.default_grade)])
      );
      merged.push({
        ...preferred,
        available_grades: unionGrades
      });
    } else {
      merged.push({
        ...master,
        variants: master.variants.map((v) => ({ ...v }))
      });
    }
  }

  // Append any custom regional brands added by sellers outside the 15 master brands
  for (const [slug, offers] of liveBySlug.entries()) {
    if (usedSlugs.has(slug) || offers.length === 0) continue;
    merged.push(offers[0]);
  }

  const qLower = filters?.q?.trim().toLowerCase() ?? "";

  return merged.filter((brand) => {
    if (filters?.tier && filters.tier !== "all" && brand.tier !== filters.tier) {
      return false;
    }
    if (
      filters?.grade &&
      filters.grade !== "all" &&
      !brand.available_grades.includes(filters.grade)
    ) {
      return false;
    }
    if (qLower) {
      const hay = `${brand.name} ${brand.manufacturer} ${brand.origin_region} ${brand.available_grades.join(" ")}`.toLowerCase();
      if (!hay.includes(qLower)) return false;
    }
    return true;
  });
}

export async function getTmtBrandDetail(
  brandSlug: string,
  options?: {
    grade?: TmtGrade;
    city?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<{ brand: TmtBrandCatalogItem; offers: TmtBrandCatalogItem[] } | null> {
  const normalizedSlug = brandSlug.trim().toLowerCase();
  const liveOffers = await fetchLiveTmtOffers({
    city: options?.city,
    latitude: options?.latitude,
    longitude: options?.longitude
  });

  const matchingOffers = liveOffers.filter((o) => o.slug === normalizedSlug);
  const master = findMasterTmtBrandBySlug(normalizedSlug);

  if (!master && matchingOffers.length === 0) {
    return null;
  }

  const requestedGrade = options?.grade;
  const exactGradeOffer = requestedGrade
    ? matchingOffers.find((o) => o.default_grade === requestedGrade)
    : undefined;

  if (exactGradeOffer) {
    return {
      brand: {
        ...exactGradeOffer,
        available_grades: master?.available_grades ?? exactGradeOffer.available_grades
      },
      offers: matchingOffers
    };
  }

  if (matchingOffers.length > 0 && (!requestedGrade || requestedGrade === matchingOffers[0].default_grade)) {
    const primaryOffer = matchingOffers[0];
    return {
      brand: {
        ...primaryOffer,
        available_grades: Array.from(
          new Set([
            ...(master?.available_grades ?? []),
            ...matchingOffers.map((o) => o.default_grade)
          ])
        )
      },
      offers: matchingOffers
    };
  }

  const base = master ?? matchingOffers[0];
  const activeGrade =
    requestedGrade && base.available_grades.includes(requestedGrade)
      ? requestedGrade
      : base.default_grade;

  const variants = buildTmtVariantsForBrand({
    brandSlug: base.slug,
    grade: activeGrade,
    baseRatePerTonInr: base.base_rate_per_ton_inr,
    supportsLiteVariants: base.supports_lite_variants,
    rodLengthMeters: base.rod_length_meters,
    gstIncluded: base.logistics?.gst_included ?? true,
    extras: {
      extra6mm: base.logistics?.extra_6mm_per_ton_inr,
      extra8mm: base.logistics?.extra_8mm_per_ton_inr,
      extra8mmLite: base.logistics?.extra_8mm_lite_per_ton_inr
    }
  });

  return {
    brand: {
      ...base,
      default_grade: activeGrade,
      variants
    },
    offers: matchingOffers
  };
}

export function recalculateTmtVariantsFromQuickRate(
  variants: TmtVariant[],
  metadata: TmtMetadata,
  input: SellerTmtQuickRateInput
): { updatedMetadata: TmtMetadata; updatedVariants: TmtVariant[] } {
  const gstIncluded = input.gstIncluded ?? metadata.logistics?.gst_included ?? true;
  const extra6mm = input.extra6mmPerTonInr ?? metadata.logistics?.extra_6mm_per_ton_inr ?? 2000;
  const extra8mm = input.extra8mmPerTonInr ?? metadata.logistics?.extra_8mm_per_ton_inr ?? 800;
  const extra8mmLite =
    input.extra8mmLitePerTonInr ?? metadata.logistics?.extra_8mm_lite_per_ton_inr ?? -1000;

  const updatedVariants = variants.map((v) => {
    const extra = getSizeExtraPerTon(v.label, {
      extra6mm,
      extra8mm,
      extra8mmLite
    });
    const weightKg = v.approx_weight_per_bundle_kg;
    const { pricePerTonInr, pricePerBundleInr } = calcBundlePriceInr(
      input.baseRatePerTonInr,
      extra,
      weightKg,
      gstIncluded
    );

    return {
      ...v,
      weight_per_meter_kg: v.weight_per_meter_kg || calcWeightPerMeterKg(v.diameter_mm),
      price_per_ton_inr: pricePerTonInr,
      price_per_bundle_inr: pricePerBundleInr
    };
  });

  const updatedMetadata: TmtMetadata = {
    ...metadata,
    base_rate_per_ton_inr: input.baseRatePerTonInr,
    logistics: {
      ...(metadata.logistics ?? {
        rod_length_meters: STANDARD_TMT_LENGTH_METERS,
        billing_mode: metadata.tier === "primary" ? "theoretical" : "weighbridge",
        min_order_tons: 0.5,
        free_delivery_tons: 2.5,
        loading_charge_per_ton_inr: 0,
        gst_included: gstIncluded,
        extra_6mm_per_ton_inr: extra6mm,
        extra_8mm_per_ton_inr: extra8mm,
        extra_8mm_lite_per_ton_inr: extra8mmLite
      }),
      gst_included: gstIncluded,
      extra_6mm_per_ton_inr: extra6mm,
      extra_8mm_per_ton_inr: extra8mm,
      extra_8mm_lite_per_ton_inr: extra8mmLite
    },
    updated_at: new Date().toISOString()
  };

  return { updatedMetadata, updatedVariants };
}
