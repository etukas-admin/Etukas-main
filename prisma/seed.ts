import { PrismaClient, Role, BusinessType, VerificationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const categories = [
  ["Cement", "cement", "Package"],
  ["Bricks and blocks", "bricks-blocks", "BrickWall"],
  ["Sand and aggregates", "sand-aggregates", "Mountain"],
  ["Steel and iron bars", "steel-iron-bars", "Grip"],
  ["Tiles and flooring", "tiles-flooring", "Layers"],
  ["Paints", "paints", "Paintbrush"],
  ["Plumbing", "plumbing", "Pipes"],
  ["Electrical materials", "electrical-materials", "Cable"],
  ["Cement poles", "cement-poles", "UtilityPole"],
  ["Construction machinery", "construction-machinery", "Truck"]
] as const;

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED_ACCOUNTS !== "true") {
    throw new Error("Refusing to seed demo accounts in production.");
  }

  const passwordHash = await bcrypt.hash("Etukas@123", 12);

  const customer = await prisma.user.upsert({
    where: { email: "customer.demo@etukas.local" },
    update: {},
    create: {
      name: "Demo Customer",
      email: "customer.demo@etukas.local",
      mobile: "9000000001",
      passwordHash,
      roles: [Role.CUSTOMER],
      customerProfile: { create: {} },
      addresses: {
        create: {
          label: "Home",
          contactName: "Demo Customer",
          mobile: "9000000001",
          line1: "Madhapur main road",
          city: "Hyderabad",
          state: "Telangana",
          postalCode: "500081",
          latitude: "17.4483",
          longitude: "78.3915",
          isDefault: true
        }
      }
    }
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller.demo@etukas.local" },
    update: {},
    create: {
      name: "Sai Traders Owner",
      email: "seller.demo@etukas.local",
      mobile: "9000000002",
      passwordHash,
      roles: [Role.SELLER],
      sellerProfile: {
        create: {
          contactPerson: "Sai Kumar",
          businessName: "Sri Sai Traders",
          businessType: BusinessType.RETAILER,
          gstin: "36ABCDE1234F1Z5",
          verificationStatus: VerificationStatus.APPROVED
        }
      }
    },
    include: { sellerProfile: true }
  });

  await prisma.user.upsert({
    where: { email: "admin.demo@etukas.local" },
    update: {},
    create: {
      name: "Development Admin",
      email: "admin.demo@etukas.local",
      mobile: "9000000003",
      passwordHash,
      roles: [Role.ADMIN]
    }
  });

  for (const [name, slug, icon] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, icon },
      create: { name, slug, icon }
    });
  }

  if (!seller.sellerProfile) throw new Error("Seller profile was not created");

  const store = await prisma.store.upsert({
    where: { slug: "sri-sai-traders-hyderabad" },
    update: {},
    create: {
      sellerProfileId: seller.sellerProfile.id,
      name: "Sri Sai Traders",
      slug: "sri-sai-traders-hyderabad",
      phone: "9000000002",
      addressLine1: "Kukatpally building material market",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500072",
      latitude: "17.4849",
      longitude: "78.4138",
      serviceRadiusKm: 30
    }
  });

  const cement = await prisma.category.findUniqueOrThrow({ where: { slug: "cement" } });
  const bricks = await prisma.category.findUniqueOrThrow({ where: { slug: "bricks-blocks" } });
  const steel = await prisma.category.findUniqueOrThrow({ where: { slug: "steel-iron-bars" } });

  const products = [
    { categoryId: cement.id, name: "UltraTech Cement 50kg", slug: "ultratech-cement-50kg", unit: "bag", price: 42000, stock: 180, sku: "UTC-50KG" },
    { categoryId: bricks.id, name: "Red Clay Bricks", slug: "red-clay-bricks", unit: "piece", price: 800, stock: 5000, sku: "RCB-001" },
    { categoryId: steel.id, name: "TMT Steel 12mm Fe500", slug: "tmt-steel-12mm-fe500", unit: "kg", price: 6200, stock: 2500, sku: "TMT12-FE500" }
  ];

  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        categoryId: item.categoryId,
        name: item.name,
        slug: item.slug,
        description: `${item.name} available from verified Etukas sellers.`,
        unit: item.unit,
        images: {
          create: {
            url: `https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80`,
            altText: item.name
          }
        }
      }
    });

    await prisma.storeProduct.upsert({
      where: { storeId_productId: { storeId: store.id, productId: product.id } },
      update: { priceMinor: item.price, stockQuantity: item.stock, isActive: true },
      create: {
        storeId: store.id,
        productId: product.id,
        sku: item.sku,
        priceMinor: item.price,
        stockQuantity: item.stock,
        minOrderQuantity: 1,
        isActive: true
      }
    });
  }

  await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
