import { z } from "zod";

export type TmtBrandTier = "primary" | "regional";
export type TmtGrade = "Fe 500" | "Fe 500D" | "Fe 550D" | "CRS";
export type TmtBillingMode = "theoretical" | "weighbridge";
export type TmtUom = "bundles" | "tons";
export type TmtDiameterLabel =
  | "6mm"
  | "8mm"
  | "8mm Lite"
  | "10mm"
  | "12mm"
  | "16mm"
  | "20mm"
  | "25mm"
  | "32mm";

export type HouseBhkKey = "1bhk" | "2bhk" | "3bhk";

export const TMT_CATEGORY_SLUG = "steel-iron-bars";
export const STANDARD_TMT_LENGTH_METERS = 12;
export const STANDARD_TMT_LENGTH_FEET = 40;
export const TMT_WEIGHBRIDGE_NOTE =
  "Estimated weight shown; final invoice as per actual weighbridge slip (±2%).";

export const TMT_GRADES: readonly TmtGrade[] = [
  "Fe 500D",
  "Fe 550D",
  "CRS",
  "Fe 500"
] as const;

export const GRADE_RATE_ADJUSTMENTS_INR: Record<TmtGrade, number> = {
  "Fe 500": -500,
  "Fe 500D": 0,
  "Fe 550D": 600,
  CRS: 2200
};

export interface TmtSizeSpec {
  diameter_mm: number;
  label: TmtDiameterLabel;
  is_lite: boolean;
  default_pieces_per_bundle: number;
  override_bundle_weight_kg?: number;
  default_extra_per_ton_inr: number;
  common_use: string;
  default_stock_bundles: number;
}

export const STANDARD_TMT_SIZE_SPECS: readonly TmtSizeSpec[] = [
  {
    diameter_mm: 6,
    label: "6mm",
    is_lite: false,
    default_pieces_per_bundle: 18,
    default_extra_per_ton_inr: 2000,
    common_use: "Stirrups / Rings",
    default_stock_bundles: 85
  },
  {
    diameter_mm: 8,
    label: "8mm",
    is_lite: false,
    default_pieces_per_bundle: 10,
    default_extra_per_ton_inr: 800,
    common_use: "Stirrups / Slab Distribution",
    default_stock_bundles: 140
  },
  {
    diameter_mm: 8,
    label: "8mm Lite",
    is_lite: true,
    default_pieces_per_bundle: 12,
    override_bundle_weight_kg: 43.0,
    default_extra_per_ton_inr: -1000,
    common_use: "Economy Rings / Tie Bars",
    default_stock_bundles: 110
  },
  {
    diameter_mm: 10,
    label: "10mm",
    is_lite: false,
    default_pieces_per_bundle: 7,
    default_extra_per_ton_inr: 0,
    common_use: "Roof Slabs & Lintels",
    default_stock_bundles: 160
  },
  {
    diameter_mm: 12,
    label: "12mm",
    is_lite: false,
    default_pieces_per_bundle: 5,
    default_extra_per_ton_inr: 0,
    common_use: "Slabs, Beams & Footings",
    default_stock_bundles: 180
  },
  {
    diameter_mm: 16,
    label: "16mm",
    is_lite: false,
    default_pieces_per_bundle: 3,
    default_extra_per_ton_inr: 0,
    common_use: "Columns & Main Beams",
    default_stock_bundles: 120
  },
  {
    diameter_mm: 20,
    label: "20mm",
    is_lite: false,
    default_pieces_per_bundle: 2,
    default_extra_per_ton_inr: 0,
    common_use: "Heavy Columns & Girders",
    default_stock_bundles: 75
  },
  {
    diameter_mm: 25,
    label: "25mm",
    is_lite: false,
    default_pieces_per_bundle: 1,
    default_extra_per_ton_inr: 0,
    common_use: "Raft Foundations & High-Rise",
    default_stock_bundles: 60
  },
  {
    diameter_mm: 32,
    label: "32mm",
    is_lite: false,
    default_pieces_per_bundle: 1,
    default_extra_per_ton_inr: 0,
    common_use: "Bridges, Piles & Heavy Infra",
    default_stock_bundles: 40
  }
] as const;

export interface TmtVariant {
  id: string;
  product_id?: string;
  diameter_mm: number;
  label: TmtDiameterLabel | string;
  is_lite?: boolean;
  pieces_per_bundle: number;
  weight_per_meter_kg: number;
  approx_weight_per_bundle_kg: number;
  price_per_bundle_inr: number;
  price_per_ton_inr: number;
  common_use: string;
  stock_bundles: number;
  min_order_quantity?: number;
  is_active?: boolean;
}

