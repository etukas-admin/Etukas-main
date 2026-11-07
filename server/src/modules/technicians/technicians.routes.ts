import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import {
  technicianBookingSchema,
  technicianRegistrationSchema,
  type Technician,
  type TechnicianBookingInput,
  type TechnicianRegistrationInput
} from "@etukas/shared";
import { AdminNotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const techniciansRouter = Router();

techniciansRouter.patch("/me", requireAuth, requireRole("SELLER"), async (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().trim().min(2).max(120),
      workingHours: z.string().trim().min(3).max(80),
      availableDays: z.array(z.string().trim().min(2).max(12)).min(1).max(7),
      isAvailableToday: z.boolean(),
      chargePerHour: z.number().min(0).max(100000),
      chargePerDay: z.number().min(0).max(1000000),
      addressLine1: z.string().trim().min(3).max(200),
      city: z.string().trim().min(2).max(100),
      state: z.string().trim().min(2).max(100),
      postalCode: z.string().trim().min(4).max(12),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).parse(req.body);
    const list = loadTechnicians();
    const index = list.findIndex((tech) => tech.id === req.user!.id || tech.email.toLowerCase() === req.user!.email.toLowerCase());
    if (index < 0) throw new HttpError(404, "TECHNICIAN_NOT_FOUND", "Technician profile not found");
    list[index] = { ...list[index], ...input };
    saveTechnicians(list);
    return sendOk(res, list[index]);
  } catch (error) { next(error); }
});

// ---------- Helpers & Math ----------

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function generatePartnerId(): string {
  const num = crypto.randomInt(10000, 99999);
  return `TECH${num}`;
}

export function cleanPhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-10);
}

// ---------- Data Store with File Persistence ----------

// Resolves consistently to <project-root>/server/data
const DATA_DIR = path.resolve(__dirname, "../../../data");
const TECHNICIANS_FILE = path.join(DATA_DIR, "technicians.json");
const BOOKINGS_FILE = path.join(DATA_DIR, "technician-bookings.json");

