-- Add live vehicle tracking fallback snapshot columns on Order
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "lastLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lastLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lastBearing" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lastSpeedKmh" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

-- Create DeliveryTripSession table mapping secure driver hex tokens to orders
CREATE TABLE IF NOT EXISTS "DeliveryTripSession" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DeliveryTripSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryTripSession_token_key" ON "DeliveryTripSession"("token");
CREATE INDEX IF NOT EXISTS "DeliveryTripSession_orderId_isActive_idx" ON "DeliveryTripSession"("orderId", "isActive");
CREATE INDEX IF NOT EXISTS "DeliveryTripSession_expiresAt_idx" ON "DeliveryTripSession"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DeliveryTripSession_orderId_fkey'
  ) THEN
    ALTER TABLE "DeliveryTripSession"
      ADD CONSTRAINT "DeliveryTripSession_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