export interface TmtYardLogistics {
  rod_length_meters: number;
  billing_mode: TmtBillingMode;
  min_order_tons: number;
  free_delivery_tons: number;
  loading_charge_per_ton_inr: number;
  gst_included: boolean;
  extra_6mm_per_ton_inr: number;
  extra_8mm_per_ton_inr: number;
  extra_8mm_lite_per_ton_inr: number;
}

export interface TmtMetadata {
  brand_name: string;
  brand_slug: string;
  tier: TmtBrandTier;
  grade: TmtGrade;
  base_rate_per_ton_inr: number;
  supports_lite_variants: boolean;
  logistics: TmtYardLogistics;
  updated_at?: string;
}

export interface TmtBrandCatalogItem {
  id: string;
  name: string;
  slug: string;
  tier: TmtBrandTier;
  manufacturer: string;
  origin_region: string;
  tagline: string;
  available_grades: TmtGrade[];
  default_grade: TmtGrade;
  base_rate_per_ton_inr: number;
  supports_lite_variants: boolean;
  monogram: string;
  accent_from: string;
  accent_to: string;
  badge_text: string;
  suggested_image_url: string;
  rod_length_meters: number;
  billing_mode: TmtBillingMode;
  certifications: string[];
  variants: TmtVariant[];
  store_product_id?: string;
  store_id?: string;
  store_name?: string;
  store_city?: string;
  distance_km?: number | null;
  delivery_eta?: string;
  has_live_seller_listing?: boolean;
  updated_at?: string;
  logistics?: TmtYardLogistics;
}

export interface TmtVehicleRecommendation {
  label: string;
  capacityLabel: string;
  maxTons: number;
  minTons: number;
  tip: string;
}

export interface HouseSteelEstimate {
  key: HouseBhkKey;
  title: string;
  areaSqFt: string;
  tonnageRange: string;
  approxTons: number;
  summary: string;
  breakdown: Array<{
    diameterGroup: string;
    application: string;
    sharePercent: number;
    estimatedTons: string;
  }>;
  recommendedBundles: Partial<Record<TmtDiameterLabel, number>>;
}

export interface TmtGradeComparison {
  grade: TmtGrade;
  headline: string;
  yieldStrengthMpa: string;
  elongationPercent: string;
  seismicSafety: string;
  corrosionProtection: string;
  bestFor: string[];
  priceIndicator: string;
}

/**
 * IS 1786 theoretical unit weight per meter: D^2 / 162 (rounded to 3 decimals).
 */
export function calcWeightPerMeterKg(diameterMm: number): number {
  if (!Number.isFinite(diameterMm) || diameterMm <= 0) return 0;
  return Number(((diameterMm * diameterMm) / 162).toFixed(3));
}

/**
 * Theoretical weight of one straight rod of given length (default 12m / 40ft).
 */
export function calcWeightPerRodKg(
  diameterMm: number,
  lengthMeters = STANDARD_TMT_LENGTH_METERS
): number {
  const perMeter = calcWeightPerMeterKg(diameterMm);
  return Number((perMeter * lengthMeters).toFixed(2));
}

/**
 * Approximate bundle weight in kg from diameter, pieces per bundle, and rod length.
 */
export function calcBundleWeightKg(
  diameterMm: number,
  piecesPerBundle: number,
  lengthMeters = STANDARD_TMT_LENGTH_METERS
): number {
  if (piecesPerBundle <= 0 || lengthMeters <= 0) return 0;
  const weightPerMeter = calcWeightPerMeterKg(diameterMm);
  return Number((weightPerMeter * lengthMeters * piecesPerBundle).toFixed(1));
}

/**
 * Computes bundle selling price and effective per-ton rate (incl. 18% GST when excl. GST is entered).
 */
export function calcBundlePriceInr(
  baseRatePerTonInr: number,
  sizeExtraPerTonInr: number,
  bundleWeightKg: number,
  gstIncluded = true
): { pricePerTonInr: number; pricePerBundleInr: number } {
  const rawRatePerTon = Math.max(0, baseRatePerTonInr + sizeExtraPerTonInr);
  const effectivePerTon = gstIncluded ? Math.round(rawRatePerTon) : Math.round(rawRatePerTon * 1.18);
  const pricePerBundleInr = Math.round((effectivePerTon / 1000) * Math.max(0, bundleWeightKg));
  return {
    pricePerTonInr: effectivePerTon,
    pricePerBundleInr
  };
}

