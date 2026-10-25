import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { sendOk } from "../../utils/http.js";

export const bannersRouter = Router();

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