// Default starter technicians with realistic AP & Telangana locations centered near Kakinada (default lat: 16.9891, lng: 82.2475)
const SEED_TECHNICIANS: Technician[] = [
  {
    id: "tech-plumber-1",
    partnerId: "TECH10245",
    name: "Ramesh Kumar Varma",
    mobile: "9848022334",
    email: "ramesh.plumber@etukas.partner",
    businessName: "Sri Sai Plumbing & Sanitary Works",
    categories: ["Plumber", "Mason Worker"],
    primaryCategory: "plumber",
    tagline: "Leakage Repair, Pipe Fitting & Water Tank Setup",
    addressLine1: "Door No. 3-45, Main Road, Karapa",
    city: "Kakinada Rural",
    state: "Andhra Pradesh",
    postalCode: "533462",
    latitude: 16.9925,
    longitude: 82.2498,
    serviceRadiusKm: 25,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    workingHours: "8:00 AM - 7:00 PM",
    isAvailableToday: true,
    chargePerHour: 350,
    chargePerDay: 1800,
    originalPerHour: 450,
    discountPercent: 22,
    avatar: "/images/technicians/plumber.webp",
    experienceYears: 9,
    bio: "Certified plumber with 9+ years experience in domestic and commercial pipe fittings, CPVC/UPVC installations, bathroom fixtures, and emergency leakage fixes.",
    rating: 4.9,
    reviewCount: 142,
    isAssured: true,
    isAd: true,
    badge: "Top Discount of the Sale",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: "tech-electrician-1",
    partnerId: "TECH10246",
    name: "M. Venkateswara Rao",
    mobile: "9848133445",
    email: "venkat.electric@etukas.partner",
    businessName: "Venkateswara Electrical Services",
    categories: ["Electrician"],
    primaryCategory: "electrician",
    tagline: "House Wiring, Inverter & MCB Panel Works",
    addressLine1: "Cinema Road, Near RTC Complex",
    city: "Kakinada",
    state: "Andhra Pradesh",
    postalCode: "533001",
    latitude: 16.9742,
    longitude: 82.2384,
    serviceRadiusKm: 30,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    workingHours: "7:30 AM - 8:30 PM",
    isAvailableToday: true,
    chargePerHour: 380,
    chargePerDay: 2000,
    originalPerHour: 500,
    discountPercent: 24,
    avatar: "/images/technicians/electrician.webp",
    experienceYears: 11,
    bio: "Specialized in 3-phase wiring, smart home setup, earthing pit construction, inverter/UPS installation, and fault finding.",
    rating: 4.8,
    reviewCount: 189,
    isAssured: true,
    isAd: false,
    badge: "Quick 30m Arrival",
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString()
  },
  {
    id: "tech-mason-1",
    partnerId: "TECH10247",
    name: "K. Appa Rao & Team",
    mobile: "9848244556",
    email: "apparao.mason@etukas.partner",
    businessName: "Sri Lakshmi Civil & Mason Works",
    categories: ["Mason Worker", "Tile & Flooring Specialist"],
    primaryCategory: "mason-worker",
    tagline: "Brick Work, Plastering & Concrete Casting",
    addressLine1: "Bhanugudi Junction, Cinema Road",
    city: "Kakinada",
    state: "Andhra Pradesh",
    postalCode: "533003",
    latitude: 16.968,
    longitude: 82.235,
    serviceRadiusKm: 40,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    workingHours: "8:00 AM - 6:00 PM",
    isAvailableToday: true,
    chargePerHour: 320,
    chargePerDay: 1600,
    originalPerHour: 400,
    discountPercent: 20,
    avatar: "/images/technicians/mason-worker.webp",
    experienceYears: 14,
    bio: "Head mason leading skilled teams for brick laying, RCC slab casting, boundary walls, plastering, and stone masonry.",
    rating: 4.7,
    reviewCount: 96,
    isAssured: true,
    isAd: true,
    badge: "Most Booked This Month",
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
  },
  {
    id: "tech-painter-1",
    partnerId: "TECH10248",
    name: "Srinivas Royal Paints",
    mobile: "9848355667",
    email: "srinivas.paints@etukas.partner",
    businessName: "Royal Paint & Texture Finishes",
    categories: ["Painter", "Waterproofing Expert"],
    primaryCategory: "painter",
    tagline: "Interior, Exterior & Waterproof Texture Painting",
    addressLine1: "Near Railway Station Road",
    city: "Samalkot",
    state: "Andhra Pradesh",
    postalCode: "533440",
    latitude: 17.0543,
    longitude: 82.1672,
    serviceRadiusKm: 35,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    workingHours: "8:00 AM - 6:30 PM",
    isAvailableToday: true,
    chargePerHour: 280,
    chargePerDay: 1500,
    originalPerHour: 380,
    discountPercent: 26,
    avatar: "/images/technicians/painter.webp",
    experienceYears: 8,
    bio: "Professional painter trained in Asian Paints and Berger Royale finishes, exterior weather-proof coatings, putty work, and damping treatments.",
    rating: 4.9,
    reviewCount: 112,
    isAssured: true,
    isAd: false,
    badge: "Top Discount of the Sale",
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: "tech-welder-1",
    partnerId: "TECH10249",
    name: "G. Satyanarayana Fabrications",
    mobile: "9848466778",
    email: "satya.welder@etukas.partner",
    businessName: "Satya Iron & Steel Fabricators",
    categories: ["Welder"],
    primaryCategory: "welder",
    tagline: "Grills, Rolling Shutters, Gates & Roofing Truss",
    addressLine1: "Industrial Estate, ADB Road",
    city: "Peddapuram",
    state: "Andhra Pradesh",
    postalCode: "533437",
    latitude: 17.0782,
    longitude: 82.1384,
    serviceRadiusKm: 45,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    workingHours: "8:30 AM - 7:00 PM",
    isAvailableToday: true,
    chargePerHour: 400,
    chargePerDay: 2200,
    originalPerHour: 520,
    discountPercent: 23,
    avatar: "/images/technicians/welder.webp",
    experienceYears: 12,
    bio: "Arc, MIG, and TIG welding for iron gates, balcony safety grills, steel staircases, warehouse structural sheds, and sheet metal repairs.",
    rating: 4.8,
    reviewCount: 78,
    isAssured: true,
    isAd: false,
    badge: "Heavy Work Specialist",
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString()
  },
  {
    id: "tech-carpenter-1",
    partnerId: "TECH10250",
    name: "Chinna Woodcraft",
    mobile: "9848577889",
    email: "chinna.carpenter@etukas.partner",
    businessName: "Sri Devi Woodcraft & Modular Works",
    categories: ["Carpenter", "False Ceiling & POP"],
    primaryCategory: "carpenter",
    tagline: "Modular Kitchen, Doors, Windows & Wardrobes",
    addressLine1: "Jawahar Street, Jagannaickpur",
    city: "Kakinada",
    state: "Andhra Pradesh",
    postalCode: "533002",
    latitude: 16.9531,
    longitude: 82.234,
    serviceRadiusKm: 30,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    workingHours: "9:00 AM - 7:00 PM",
    isAvailableToday: true,
    chargePerHour: 360,
    chargePerDay: 1900,
    originalPerHour: 480,
    discountPercent: 25,
    avatar: "/images/technicians/carpenter.webp",
    experienceYears: 10,
    bio: "Expert carpenter for teakwood doors, frames, modular plywood wardrobes, kitchen cabinets, hinge repairs, and lock installations.",
    rating: 4.9,
    reviewCount: 134,
    isAssured: true,
    isAd: false,
    badge: "Top Rated Expert",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: "tech-engineer-1",
    partnerId: "TECH10251",
    name: "Er. P. Ramachandra Murthy, B.Tech",
    mobile: "9848688990",
    email: "murthy.civil@etukas.partner",
    businessName: "Murthy Civil & Structural Consultants",
    categories: ["Civil Engineer", "Construction Supervisor"],
    primaryCategory: "civil-engineer",
    tagline: "Municipal Plan Approvals, Structural Design & Site Audits",
    addressLine1: "Suryaraopeta, Near Collector Office",
    city: "Kakinada",
    state: "Andhra Pradesh",
    postalCode: "533001",
    latitude: 16.982,
    longitude: 82.242,
    serviceRadiusKm: 60,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    workingHours: "9:00 AM - 6:00 PM",
    isAvailableToday: true,
    chargePerHour: 750,
    chargePerDay: 4500,
    originalPerHour: 1000,
    discountPercent: 25,
    avatar: "/images/technicians/civil-engineer.webp",
    experienceYears: 16,
    bio: "Licensed Civil & Structural Engineer. 2D/3D building plans, municipal panchayat approvals, soil test review, slab supervision, and structural stability certifications.",
    rating: 5.0,
    reviewCount: 88,
    isAssured: true,
    isAd: true,
    badge: "Etukas Verified Professional",
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString()
  },
  {
    id: "tech-others-1",
    partnerId: "TECH10252",
    name: "Babu Demolition & Core Cutting",
    mobile: "9848799001",
    email: "babu.demolition@etukas.partner",
    businessName: "Babu Site Excavation & Heavy Cutters",
    categories: ["Others", "Demolition & Core Cutting"],
    primaryCategory: "others",
    tagline: "Concrete Core Cutting, Wall Chipping & Site Clearing",
    addressLine1: "Subhash Road, Danavaipeta",
    city: "Rajahmundry",
    state: "Andhra Pradesh",
    postalCode: "533103",
    latitude: 17.0005,
    longitude: 81.78,
    serviceRadiusKm: 50,
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    workingHours: "7:00 AM - 8:00 PM",
    isAvailableToday: true,
    chargePerHour: 450,
    chargePerDay: 2500,
    originalPerHour: 600,
    discountPercent: 25,
    avatar: "/images/technicians/others.webp",
    experienceYears: 13,
    bio: "Specialized machines for RCC core cutting for AC/plumbing pipes, wall dismantling, rubble clearance, and site levelling work.",
    rating: 4.7,
    reviewCount: 64,
    isAssured: true,
    isAd: false,
    badge: "Fast On-Demand Crew",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

export function loadTechnicians(): Technician[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Check if technicians.json was previously created under alternate cwd path
    const altFiles = [
      path.resolve(process.cwd(), "server", "data", "technicians.json"),
      path.resolve(process.cwd(), "data", "technicians.json")
    ];
    if (!fs.existsSync(TECHNICIANS_FILE)) {
      for (const alt of altFiles) {
        if (fs.existsSync(alt)) {
          try {
            const altContent = fs.readFileSync(alt, "utf8");
            fs.writeFileSync(TECHNICIANS_FILE, altContent, "utf8");
            break;
          } catch {}
        }
      }
    }
    if (!fs.existsSync(TECHNICIANS_FILE)) {
      fs.writeFileSync(TECHNICIANS_FILE, JSON.stringify(SEED_TECHNICIANS, null, 2), "utf8");
      return SEED_TECHNICIANS;
    }
    const data = fs.readFileSync(TECHNICIANS_FILE, "utf8");
    const list = JSON.parse(data) as Technician[];
    if (Array.isArray(list) && list.length > 0) {
      return list.map(t => ({ ...t, verificationStatus: t.verificationStatus || "APPROVED" }));
    }
    return SEED_TECHNICIANS.map(t => ({ ...t, verificationStatus: t.verificationStatus || "APPROVED" }));
  } catch (err) {
    console.error("Failed to load technicians file, using seed:", err);
    return SEED_TECHNICIANS;
  }
}

export function saveTechnicians(list: Technician[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TECHNICIANS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist technicians to disk:", err);
  }
}

export type TechnicianIdentifier =
  | string
  | {
      id?: string | null;
      partnerId?: string | null;
      sellerId?: string | null;
      userId?: string | null;
      email?: string | null;
      mobile?: string | null;
      businessName?: string | null;
    };

export function updateTechnicianStatus(
  identifier: TechnicianIdentifier,
  status: "PENDING" | "APPROVED" | "REJECTED",
  rejectionReason?: string | null
): Technician | null {
  const list = loadTechnicians();

  let targetId = "";
  let targetPartnerId = "";
  let targetEmail = "";
  let targetMobile = "";
  let targetBusinessName = "";

  if (typeof identifier === "string") {
    const trimmed = identifier.trim();
    targetId = trimmed.toLowerCase();
    targetPartnerId = trimmed.toLowerCase();
    targetEmail = trimmed.toLowerCase();
    targetMobile = cleanPhone(trimmed);
    targetBusinessName = trimmed.toLowerCase();
  } else if (identifier && typeof identifier === "object") {
    targetId = (identifier.id || identifier.userId || "").trim().toLowerCase();
    targetPartnerId = (identifier.partnerId || identifier.sellerId || "").trim().toLowerCase();
    targetEmail = (identifier.email || "").trim().toLowerCase();
    targetMobile = cleanPhone(identifier.mobile);
    targetBusinessName = (identifier.businessName || "").trim().toLowerCase();
  }

  const index = list.findIndex((t) => {
    const tId = t.id.toLowerCase().trim();
    const tPartnerId = t.partnerId.toLowerCase().trim();
    const tEmail = t.email.toLowerCase().trim();
    const tMobile = cleanPhone(t.mobile);
    const tBiz = t.businessName.toLowerCase().trim();

    // Check matches
    if (targetId && (tId === targetId || tPartnerId === targetId)) return true;
    if (targetPartnerId && (tPartnerId === targetPartnerId || tId === targetPartnerId)) return true;
    if (targetEmail && tEmail === targetEmail) return true;
    if (targetMobile && tMobile && tMobile === targetMobile) return true;
    if (targetBusinessName && tBiz === targetBusinessName) return true;

    return false;
  });

  if (index < 0) return null;

  list[index] = {
    ...list[index],
    verificationStatus: status,
    rejectionReason: status === "REJECTED" ? (rejectionReason ?? null) : null
  };
  saveTechnicians(list);
  return list[index];
}

export function loadBookings(technicianId?: string): Record<string, unknown>[] {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) return [];
    const data = fs.readFileSync(BOOKINGS_FILE, "utf8");
    const bookings = JSON.parse(data) as Record<string, unknown>[];
    if (!Array.isArray(bookings)) return [];
    if (!technicianId) return bookings;
    const lower = technicianId.toLowerCase().trim();
    return bookings.filter(
      (b) =>
        String(b.technicianId || "").toLowerCase().trim() === lower ||
        String(b.partnerId || "").toLowerCase().trim() === lower
    );
  } catch {
    return [];
  }
}