export function getSizeExtraPerTon(
  label: string,
  extras?: Partial<{
    extra6mm: number;
    extra8mm: number;
    extra8mmLite: number;
  }>
): number {
  if (label === "6mm") return extras?.extra6mm ?? 2000;
  if (label === "8mm") return extras?.extra8mm ?? 800;
  if (label === "8mm Lite") return extras?.extra8mmLite ?? -1000;
  return 0;
}

export function buildTmtVariantsForBrand(params: {
  brandSlug: string;
  grade: TmtGrade;
  baseRatePerTonInr: number;
  supportsLiteVariants: boolean;
  rodLengthMeters?: number;
  gstIncluded?: boolean;
  extras?: {
    extra6mm?: number;
    extra8mm?: number;
    extra8mmLite?: number;
  };
}): TmtVariant[] {
  const {
    brandSlug,
    grade,
    baseRatePerTonInr,
    supportsLiteVariants,
    rodLengthMeters = STANDARD_TMT_LENGTH_METERS,
    gstIncluded = true,
    extras
  } = params;

  const gradeAdjustment = GRADE_RATE_ADJUSTMENTS_INR[grade] ?? 0;
  const adjustedBaseRate = baseRatePerTonInr + gradeAdjustment;

  return STANDARD_TMT_SIZE_SPECS.filter(
    (spec) => supportsLiteVariants || !spec.is_lite
  ).map((spec) => {
    const weightPerMeterKg = calcWeightPerMeterKg(spec.diameter_mm);
    const bundleWeightKg =
      spec.override_bundle_weight_kg ??
      calcBundleWeightKg(spec.diameter_mm, spec.default_pieces_per_bundle, rodLengthMeters);
    const extraPerTon = getSizeExtraPerTon(spec.label, extras);
    const { pricePerTonInr, pricePerBundleInr } = calcBundlePriceInr(
      adjustedBaseRate,
      extraPerTon,
      bundleWeightKg,
      gstIncluded
    );

    const safeLabel = spec.label.toLowerCase().replace(/\s+/g, "-");
    const safeGrade = grade.toLowerCase().replace(/\s+/g, "-");

    return {
      id: `${brandSlug}-${safeGrade}-${safeLabel}`,
      diameter_mm: spec.diameter_mm,
      label: spec.label,
      is_lite: spec.is_lite,
      pieces_per_bundle: spec.default_pieces_per_bundle,
      weight_per_meter_kg: weightPerMeterKg,
      approx_weight_per_bundle_kg: bundleWeightKg,
      price_per_bundle_inr: pricePerBundleInr,
      price_per_ton_inr: pricePerTonInr,
      common_use: spec.common_use,
      stock_bundles: spec.default_stock_bundles,
      min_order_quantity: 1,
      is_active: true
    };
  });
}

export function recommendTmtVehicle(totalTons: number): TmtVehicleRecommendation | null {
  if (!Number.isFinite(totalTons) || totalTons <= 0) {
    return null;
  }
  if (totalTons <= 1.0) {
    return {
      label: "Tata Ace / Pickup",
      capacityLabel: "Up to 1.0 Ton",
      minTons: 0,
      maxTons: 1.0,
      tip: "Ideal for narrow residential lanes & quick stirrup top-ups"
    };
  }
  if (totalTons <= 2.5) {
    return {
      label: "Mini Truck (2.5T)",
      capacityLabel: "1.0T – 2.5 Tons",
      minTons: 1.0,
      maxTons: 2.5,
      tip: "Best fit for slab or plinth steel drops"
    };
  }
  if (totalTons <= 6.0) {
    return {
      label: "DCM / 6-Wheeler",
      capacityLabel: "2.5T – 6.0 Tons",
      minTons: 2.5,
      maxTons: 6.0,
      tip: "Full 12m straight lengths with zero bending"
    };
  }
  return {
    label: "Heavy Lorry",
    capacityLabel: "> 6.0 Tons",
    minTons: 6.0,
    maxTons: 30,
    tip: "Multi-axle yard dispatch with crane-ready bundle slings"
  };
}

