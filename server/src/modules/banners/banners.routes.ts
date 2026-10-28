import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { HttpError, sendOk } from "../../utils/http.js";

export const bannersRouter = Router();

bannersRouter.get("/ad-banners", async (_req, res, next) => {
  try {
    const images = await prisma.adBannerImage.findMany({
      where: { isCurrent: true },
      select: { id: true, section: true, bannerNumber: true, imageUrl: true, contentType: true, sizeBytes: true, isCurrent: true, createdAt: true, updatedAt: true },
      orderBy: [{ section: "asc" }, { bannerNumber: "asc" }]
    });
    return sendOk(res, images);
  } catch (error) {
    next(error);
  }
});

bannersRouter.get("/ad-banners/:id/image", async (req, res, next) => {
  try {
    const image = await prisma.adBannerImage.findUnique({
      where: { id: req.params.id },
      select: { imageData: true, imageUrl: true, contentType: true }
    });
    if (!image) throw new HttpError(404, "AD_BANNER_NOT_FOUND", "Ad banner image not found.");
    if (image.imageData) {
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", image.contentType);
      return res.send(image.imageData);
    }
    if (image.imageUrl) return res.redirect(image.imageUrl);
    throw new HttpError(404, "AD_BANNER_IMAGE_NOT_FOUND", "Ad banner image data not found.");
  } catch (error) {
    next(error);
  }
});

bannersRouter.get("/", async (_req, res, next) => {
  try {
    const banners = await prisma.homepageBanner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
    return sendOk(res, banners);
  } catch (error) {
    next(error);
  }
});
