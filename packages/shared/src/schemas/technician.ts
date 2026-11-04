import { z } from "zod";

export const technicianRegistrationSchema = z.object({
  userId: z.string().optional(),
  tempPassword: z.string().optional(),
  contactPerson: z.string().trim().min(2, "Name is required").max(120),
  mobile: z.string().trim().min(10, "Enter a valid 10-digit mobile number").max(15),
  email: z.string().trim().email("Enter a valid email").max(180),
  businessName: z.string().trim().min(2, "Service or Business name is required").max(160),
  categories: z.array(z.string().min(1)).min(1, "Select at least one skill or category"),
  addressLine1: z.string().trim().min(4, "Address is required").max(240),
  city: z.string().trim().min(2, "City is required").max(120),
  state: z.string().trim().min(2, "State is required").max(120),
  postalCode: z.string().trim().min(4, "Postal code is required").max(20),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  serviceRadiusKm: z.coerce.number().min(5).max(150).default(25),
  availableDays: z
    .array(z.string())
    .min(1, "Select at least one available day")
    .default(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]),
  workingHours: z.string().default("8:00 AM - 6:00 PM"),
  chargePerHour: z.coerce.number().min(0).default(350),
  chargePerDay: z.coerce.number().min(0).default(1800),
  avatar: z.string().default("/images/technicians/plumber.webp"),
  experienceYears: z.coerce.number().min(0).max(50).default(3),
  bio: z.string().optional()
});

export type TechnicianRegistrationInput = z.infer<typeof technicianRegistrationSchema>;

export const technicianBookingSchema = z.object({
  technicianId: z.string().min(1, "Technician ID is required"),
  customerName: z.string().trim().min(2, "Customer name is required"),
  customerPhone: z.string().trim().min(10, "Valid phone number is required"),
  serviceCategory: z.string().min(1, "Service category is required"),
  bookingDate: z.string().min(1, "Preferred date is required"),
  timeSlot: z.string().min(1, "Preferred time slot is required"),
  bookingType: z.enum(["HOURLY", "DAILY", "INSPECTION"]).default("HOURLY"),
  estimatedHours: z.coerce.number().min(1).max(24).optional().default(1),
  address: z.string().trim().min(4, "Service address is required"),
  notes: z.string().optional()
});

export type TechnicianBookingInput = z.infer<typeof technicianBookingSchema>;

export type Technician = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  partnerId: string;
  categories: string[];
  primaryCategory: string;
  tagline: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  availableDays: string[];
  workingHours: string;
  isAvailableToday: boolean;
  chargePerHour: number;
  chargePerDay: number;
  originalPerHour?: number;
  discountPercent?: number;
  avatar: string;
  experienceYears: number;
  bio?: string;
  rating: number;
  reviewCount: number;
  isAssured: boolean;
  isAd?: boolean;
  badge?: string;
  createdAt: string;
  distanceKm?: number;
  passwordHash?: string;
  tempPassword?: string;
  verificationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
};