export const HOUSE_STEEL_ESTIMATES: readonly HouseSteelEstimate[] = [
  {
    key: "1bhk",
    title: "1 BHK Independent / Compact Slab",
    areaSqFt: "600 – 850 sq.ft",
    tonnageRange: "~2.0 – 2.8 Tons",
    approxTons: 2.39,
    summary:
      "Balanced reinforcement for single-floor G+0 homes, boundary columns, and 4.5-inch roof slabs.",
    breakdown: [
      {
        diameterGroup: "6mm & 8mm",
        application: "Stirrups, Rings & Slab Distribution",
        sharePercent: 28,
        estimatedTons: "0.67 Tons (~14 bundles)"
      },
      {
        diameterGroup: "10mm",
        application: "Roof Slab Main Mesh & Lintels",
        sharePercent: 32,
        estimatedTons: "0.76 Tons (~15 bundles)"
      },
      {
        diameterGroup: "12mm & 16mm",
        application: "Columns, Plinth & Roof Beams",
        sharePercent: 40,
        estimatedTons: "0.96 Tons (~17 bundles)"
      }
    ],
    recommendedBundles: {
      "6mm": 4,
      "8mm": 10,
      "10mm": 15,
      "12mm": 11,
      "16mm": 6
    }
  },
  {
    key: "2bhk",
    title: "2 BHK Standard Family Home",
    areaSqFt: "1,000 – 1,350 sq.ft",
    tonnageRange: "~3.5 – 4.5 Tons",
    approxTons: 3.92,
    summary:
      "Most popular residential G+1 foundation & slab schedule across Hyderabad, Warangal, and Vijayawada.",
    breakdown: [
      {
        diameterGroup: "6mm & 8mm",
        application: "Column Ties & Beam Stirrups",
        sharePercent: 25,
        estimatedTons: "1.02 Tons (~21 bundles)"
      },
      {
        diameterGroup: "10mm",
        application: "Main Slab Bars & Sunshades",
        sharePercent: 31,
        estimatedTons: "1.19 Tons (~23 bundles)"
      },
      {
        diameterGroup: "12mm & 16mm",
        application: "Load-Bearing Columns & Footings",
        sharePercent: 44,
        estimatedTons: "1.71 Tons (~31 bundles)"
      }
    ],
    recommendedBundles: {
      "6mm": 5,
      "8mm": 16,
      "10mm": 23,
      "12mm": 20,
      "16mm": 11
    }
  },
  {
    key: "3bhk",
    title: "3 BHK Duplex / G+2 Structure",
    areaSqFt: "1,600 – 2,200 sq.ft",
    tonnageRange: "~5.5 – 7.0 Tons",
    approxTons: 6.13,
    summary:
      "Higher structural steel factor for wide-span living rooms, staircase headroom, and multi-floor columns.",
    breakdown: [
      {
        diameterGroup: "6mm & 8mm",
        application: "Closely Spaced Seismic Stirrups",
        sharePercent: 22,
        estimatedTons: "1.39 Tons (~29 bundles)"
      },
      {
        diameterGroup: "10mm",
        application: "Two-Way Slab Mesh & Cantilevers",
        sharePercent: 28,
        estimatedTons: "1.71 Tons (~33 bundles)"
      },
      {
        diameterGroup: "12mm, 16mm & 20mm",
        application: "Deep Beams, Footings & Columns",
        sharePercent: 50,
        estimatedTons: "3.03 Tons (~54 bundles)"
      }
    ],
    recommendedBundles: {
      "6mm": 6,
      "8mm": 23,
      "10mm": 33,
      "12mm": 28,
      "16mm": 20,
      "20mm": 6
    }
  }
] as const;

export const TMT_GRADE_COMPARISONS: readonly TmtGradeComparison[] = [
  {
    grade: "Fe 500D",
    headline: "Best for Residential Homes (G to G+3)",
    yieldStrengthMpa: "500 MPa (Min)",
    elongationPercent: "16% (High Ductility)",
    seismicSafety: "High — absorbs earthquake & thermal shocks without snapping",
    corrosionProtection: "Standard IS 1786 low-phosphorus / sulfur chemistry",
    bestFor: ["Independent Houses", "2–3 BHK Slabs", "Seismic Zone II & III"],
    priceIndicator: "Standard Benchmark"
  },
  {
    grade: "Fe 550D",
    headline: "High-Rise & Heavy Span Engineering",
    yieldStrengthMpa: "550 MPa (Min)",
    elongationPercent: "14.5% (Ductile High-Tensile)",
    seismicSafety: "Very High — handles heavy axial column & beam loads",
    corrosionProtection: "Controlled carbon equivalent for weldability & rust safety",
    bestFor: ["G+4 Apartments", "Wide-Span Commercial Beams", "Heavy Footings"],
    priceIndicator: "+₹600 / Ton approx."
  },
  {
    grade: "CRS",
    headline: "Coastal & Moisture-Shielded Protection",
    yieldStrengthMpa: "500 – 550 MPa",
    elongationPercent: "14.5% – 16%",
    seismicSafety: "High — ductile core paired with anti-corrosion rim",
    corrosionProtection: "Superior — Copper, Chromium & Phosphorus alloyed defense",
    bestFor: ["Coastal AP (Vizag / Kakinada)", "Basement Foundations", "Water Tanks"],
    priceIndicator: "+₹2,200 / Ton approx."
  }
] as const;

