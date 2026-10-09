import { z } from "zod";

export const roleSchema = z.enum(["CUSTOMER", "SELLER", "MANUFACTURER", "ADMIN"]);

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(180),
  mobile: z.string().min(8).max(20),
  password: z.string().min(8).max(128),
  role: roleSchema.default("CUSTOMER"),
  deliveryLocation: z
    .object({
      label: z.string().min(2).max(160),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional()
    })
    .optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const sellerOnboardingSchema = z.object({
  contactPerson: z.string().min(2),
  businessName: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(8).max(20),
  businessType: z.enum(["RETAILER", "WHOLESALER", "MANUFACTURER"]),
  gstin: z.string().min(10).max(20).optional(),
  addressLine1: z.string().min(4),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(4),
  serviceableAreas: z.array(z.string().min(2)).default([])
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
