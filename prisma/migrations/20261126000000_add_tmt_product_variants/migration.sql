-- Add TMT metadata JSON column on Product and multi-size product_variants table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tmtMetadata" JSONB;

CREATE TABLE IF NOT EXISTS "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "diameter_mm" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "is_lite" BOOLEAN NOT NULL DEFAULT false,
    "pieces_per_bundle" INTEGER NOT NULL,
    "weight_per_meter_kg" DOUBLE PRECISION NOT NULL,
    "weight_per_bundle_kg" DOUBLE PRECISION NOT NULL,
    "price_per_bundle_inr" INTEGER NOT NULL,
    "price_per_ton_inr" INTEGER NOT NULL,
    "common_use" TEXT NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "min_order_quantity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_product_id_label_key" ON "product_variants"("product_id", "label");
CREATE INDEX IF NOT EXISTS "product_variants_product_id_is_active_idx" ON "product_variants"("product_id", "is_active");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'product_variants_product_id_fkey'
    ) THEN
        ALTER TABLE "product_variants"
            ADD CONSTRAINT "product_variants_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "Product"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
