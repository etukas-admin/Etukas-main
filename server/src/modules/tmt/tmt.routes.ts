import { Router } from "express";
import { z } from "zod";
import { tmtGradeSchema, type TmtBrandTier, type TmtGrade } from "@etukas/shared";
import { HttpError, sendOk } from "../../utils/http.js";
import { parseCoordinate } from "../../utils/geo.js";
import { getMergedTmtBrands, getTmtBrandDetail } from "./tmt.store.js";

export const tmtRouter = Router();

const brandListQuerySchema = z.object({
  tier: z.enum(["all", "primary", "regional"]).optional().default("all"),
  grade: z.enum(["all", "Fe 500", "Fe 500D", "Fe 550D", "CRS"]).optional().default("all"),
  q: z.string().trim().optional(),
  city: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional()
});

tmtRouter.get("/brands", async (req, res, next) => {
  try {
    const query = brandListQuerySchema.parse(req.query);
    const brands = await getMergedTmtBrands({
      tier: query.tier as TmtBrandTier | "all",
      grade: query.grade as TmtGrade | "all",
      q: query.q,
      city: query.city,
      latitude: query.latitude,
      longitude: query.longitude
    });
    return sendOk(res, brands, 200, { total: brands.length });
  } catch (error) {
    next(error);
  }
});

tmtRouter.get("/brands/:brandSlug", async (req, res, next) => {
  try {
    const rawGrade = typeof req.query.grade === "string" ? req.query.grade.trim() : undefined;
    const grade = rawGrade ? tmtGradeSchema.parse(rawGrade) : undefined;
    const city = typeof req.query.city === "string" ? req.query.city.trim() : undefined;
    const latitude = parseCoordinate(req.query.latitude) ?? undefined;
    const longitude = parseCoordinate(req.query.longitude) ?? undefined;

    const detail = await getTmtBrandDetail(req.params.brandSlug, {
      grade,
      city,
      latitude,
      longitude
    });

    if (!detail) {
      throw new HttpError(404, "TMT_BRAND_NOT_FOUND", "TMT steel brand not found");
    }

    return sendOk(res, detail);
  } catch (error) {
    next(error);
  }
});
