-- Persist live delivery tracking metadata (vehicle, driver, status history, notes, payment details) in PostgreSQL
-- so updates remain consistent across stateless serverless deployments (e.g., Vercel).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingMetadata" JSONB;