function saveBooking(booking: Record<string, unknown>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let existing: Record<string, unknown>[] = [];
    if (fs.existsSync(BOOKINGS_FILE)) {
      existing = JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf8"));
    }
    existing.unshift(booking);
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(existing, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save booking:", err);
  }
}

// ---------- Routes ----------

/**
 * GET /api/v1/technicians
 * Supports filtering by category, search query, distance, working hours, charge,
 * and sorts by NEAREST first relative to customer location (lat & lng).
 */
techniciansRouter.get("/", async (req, res, next) => {
  try {
    const categoryQuery = typeof req.query.category === "string" ? req.query.category.trim().toLowerCase() : undefined;
    const searchQuery = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : undefined;
    const maxDistQuery = typeof req.query.maxDistance === "string" ? Number(req.query.maxDistance) : undefined;
    const maxChargeQuery = typeof req.query.maxCharge === "string" ? Number(req.query.maxCharge) : undefined;
    const sort = typeof req.query.sort === "string" ? req.query.sort : "nearest";

    // Customer location (defaults to Kakinada construction site if none provided)
    const userLat = typeof req.query.lat === "string" && !isNaN(Number(req.query.lat)) ? Number(req.query.lat) : 16.9891;
    const userLng = typeof req.query.lng === "string" && !isNaN(Number(req.query.lng)) ? Number(req.query.lng) : 82.2475;

    let list = loadTechnicians();

    // 1. Sync with Prisma DB: check if any technicians in Prisma are approved
    try {
      const approvedProfiles = await prisma.sellerProfile.findMany({
        where: { verificationStatus: "APPROVED" },
        include: { user: true, stores: true }
      });

      let changed = false;
      for (const tech of list) {
        if (tech.verificationStatus !== "APPROVED") {
          const isDbApproved = approvedProfiles.some(
            (p) =>
              (p.sellerId && p.sellerId.toLowerCase() === tech.partnerId.toLowerCase()) ||
              p.id === tech.id ||
              (p.user?.email && p.user.email.toLowerCase() === tech.email.toLowerCase()) ||
              (p.user?.mobile && cleanPhone(p.user.mobile) === cleanPhone(tech.mobile))
          );
          if (isDbApproved) {
            tech.verificationStatus = "APPROVED";
            changed = true;
          }
        }
      }
      if (changed) {
        saveTechnicians(list);
      }

      // If any approved technician profile in Prisma is missing from file store, convert and include them
      for (const p of approvedProfiles) {
        const isTechProfile =
          (p.businessType as string) === "TECHNICIAN" ||
          (p.sellerId && p.sellerId.toUpperCase().startsWith("TECH")) ||
          p.stores.some((s) => s.slug.startsWith("tech-"));

        if (isTechProfile) {
          const alreadyInList = list.some(
            (t) =>
              (p.sellerId && t.partnerId.toLowerCase() === p.sellerId.toLowerCase()) ||
              t.id === p.id ||
              (p.user?.email && t.email.toLowerCase() === p.user.email.toLowerCase()) ||
              (p.user?.mobile && cleanPhone(t.mobile) === cleanPhone(p.user.mobile))
          );
          if (!alreadyInList) {
            const store = p.stores[0];
            const techFromDb: Technician = {
              id: p.id,
              partnerId: p.sellerId || generatePartnerId(),
              name: p.contactPerson || p.user?.name || "Technician Partner",
              mobile: p.user?.mobile || store?.phone || "",
              email: p.user?.email || "",
              businessName: p.businessName || store?.name || "Verified Technical Services",
              categories: ["Technician"],
              primaryCategory: "others",
              tagline: `${p.businessName || "Professional"} Services`,
              addressLine1: store?.addressLine1 || "",
              city: store?.city || "Kakinada",
              state: store?.state || "Andhra Pradesh",
              postalCode: store?.postalCode || "533001",
              latitude: Number(store?.latitude) || 16.9891,
              longitude: Number(store?.longitude) || 82.2475,
              serviceRadiusKm: store?.serviceRadiusKm || 25,
              availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              workingHours: "8:00 AM - 7:00 PM",
              isAvailableToday: true,
              chargePerHour: 350,
              chargePerDay: 1800,
              originalPerHour: 450,
              discountPercent: 22,
              avatar: "/images/technicians/plumber.webp",
              experienceYears: 5,
              bio: `Verified professional technician providing quality services in ${store?.city || "your area"}.`,
              rating: 5.0,
              reviewCount: 1,
              isAssured: true,
              isAd: false,
              badge: "Verified Partner",
              verificationStatus: "APPROVED",
              createdAt: p.createdAt.toISOString()
            };
            list.unshift(techFromDb);
          }
        }
      }
    } catch {
      // Prisma offline or schema check skipped; continue with file store
    }

    // 2. Compute exact distance from user's current GPS / address location for each technician
    list = list.map((tech) => {
      const techLat = typeof tech.latitude === "number" && !isNaN(tech.latitude) ? tech.latitude : 16.9891;
      const techLng = typeof tech.longitude === "number" && !isNaN(tech.longitude) ? tech.longitude : 82.2475;
      const distanceKm = calculateDistanceKm(userLat, userLng, techLat, techLng);
      return {
        ...tech,
        distanceKm
      };
    });

    // 3. Public marketplace only shows approved technicians
    list = list.filter((tech) => (tech.verificationStatus ?? "APPROVED") === "APPROVED");

    // 4. Filter by Category
    if (categoryQuery && categoryQuery !== "all" && categoryQuery !== "professionals") {
      const normalizedCat = categoryQuery.replace(/-/g, " ");
      list = list.filter((tech) => {
        const matchesPrimary = tech.primaryCategory.toLowerCase().replace(/-/g, " ") === normalizedCat;
        const matchesAny = tech.categories.some((c) =>
          c.toLowerCase().replace(/-/g, " ").includes(normalizedCat)
        );
        return matchesPrimary || matchesAny;
      });
    }

    // 5. Filter by Search text
    if (searchQuery) {
      list = list.filter((tech) => {
        const text = `${tech.name} ${tech.businessName} ${tech.tagline} ${tech.city} ${tech.categories.join(" ")}`.toLowerCase();
        return text.includes(searchQuery);
      });
    }

    // 6. Filter by max distance (e.g. 25km, 40km)
    if (maxDistQuery && !isNaN(maxDistQuery) && maxDistQuery > 0) {
      list = list.filter((tech) => (tech.distanceKm ?? 0) <= maxDistQuery);
    }

    // 7. Filter by max charge
    if (maxChargeQuery && !isNaN(maxChargeQuery) && maxChargeQuery > 0) {
      list = list.filter((tech) => tech.chargePerHour <= maxChargeQuery);
    }

    // 8. Sorting: Nearest first by default so nearest customers get the nearest technicians
    if (sort === "nearest" || !sort) {
      list.sort((a, b) => {
        const distA = typeof a.distanceKm === "number" && !isNaN(a.distanceKm) ? a.distanceKm : 999999;
        const distB = typeof b.distanceKm === "number" && !isNaN(b.distanceKm) ? b.distanceKm : 999999;
        return distA - distB;
      });
    } else if (sort === "price_asc") {
      list.sort((a, b) => a.chargePerHour - b.chargePerHour);
    } else if (sort === "price_desc") {
      list.sort((a, b) => b.chargePerHour - a.chargePerHour);
    } else if (sort === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sort === "newest") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return sendOk(res, list, 200, {
      total: list.length,
      userLocation: { latitude: userLat, longitude: userLng }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/technicians/:id
 */
techniciansRouter.get("/:id", async (req, res, next) => {
  try {
    const list = loadTechnicians();
    let tech = list.find((t) => t.id === req.params.id || t.partnerId === req.params.id);

    if (!tech) {
      try {
        const profile = await prisma.sellerProfile.findFirst({
          where: {
            OR: [
              { id: req.params.id },
              { sellerId: req.params.id }
            ]
          },
          include: { user: true, stores: true }
        });
        if (profile) {
          const store = profile.stores[0];
          tech = {
            id: profile.id,
            partnerId: profile.sellerId || req.params.id,
            name: profile.contactPerson || profile.user?.name || "Technician Partner",
            mobile: profile.user?.mobile || store?.phone || "",
            email: profile.user?.email || "",
            businessName: profile.businessName || store?.name || "Technical Services",
            categories: ["Technician"],
            primaryCategory: "others",
            tagline: `${profile.businessName || "Professional"} Services`,
            addressLine1: store?.addressLine1 || "",
            city: store?.city || "Kakinada",
            state: store?.state || "Andhra Pradesh",
            postalCode: store?.postalCode || "533001",
            latitude: Number(store?.latitude) || 16.9891,
            longitude: Number(store?.longitude) || 82.2475,
            serviceRadiusKm: store?.serviceRadiusKm || 25,
            availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            workingHours: "8:00 AM - 7:00 PM",
            isAvailableToday: true,
            chargePerHour: 350,
            chargePerDay: 1800,
            originalPerHour: 450,
            discountPercent: 22,
            avatar: "/images/technicians/plumber.webp",
            experienceYears: 5,
            bio: "Verified technician partner.",
            rating: 5.0,
            reviewCount: 1,
            isAssured: true,
            isAd: false,
            badge: "Verified Partner",
            verificationStatus: profile.verificationStatus as any,
            createdAt: profile.createdAt.toISOString()
          };
        }
      } catch {
        // DB offline fallback
      }
    }

    if (!tech) {
      throw new HttpError(404, "NOT_FOUND", "Technician not found");
    }

    const userLat = typeof req.query.lat === "string" ? Number(req.query.lat) : 16.9891;
    const userLng = typeof req.query.lng === "string" ? Number(req.query.lng) : 82.2475;
    const techLat = typeof tech.latitude === "number" && !isNaN(tech.latitude) ? tech.latitude : 16.9891;
    const techLng = typeof tech.longitude === "number" && !isNaN(tech.longitude) ? tech.longitude : 82.2475;
    const distanceKm = calculateDistanceKm(userLat, userLng, techLat, techLng);

    return sendOk(res, { ...tech, distanceKm });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/technicians/register
 * Registers a new Technician & Professional Partner
 */
techniciansRouter.post("/register", async (req, res, next) => {
  try {
    const input: TechnicianRegistrationInput = technicianRegistrationSchema.parse(req.body);

    const partnerId = generatePartnerId();
    const techId = `tech-${Date.now()}`;

    // Normalize category slug
    const firstCat = input.categories[0] || "others";
    const primaryCategory = firstCat.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const originalPerHour = Math.round(input.chargePerHour * 1.25);
    const discountPercent = Math.round(((originalPerHour - input.chargePerHour) / originalPerHour) * 100);

    let passwordHash: string | undefined;
    if (input.tempPassword) {
      passwordHash = await bcrypt.hash(input.tempPassword, 12);
    }

    const newTechnician: Technician = {
      id: techId,
      partnerId,
      name: input.contactPerson,
      mobile: input.mobile,
      email: input.email.toLowerCase(),
      businessName: input.businessName,
      categories: input.categories,
      primaryCategory,
      tagline: `${input.categories.join(", ")} Professional`,
      addressLine1: input.addressLine1,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      latitude: input.latitude ?? 16.9891,
      longitude: input.longitude ?? 82.2475,
      serviceRadiusKm: input.serviceRadiusKm ?? 25,
      availableDays: input.availableDays && input.availableDays.length > 0 ? input.availableDays : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      workingHours: input.workingHours || "8:00 AM - 6:00 PM",
      isAvailableToday: true,
      chargePerHour: input.chargePerHour,
      chargePerDay: input.chargePerDay,
      originalPerHour,
      discountPercent: discountPercent > 0 ? discountPercent : 20,
      avatar: input.avatar || "/images/technicians/plumber.webp",
      experienceYears: input.experienceYears || 3,
      bio: input.bio || `Experienced professional providing quality ${input.categories.join(", ")} services in ${input.city} and nearby areas.`,
      rating: 5.0,
      reviewCount: 1,
      isAssured: true,
      isAd: false,
      badge: "New Partner",
      verificationStatus: "PENDING",
      createdAt: new Date().toISOString(),
      tempPassword: input.tempPassword,
      passwordHash
    };

    const currentList = loadTechnicians();
    // Add new technician at beginning of list
    currentList.unshift(newTechnician);
    saveTechnicians(currentList);

    // Sync with database if available
    try {
      if (input.userId) {
        await prisma.sellerProfile.updateMany({
          where: { userId: input.userId },
          data: {
            sellerId: partnerId,
            businessName: input.businessName,
            registrationStep: 2,
            verificationStatus: "PENDING"
          }
        });

        const profile = await prisma.sellerProfile.findFirst({
          where: { userId: input.userId }
        });
        if (profile) {
          const slug = `tech-${partnerId.toLowerCase()}`;
          const existingStore = await prisma.store.findUnique({ where: { slug } });
          if (!existingStore) {
            await prisma.store.create({
              data: {
                sellerProfileId: profile.id,
                name: input.businessName,
                slug,
                phone: input.mobile,
                addressLine1: input.addressLine1,
                city: input.city,
                state: input.state,
                postalCode: input.postalCode,
                latitude: input.latitude ?? null,
                longitude: input.longitude ?? null,
                serviceRadiusKm: input.serviceRadiusKm,
                isActive: true
              }
            });
          }
        }
      }
    } catch (dbSyncErr) {
      console.warn("Prisma DB sync skipped for technician:", dbSyncErr);
    }

    // Also notify admin
    try {
      await prisma.adminNotification.create({
        data: {
          type: AdminNotificationType.NEW_PARTNER,
          title: "New Technician Registered",
          body: `${newTechnician.name} (${newTechnician.categories.join(", ")}) registered from ${newTechnician.city}`,
          metadata: { partnerId: newTechnician.partnerId, technicianId: newTechnician.id, categories: newTechnician.categories }
        }
      });
    } catch {
      // Non-blocking notification if database offline
    }

    return sendCreated(res, {
      technician: newTechnician,
      partnerId: newTechnician.partnerId,
      sellerId: newTechnician.partnerId,
      businessName: newTechnician.businessName,
      registrationStep: 2,
      message: "Congratulations! You are now registered as an Etukas Technician Partner."
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/technicians/:id/book
 * Book service or submit enquiry for technician
 */

techniciansRouter.get("/me/bookings", requireAuth, async (req, res, next) => {
  try {
    const list = loadTechnicians();
    const tech = list.find((t) => t.id === req.user!.id || t.email.toLowerCase() === req.user!.email.toLowerCase());
    if (!tech) throw new HttpError(404, "TECHNICIAN_NOT_FOUND", "Technician profile not found");
    const bookings = loadBookings(tech.id).concat(loadBookings(tech.partnerId));
    const unique = Array.from(new Map(bookings.map((b) => [String(b.bookingId || b.id || JSON.stringify(b)), b])).values());
    return sendOk(res, unique);
  } catch (error) {
    next(error);
  }
});

techniciansRouter.get("/:id/bookings", requireAuth, async (req, res, next) => {
  try {
    const list = loadTechnicians();
    const tech = list.find((t) => t.id === req.params.id || t.partnerId === req.params.id);
    if (!tech) throw new HttpError(404, "NOT_FOUND", "Technician not found");
    const isAdmin = req.user?.roles.includes("ADMIN");
    const isOwner = req.user?.id === tech.id || req.user?.email.toLowerCase() === tech.email.toLowerCase();
    if (!isAdmin && !isOwner) {
      throw new HttpError(403, "FORBIDDEN", "Not authorized to view these bookings");
    }
    const bookings = loadBookings(tech.id).concat(loadBookings(tech.partnerId));
    const unique = Array.from(new Map(bookings.map((b) => [String(b.bookingId || b.id || JSON.stringify(b)), b])).values());
    return sendOk(res, unique);
  } catch (error) {
    next(error);
  }
});

techniciansRouter.post("/:id/book", async (req, res, next) => {
  try {
    const input: TechnicianBookingInput = technicianBookingSchema.parse(req.body);
    const list = loadTechnicians();
    const tech = list.find((t) => t.id === req.params.id || t.partnerId === req.params.id);

    if (!tech) {
      throw new HttpError(404, "NOT_FOUND", "Technician not found");
    }

    const bookingId = `BOOK-${Date.now()}`;
    const bookingRecord = {
      bookingId,
      technicianId: tech.id,
      technicianName: tech.name,
      technicianPhone: tech.mobile,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      serviceCategory: input.serviceCategory,
      bookingDate: input.bookingDate,
      timeSlot: input.timeSlot,
      bookingType: input.bookingType,
      estimatedHours: input.estimatedHours,
      estimatedTotal:
        input.bookingType === "DAILY"
          ? tech.chargePerDay
          : tech.chargePerHour * (input.estimatedHours || 1),
      address: input.address,
      notes: input.notes || "",
      status: "CONFIRMED",
      createdAt: new Date().toISOString()
    };

    saveBooking(bookingRecord);

    try {
      await prisma.adminNotification.create({
        data: {
          type: AdminNotificationType.PARTNER_ENQUIRY,
          title: "New Service Booking Request",
          body: `${input.customerName} booked ${tech.name} for ${input.serviceCategory} on ${input.bookingDate}`,
          metadata: bookingRecord
        }
      });
    } catch {
      // Non-blocking
    }

    return sendCreated(res, {
      booking: bookingRecord,
      message: `Your service booking with ${tech.name} has been confirmed for ${input.bookingDate} (${input.timeSlot})!`
    });
  } catch (error) {
    next(error);
  }
});

