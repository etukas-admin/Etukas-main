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
  identifier: z.string().trim().min(2, "Enter email, Seller ID, or mobile number").optional(),
  email: z.string().trim().optional(),
  password: z.string().min(1, "Password is required")
});

export const resetPasswordSchema = z.object({
  identifier: z.string().trim().min(2, "Enter email, Seller ID, or mobile number"),
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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

const optionalCoordinate = (min: number, max: number, label: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    },
    z.coerce.number({ invalid_type_error: `${label} must be a valid decimal number` }).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`).optional()
  );

export const sellerEnquirySchema = z
  .object({
    contactPerson: z.string().trim().min(2, "Contact person is required").max(120),
    businessName: z.string().trim().min(2, "Business name is required").max(160),
    email: z.string().trim().email("Enter a valid email").max(180),
    mobile: z.string().trim().min(8, "Mobile number is required").max(20),
    businessType: z.enum(["RETAILER", "WHOLESALER", "MANUFACTURER"]),
    gstin: z.string().trim().min(10).max(20).optional().or(z.literal("")),
    addressLine1: z.string().trim().min(4, "Shop address is required").max(240),
    city: z.string().trim().min(2, "City is required").max(120),
    state: z.string().trim().min(2, "State is required").max(120),
    postalCode: z.string().trim().min(4, "Postal code is required").max(20),
    latitude: optionalCoordinate(-90, 90, "Latitude"),
    longitude: optionalCoordinate(-180, 180, "Longitude")
  })
  .superRefine((value, ctx) => {
    if (value.latitude !== undefined && value.longitude === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["longitude"], message: "Longitude is required when latitude is provided" });
    }
    if (value.longitude !== undefined && value.latitude === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude is required when longitude is provided" });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SellerEnquiryInput = z.infer<typeof sellerEnquirySchema>;

// ---------- Seller Registration (multi-step, Flipkart-style) ----------

export const sellerRegStep1Schema = z.object({
  contactPerson: z.string().trim().min(2, "Name is required").max(120),
  mobile: z.string().trim().min(10, "Enter a valid 10-digit mobile number").max(15),
  email: z.string().trim().email("Enter a valid email").max(180)
});

export const sellerRegStep2Schema = z
  .object({
    businessName: z.string().trim().min(2, "Business name is required").max(160),
    businessType: z.enum(["RETAILER", "WHOLESALER", "MANUFACTURER"]),
    gstin: z.string().trim().min(10).max(20).optional().or(z.literal("")),
    addressLine1: z.string().trim().min(4, "Shop address is required").max(240),
    city: z.string().trim().min(2, "City is required").max(120),
    state: z.string().trim().min(2, "State is required").max(120),
    postalCode: z.string().trim().min(4, "Postal code is required").max(20),
    storeName: z.string().trim().min(2, "Store name is required").max(160),
    storePhone: z.string().trim().min(8, "Store phone is required").max(20),
    latitude: optionalCoordinate(-90, 90, "Latitude"),
    longitude: optionalCoordinate(-180, 180, "Longitude"),
    storeImageBase64: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.latitude !== undefined && value.longitude === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["longitude"], message: "Longitude is required when latitude is provided" });
    }
    if (value.longitude !== undefined && value.latitude === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude is required when longitude is provided" });
    }
  });

export type SellerRegStep1Input = z.infer<typeof sellerRegStep1Schema>;
export type SellerRegStep2Input = z.infer<typeof sellerRegStep2Schema>;
