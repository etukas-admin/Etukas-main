-- CreateEnum
CREATE TYPE "SellerEnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SellerEnquiry" (
    "id" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "gstin" TEXT,
    "addressLine1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "status" "SellerEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SellerEnquiry_status_createdAt_idx" ON "SellerEnquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SellerEnquiry_city_state_idx" ON "SellerEnquiry"("city", "state");

-- CreateIndex
CREATE INDEX "SellerEnquiry_latitude_longitude_idx" ON "SellerEnquiry"("latitude", "longitude");
