import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { sendOk } from "../../utils/http.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return sendOk(res, categories);
  } catch (error) {
    next(error);
  }
});
