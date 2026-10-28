CREATE TABLE "AdBannerImage" (
    "id" TEXT NOT NULL,
    "section" INTEGER NOT NULL,
    "bannerNumber" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdBannerImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdBannerImage_section_bannerNumber_isCurrent_createdAt_idx"
ON "AdBannerImage"("section", "bannerNumber", "isCurrent", "createdAt");

CREATE UNIQUE INDEX "AdBannerImage_one_current_slot_idx"
ON "AdBannerImage"("section", "bannerNumber")
WHERE "isCurrent" = true;
