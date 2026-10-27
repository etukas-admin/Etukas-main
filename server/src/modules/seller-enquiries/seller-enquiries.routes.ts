import { Router } from "express";
import { sellerEnquirySchema } from "@etukas/shared";
import { prisma } from "../../config/prisma.js";
import { sendCreated } from "../../utils/http.js";
import { AdminNotificationType } from "@prisma/client";

export const sellerEnquiriesRouter = Router();

sellerEnquiriesRouter.post("/", async (req, res, next) => {
  try {
    const input = sellerEnquirySchema.parse(req.body);
    const enquiry = await prisma.sellerEnquiry.create({
      data: {
        ...input,
        gstin: input.gstin || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null
      }
    });

    try {
      await prisma.adminNotification.create({
        data: {
          type: AdminNotificationType.PARTNER_ENQUIRY,
          title: "New Partner Enquiry",
          body: `${enquiry.businessName} (${enquiry.contactPerson}) submitted an enquiry`,
          metadata: { enquiryId: enquiry.id, businessName: enquiry.businessName, city: enquiry.city }
        }
      });
    } catch {
      // Non-blocking notification
    }

    return sendCreated(res, enquiry);
  } catch (error) {
    next(error);
  }
});

