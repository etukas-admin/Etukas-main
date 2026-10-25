ALTER TABLE "SellerProfile"
ADD COLUMN "sellerId" TEXT,
ADD COLUMN "registrationStep" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "SellerProfile_sellerId_key" ON "SellerProfile"("sellerId");

ALTER TABLE "Store"
ADD COLUMN "storeImageUrl" TEXT;
