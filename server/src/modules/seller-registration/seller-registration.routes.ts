import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import sharp from "sharp";
import { sellerRegStep1Schema, sellerRegStep2Schema } from "@etukas/shared";
import { prisma } from "../../config/prisma.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";

export const sellerRegistrationRouter = Router();

// ---------- helpers ----------

function generateSellerId(): string {
  // SEA + 5 digits, e.g. SEA01234
  const num = crypto.randomInt(10000, 99999);
  return `SEA${num}`;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars[crypto.randomInt(chars.length)];
  }
  return password;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const exists = await prisma.store.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    attempt++;
  }
}

async function compressImage(base64: string): Promise<Buffer> {
  // Strip data URL prefix if present
  const raw = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");

  // Resize to max 800px wide, convert to JPEG at 70% quality
  return sharp(buffer)
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
}

// ---------- Step 1: Contact info → immediately store mobile ----------

sellerRegistrationRouter.post("/step1", async (req, res, next) => {
  try {
    const input = sellerRegStep1Schema.parse(req.body);

    // Check if mobile is already registered
    const existingUser = await prisma.user.findUnique({ where: { mobile: input.mobile } });

    if (existingUser) {
      // Check if user already has seller profile
      const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId: existingUser.id } });
      if (existingProfile) {
        return sendOk(res, {
          userId: existingUser.id,
          sellerId: existingProfile.sellerId,
          registrationStep: existingProfile.registrationStep,
          message: "Seller profile already exists. Please continue to business details."
        });
      }
    }

    // Check if email already used
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existingEmail && existingEmail.mobile !== input.mobile) {
      throw new HttpError(409, "EMAIL_TAKEN", "This email is already registered with a different account.");
    }

    // Generate unique seller ID
    let sellerId = generateSellerId();
    while (await prisma.sellerProfile.findUnique({ where: { sellerId } })) {
      sellerId = generateSellerId();
    }

    // Generate password for the seller
    const tempPassword = generatePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create user + seller profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let user = existingUser;

      if (!user) {
        user = await tx.user.create({
          data: {
            name: input.contactPerson,
            email: input.email.toLowerCase(),
            mobile: input.mobile,
            passwordHash,
            roles: ["SELLER"]
          }
        });
      } else {
        // Add SELLER role if not already present
        const roles = existingUser!.roles;
        if (!roles.includes("SELLER")) {
          await tx.user.update({
            where: { id: user.id },
            data: { roles: { push: "SELLER" } }
          });
        }
      }

      const profile = await tx.sellerProfile.create({
        data: {
          sellerId,
          userId: user.id,
          contactPerson: input.contactPerson,
          registrationStep: 1
        }
      });

      return { userId: user.id, sellerId: profile.sellerId, email: user.email };
    });

    return sendCreated(res, {
      userId: result.userId,
      sellerId: result.sellerId,
      email: result.email,
      tempPassword: existingUser ? undefined : tempPassword,
      registrationStep: 1,
      message: "Contact information saved. Please continue to business details."
    });
  } catch (error) {
    next(error);
  }
});

// ---------- Step 2: Business details + store + location + image ----------

sellerRegistrationRouter.post("/step2", async (req, res, next) => {
  try {
    const { userId, ...body } = req.body;
    if (!userId || typeof userId !== "string") {
      throw new HttpError(400, "MISSING_USER_ID", "userId is required from step 1");
    }

    const input = sellerRegStep2Schema.parse(body);

    const profile = await prisma.sellerProfile.findFirst({ where: { userId } });
    if (!profile) throw new HttpError(404, "PROFILE_NOT_FOUND", "Complete step 1 first");

    // Compress store image if provided
    let storeImageUrl: string | null = null;
    if (input.storeImageBase64) {
      try {
        const compressed = await compressImage(input.storeImageBase64);
        // In production, upload to S3/GCS. For now, store as base64 data URL.
        storeImageUrl = `data:image/jpeg;base64,${compressed.toString("base64")}`;
      } catch {
        // Image processing failed, continue without it
        storeImageUrl = null;
      }
    }

    const slug = await uniqueSlug(input.storeName || input.businessName);

    const result = await prisma.$transaction(async (tx) => {
      // Update seller profile with business details
      const updatedProfile = await tx.sellerProfile.update({
        where: { id: profile.id },
        data: {
          businessName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin || null,
          registrationStep: 2,
          verificationStatus: "PENDING"
        }
      });

      // Create the store
      const store = await tx.store.create({
        data: {
          sellerProfileId: profile.id,
          name: input.storeName,
          slug,
          phone: input.storePhone,
          addressLine1: input.addressLine1,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          storeImageUrl,
          isActive: false // Needs admin approval first
        }
      });

      // Get user info for response
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, mobile: true }
      });

      return { profile: updatedProfile, store, user };
    });

    return sendOk(res, {
      sellerId: result.profile.sellerId,
      businessName: result.profile.businessName,
      storeName: result.store.name,
      storeCity: result.store.city,
      email: result.user?.email,
      username: result.user?.email,
      registrationStep: 2,
      message: "Thank you for registration! Our team will connect with you shortly for verification."
    });
  } catch (error) {
    next(error);
  }
});

// ---------- Get registration status ----------

sellerRegistrationRouter.get("/status/:sellerId", async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { sellerId: req.params.sellerId },
      include: {
        user: { select: { name: true, email: true, mobile: true } },
        stores: { select: { name: true, city: true, state: true, isActive: true } }
      }
    });
    if (!profile) throw new HttpError(404, "SELLER_NOT_FOUND", "Seller not found");
    return sendOk(res, profile);
  } catch (error) {
    next(error);
  }
});