type MasterBrandSeedConfig = {
  id: string;
  name: string;
  slug: string;
  tier: TmtBrandTier;
  manufacturer: string;
  origin_region: string;
  tagline: string;
  available_grades: TmtGrade[];
  default_grade: TmtGrade;
  base_rate_per_ton_inr: number;
  supports_lite_variants: boolean;
  monogram: string;
  accent_from: string;
  accent_to: string;
  badge_text: string;
  certifications: string[];
};

const MASTER_BRAND_CONFIGS: readonly MasterBrandSeedConfig[] = [
  {
    id: "tmt-tata-tiscon",
    name: "Tata Tiscon",
    slug: "tata-tiscon",
    tier: "primary",
    manufacturer: "Tata Steel Ltd.",
    origin_region: "Pan-India (Jamshedpur / Kalinganagar)",
    tagline: "India's #1 Super Ductile 550SD & CRS Rebar from Virgin Iron Ore",
    available_grades: ["Fe 500D", "Fe 550D", "CRS"],
    default_grade: "Fe 550D",
    base_rate_per_ton_inr: 73500,
    supports_lite_variants: false,
    monogram: "TT",
    accent_from: "#0f4c81",
    accent_to: "#1e3a8a",
    badge_text: "GreenPro Certified",
    certifications: ["IS 1786:2008", "GreenPro", "Super Ductile SD"]
  },
  {
    id: "tmt-jsw-neosteel",
    name: "JSW Neosteel",
    slug: "jsw-neosteel",
    tier: "primary",
    manufacturer: "JSW Steel Ltd.",
    origin_region: "Vijayanagar / Bellary, Karnataka",
    tagline: "HYQST Pure Steel Bars Engineered for Zero-Crack Bendability",
    available_grades: ["Fe 500D", "Fe 550D", "CRS"],
    default_grade: "Fe 550D",
    base_rate_per_ton_inr: 72500,
    supports_lite_variants: false,
    monogram: "JSW",
    accent_from: "#1d4ed8",
    accent_to: "#0f172a",
    badge_text: "Pure Virgin Steel",
    certifications: ["IS 1786", "HYQST", "BIS Certified"]
  },
  {
    id: "tmt-jindal-panther",
    name: "Jindal Panther",
    slug: "jindal-panther",
    tier: "primary",
    manufacturer: "Jindal Steel & Power",
    origin_region: "Raigarh / Angul",
    tagline: "Superior Weldability & Seismic Energy Absorption with Morgan Mill Finish",
    available_grades: ["Fe 500D", "Fe 550D", "CRS"],
    default_grade: "Fe 550D",
    base_rate_per_ton_inr: 71500,
    supports_lite_variants: false,
    monogram: "JP",
    accent_from: "#991b1b",
    accent_to: "#1f2937",
    badge_text: "High Elongation",
    certifications: ["IS 1786", "HYQST", "NABL Lab Tested"]
  },
  {
    id: "tmt-sail-seqr",
    name: "SAIL SeQR",
    slug: "sail-seqr",
    tier: "primary",
    manufacturer: "Steel Authority of India Ltd.",
    origin_region: "Bhilai / Durgapur / Rourkela",
    tagline: "PSU-Grade Earthquake & High Corrosion Resistant Structural Rebars",
    available_grades: ["Fe 500D", "Fe 550D", "CRS"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 72800,
    supports_lite_variants: false,
    monogram: "SAIL",
    accent_from: "#0369a1",
    accent_to: "#0f172a",
    badge_text: "PSU Navratna",
    certifications: ["IS 1786", "EQR Grade", "Govt Approved"]
  },
  {
    id: "tmt-vizag-steel",
    name: "Vizag Steel",
    slug: "vizag-steel",
    tier: "primary",
    manufacturer: "Rashtriya Ispat Nigam Ltd. (RINL)",
    origin_region: "Visakhapatnam, Andhra Pradesh",
    tagline: "100% Virgin Blast-Furnace Steel Trusted Across Telangana & AP Projects",
    available_grades: ["Fe 500", "Fe 500D", "Fe 550D"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 71800,
    supports_lite_variants: false,
    monogram: "VS",
    accent_from: "#b45309",
    accent_to: "#1e293b",
    badge_text: "RINL Virgin Steel",
    certifications: ["IS 1786", "RINL Certified", "Govt Infra Choice"]
  },
  {
    id: "tmt-radha-tmt",
    name: "Radha TMT",
    slug: "radha-tmt",
    tier: "regional",
    manufacturer: "Radha Smelters Pvt. Ltd.",
    origin_region: "Chegunta / Hyderabad, Telangana",
    tagline: "Telangana's Leading Thermex-Quenched Rebar with 500D & 550D Options",
    available_grades: ["Fe 500", "Fe 500D", "Fe 550D"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 63000,
    supports_lite_variants: true,
    monogram: "RT",
    accent_from: "#c52228",
    accent_to: "#7f1d1d",
    badge_text: "Telangana #1 Choice",
    certifications: ["IS 1786", "Thermex Germany", "ISO 9001"]
  },
  {
    id: "tmt-jairaj-steel",
    name: "Jairaj Steel",
    slug: "jairaj-steel",
    tier: "regional",
    manufacturer: "Jairaj Ispat Ltd.",
    origin_region: "Hyderabad / Kurnool, TS & AP",
    tagline: "Consistent Rib Geometry & Strong Concrete Bonding for Residential Sites",
    available_grades: ["Fe 500", "Fe 500D", "Fe 550D"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 63800,
    supports_lite_variants: true,
    monogram: "JR",
    accent_from: "#047857",
    accent_to: "#064e3b",
    badge_text: "Popular in TS/AP",
    certifications: ["IS 1786", "BIS Marked"]
  },
  {
    id: "tmt-sugna-tmt",
    name: "Sugna TMT",
    slug: "sugna-tmt",
    tier: "regional",
    manufacturer: "Sugna Metals Pvt. Ltd.",
    origin_region: "Pashamylaram, Hyderabad",
    tagline: "High-Ductility Regional TMT Bars Built for Individual Homes & Apartments",
    available_grades: ["Fe 500", "Fe 500D", "Fe 550D"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 63500,
    supports_lite_variants: true,
    monogram: "SG",
    accent_from: "#b91c1c",
    accent_to: "#450a0a",
    badge_text: "Fast Yard Dispatch",
    certifications: ["IS 1786", "HSE Thermex"]
  },
  {
    id: "tmt-shree-tmt",
    name: "Shree TMT",
    slug: "shree-tmt",
    tier: "regional",
    manufacturer: "Shree Steel Rolling Mills",
    origin_region: "Hyderabad, Telangana",
    tagline: "Value-Driven Construction Steel with 8mm Lite & Full-Weight Bundles",
    available_grades: ["Fe 500", "Fe 500D", "Fe 550D"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 63200,
    supports_lite_variants: true,
    monogram: "SH",
    accent_from: "#4338ca",
    accent_to: "#1e1b4b",
    badge_text: "Value Yard Pick",
    certifications: ["IS 1786", "ISI Certified"]
  },
  {
    id: "tmt-simhadri-tmt",
    name: "Simhadri TMT",
    slug: "simhadri-tmt",
    tier: "regional",
    manufacturer: "Simhadri Steel Industries",
    origin_region: "Visakhapatnam & Coastal AP",
    tagline: "Coastal-Ready TMT & CRS Bars Widely Trusted Across AP & Telangana",
    available_grades: ["Fe 500", "Fe 500D", "Fe 550D", "CRS"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 64200,
    supports_lite_variants: true,
    monogram: "SM",
    accent_from: "#0e7490",
    accent_to: "#164e63",
    badge_text: "Coastal AP Favorite",
    certifications: ["IS 1786", "CRS Ready"]
  },
  {
    id: "tmt-ms-life-tmt",
    name: "MS Life TMT",
    slug: "ms-life-tmt",
    tier: "regional",
    manufacturer: "MS Agarwal Foundries",
    origin_region: "Toopran / Hyderabad, Telangana",
    tagline: "600+ Dealers Network with Tight Weight Tolerance & High Yield Margin",
    available_grades: ["Fe 500", "Fe 500D", "Fe 550D"],
    default_grade: "Fe 550D",
    base_rate_per_ton_inr: 62800,
    supports_lite_variants: true,
    monogram: "MS",
    accent_from: "#d97706",
    accent_to: "#78350f",
    badge_text: "Contractor Favorite",
    certifications: ["IS 1786", "BIS Approved"]
  },
  {
    id: "tmt-mangal-tmt",
    name: "Mangal TMT",
    slug: "mangal-tmt",
    tier: "regional",
    manufacturer: "Mangal Iron & Steel",
    origin_region: "Telangana & Rayalaseema",
    tagline: "Dependable Structural Steel for Independent Houses & Compound Framing",
    available_grades: ["Fe 500", "Fe 500D"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 62500,
    supports_lite_variants: true,
    monogram: "MG",
    accent_from: "#be123c",
    accent_to: "#4c0519",
    badge_text: "Budget Builder",
    certifications: ["IS 1786", "ISI Marked"]
  },
  {
    id: "tmt-dhanlaxmi-tmt",
    name: "Dhanlaxmi TMT",
    slug: "dhanlaxmi-tmt",
    tier: "regional",
    manufacturer: "Dhanlaxmi Iron Industries",
    origin_region: "Bonthapally, Hyderabad",
    tagline: "Economical Regional Rebar Ideal for Budget Housing & Lite Stirrups",
    available_grades: ["Fe 500", "Fe 500D"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 61000,
    supports_lite_variants: true,
    monogram: "DL",
    accent_from: "#0f766e",
    accent_to: "#134e4a",
    badge_text: "Best Economy Rate",
    certifications: ["IS 1786", "ISI Certified"]
  },
  {
    id: "tmt-kamdhenu-nxt",
    name: "Kamdhenu Nxt",
    slug: "kamdhenu-nxt",
    tier: "regional",
    manufacturer: "Kamdhenu Ltd.",
    origin_region: "Pan-India & AP/TS Licensed Mills",
    tagline: "Double-Rib Interlock Design with Superior Concrete Grip & CRS Option",
    available_grades: ["Fe 500D", "Fe 550D", "CRS"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 65500,
    supports_lite_variants: true,
    monogram: "KN",
    accent_from: "#dc2626",
    accent_to: "#7f1d1d",
    badge_text: "Double-Rib Grip",
    certifications: ["IS 1786", "Double-Rib Patented"]
  },
  {
    id: "tmt-shyam-steel",
    name: "Shyam Steel",
    slug: "shyam-steel",
    tier: "regional",
    manufacturer: "Shyam Steel Industries Ltd.",
    origin_region: "Durgapur & South Stockists",
    tagline: "FlexiStrong High-Elongation Rebars for Earthquake & Coastal Zones",
    available_grades: ["Fe 500D", "Fe 550D", "CRS"],
    default_grade: "Fe 500D",
    base_rate_per_ton_inr: 66800,
    supports_lite_variants: false,
    monogram: "SS",
    accent_from: "#334155",
    accent_to: "#0f172a",
    badge_text: "FlexiStrong 500D",
    certifications: ["IS 1786", "FlexiStrong", "CRS Ready"]
  }
] as const;

export const TMT_MASTER_BRANDS: readonly TmtBrandCatalogItem[] = MASTER_BRAND_CONFIGS.map(
  (cfg) => {
    const billingMode: TmtBillingMode = cfg.tier === "primary" ? "theoretical" : "weighbridge";
    const variants = buildTmtVariantsForBrand({
      brandSlug: cfg.slug,
      grade: cfg.default_grade,
      baseRatePerTonInr: cfg.base_rate_per_ton_inr,
      supportsLiteVariants: cfg.supports_lite_variants,
      rodLengthMeters: STANDARD_TMT_LENGTH_METERS,
      gstIncluded: true
    });

    return {
      ...cfg,
      suggested_image_url: "/images/pngimages/steel-iron-bars.webp",
      rod_length_meters: STANDARD_TMT_LENGTH_METERS,
      billing_mode: billingMode,
      variants,
      has_live_seller_listing: false,
      delivery_eta: "Same day",
      logistics: {
        rod_length_meters: STANDARD_TMT_LENGTH_METERS,
        billing_mode: billingMode,
        min_order_tons: 0.5,
        free_delivery_tons: 2.5,
        loading_charge_per_ton_inr: 0,
        gst_included: true,
        extra_6mm_per_ton_inr: 2000,
        extra_8mm_per_ton_inr: 800,
        extra_8mm_lite_per_ton_inr: -1000
      }
    };
  }
);

export function findMasterTmtBrandBySlug(slug: string): TmtBrandCatalogItem | undefined {
  const normalized = slug.trim().toLowerCase();
  return TMT_MASTER_BRANDS.find((b) => b.slug === normalized);
}

// ─── Zod Validation Schemas ───────────────────────────────────────────────────

export const tmtGradeSchema = z.enum(["Fe 500", "Fe 500D", "Fe 550D", "CRS"]);
export const tmtBrandTierSchema = z.enum(["primary", "regional"]);
export const tmtBillingModeSchema = z.enum(["theoretical", "weighbridge"]);

export const tmtVariantInputSchema = z.object({
  diameterMm: z.coerce.number().positive().max(60),
  label: z.string().trim().min(2).max(40),
  isLite: z.boolean().default(false),
  piecesPerBundle: z.coerce.number().int().positive().max(200),
  weightPerMeterKg: z.coerce.number().positive().max(50).optional(),
  approxWeightPerBundleKg: z.coerce.number().positive().max(500),
  pricePerBundleInr: z.coerce.number().positive().max(10_000_000),
  pricePerTonInr: z.coerce.number().positive().max(10_000_000),
  commonUse: z.string().trim().min(2).max(120),
  stockBundles: z.coerce.number().int().min(0).max(1_000_000),
  minOrderQuantity: z.coerce.number().int().positive().max(10_000).default(1),
  isActive: z.boolean().default(true)
});

export const tmtYardLogisticsSchema = z.object({
  rodLengthMeters: z.coerce.number().positive().max(24).default(12),
  billingMode: tmtBillingModeSchema.default("theoretical"),
  minOrderTons: z.coerce.number().min(0.1).max(100).default(0.5),
  freeDeliveryTons: z.coerce.number().min(0.1).max(200).default(2.5),
  loadingChargePerTonInr: z.coerce.number().min(0).max(10_000).default(0),
  gstIncluded: z.boolean().default(true),
  extra6mmPerTonInr: z.coerce.number().min(-10_000).max(25_000).default(2000),
  extra8mmPerTonInr: z.coerce.number().min(-10_000).max(25_000).default(800),
  extra8mmLitePerTonInr: z.coerce.number().min(-15_000).max(25_000).default(-1000)
});

export const sellerTmtListingSchema = z.object({
  brandName: z.string().trim().min(2).max(120),
  brandSlug: z.string().trim().min(2).max(120),
  tier: tmtBrandTierSchema,
  grades: z.array(tmtGradeSchema).min(1).max(4),
  baseRatePerTonInr: z.coerce.number().positive().max(500_000),
  supportsLiteVariants: z.boolean().default(false),
  deliveryRadiusKm: z.coerce.number().int().min(1).max(500).default(25),
  description: z.string().trim().max(1000).optional(),
  imageBase64: z.string().optional(),
  suggestedImageUrl: z.string().trim().max(500).optional(),
  logistics: tmtYardLogisticsSchema,
  variants: z.array(tmtVariantInputSchema).min(1).max(12)
});

export const sellerTmtQuickRateSchema = z.object({
  baseRatePerTonInr: z.coerce.number().positive().max(500_000),
  gstIncluded: z.boolean().optional(),
  extra6mmPerTonInr: z.coerce.number().min(-10_000).max(25_000).optional(),
  extra8mmPerTonInr: z.coerce.number().min(-10_000).max(25_000).optional(),
  extra8mmLitePerTonInr: z.coerce.number().min(-15_000).max(25_000).optional()
});

export const batchAddTmtCartSchema = z.object({
  items: z
    .array(
      z.object({
        storeProductId: z.string().min(1),
        quantity: z.coerce.number().int().positive().max(100_000)
      })
    )
    .min(1)
    .max(20)
});

export type TmtVariantInput = z.infer<typeof tmtVariantInputSchema>;
export type SellerTmtListingInput = z.infer<typeof sellerTmtListingSchema>;
export type SellerTmtQuickRateInput = z.infer<typeof sellerTmtQuickRateSchema>;
export type BatchAddTmtCartInput = z.infer<typeof batchAddTmtCartSchema>;
