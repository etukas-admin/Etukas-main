-- Add per-product display/delivery radius (in km) configurable by partners when listing or editing materials.
ALTER TABLE "StoreProduct" ADD COLUMN IF NOT EXISTS "deliveryRadiusKm" INTEGER NOT NULL DEFAULT 25;
