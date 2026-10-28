import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { sendOk } from "../../utils/http.js";

export const bannersRouter = Router();

bannersRouter.get("/ad-banners", async (_req, res, next) => {
  try {
    const images = await prisma.adBannerImage.findMany({
      where: { isCurrent: true },
      orderBy: [{ section: "asc" }, { bannerNumber: "asc" }]
    });
    return sendOk(res, images);
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
