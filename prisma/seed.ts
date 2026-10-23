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

  const store2 = await prisma.store.upsert({
    where: { slug: "balaji-steel-and-cement-madhapur" },
    update: {},
    create: {
      sellerProfileId: seller.sellerProfile.id,
      name: "Balaji Steel & Cement Hub",
      slug: "balaji-steel-and-cement-madhapur",
      phone: "9000000004",
      addressLine1: "Near Hitec City Metro, Madhapur",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500081",
      latitude: "17.4485",
      longitude: "78.3908",
      serviceRadiusKm: 25
    }
  });

  const store3 = await prisma.store.upsert({
    where: { slug: "deccan-ceramics-sanitary-gachibowli" },
    update: {},
    create: {
      sellerProfileId: seller.sellerProfile.id,
      name: "Deccan Ceramics & Sanitary",
      slug: "deccan-ceramics-sanitary-gachibowli",
      phone: "9000000005",
      addressLine1: "Financial District Road, Gachibowli",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500032",
      latitude: "17.4401",
      longitude: "78.3489",
      serviceRadiusKm: 25
    }
  });

  const cement = await prisma.category.findUniqueOrThrow({ where: { slug: "cement" } });
  const bricks = await prisma.category.findUniqueOrThrow({ where: { slug: "bricks-blocks" } });
  const steel = await prisma.category.findUniqueOrThrow({ where: { slug: "steel-iron-bars" } });
  const sand = await prisma.category.findUniqueOrThrow({ where: { slug: "sand-aggregates" } });
  const tiles = await prisma.category.findUniqueOrThrow({ where: { slug: "tiles-flooring" } });
  const paints = await prisma.category.findUniqueOrThrow({ where: { slug: "paints" } });
  const plumbing = await prisma.category.findUniqueOrThrow({ where: { slug: "plumbing" } });
  const electrical = await prisma.category.findUniqueOrThrow({ where: { slug: "electrical-materials" } });

  const products = [
    // 1. Fast-Moving & Flash Deals (Cement Bags, Steel TMT Bars, Bricks, Sand)
    {
      storeId: store.id,
      categoryId: cement.id,
      name: "UltraTech Super Cement 50kg",
      slug: "ultratech-super-cement-50kg",
      unit: "bag",
      price: 38500, // ₹385
      discount: 5500, // MRP ₹440 (13% off)
      stock: 240,
      deliveryEta: "2-3 hrs",
      sku: "UTC-SUP-50KG",
      imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store2.id,
      categoryId: cement.id,
      name: "Ramco Super Grade PPC Cement 50kg",
      slug: "ramco-super-grade-ppc-50kg",
      unit: "bag",
      price: 36500, // ₹365
      discount: 4500, // MRP ₹410 (11% off)
      stock: 180,
      deliveryEta: "2 hrs",
      sku: "RMC-PPC-50KG",
      imageUrl: "https://d91ztqmtx7u1k.cloudfront.net/ClientContent/Images/ExtraLarge/ramco-super-grade-ppc-fly-ash-cement20240102112321.png"
    },
    {
      storeId: store2.id,
      categoryId: steel.id,
      name: "Tata Tiscon 550D TMT Steel 12mm",
      slug: "tata-tiscon-550d-tmt-12mm",
      unit: "ton",
      price: 5450000, // ₹54,500
      discount: 650000, // MRP ₹61,000 (11% off)
      stock: 45,
      deliveryEta: "Same day",
      sku: "TATA-TMT-12MM",
      imageUrl: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store.id,
      categoryId: steel.id,
      name: "JSW Neosteel Fe 550D TMT Bars 10mm",
      slug: "jsw-neosteel-fe550d-10mm",
      unit: "ton",
      price: 5380000, // ₹53,800
      discount: 580000, // MRP ₹59,600 (10% off)
      stock: 60,
      deliveryEta: "Same day",
      sku: "JSW-TMT-10MM",
      imageUrl: "https://images.unsplash.com/photo-1535813547-99c456a41d4a?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store.id,
      categoryId: bricks.id,
      name: "First-Class Red Clay Wire-Cut Bricks",
      slug: "first-class-red-clay-bricks",
      unit: "piece",
      price: 850, // ₹8.50
      discount: 150, // MRP ₹10.00 (15% off)
      stock: 8000,
      deliveryEta: "3-4 hrs",
      sku: "RCB-PREM-01",
      imageUrl: "https://images.unsplash.com/photo-1584463623578-3015579a6136?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store2.id,
      categoryId: bricks.id,
      name: "Aerocon AAC High-Strength Thermal Blocks",
      slug: "aerocon-aac-thermal-blocks",
      unit: "block",
      price: 6500, // ₹65.00
      discount: 1200, // MRP ₹77.00 (16% off)
      stock: 1200,
      deliveryEta: "4 hrs",
      sku: "AAC-BLK-600",
      imageUrl: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store.id,
      categoryId: sand.id,
      name: "River Washed Fine Plastering Sand",
      slug: "river-washed-plastering-sand",
      unit: "ton",
      price: 165000, // ₹1,650
      discount: 25000, // MRP ₹1,900 (13% off)
      stock: 140,
      deliveryEta: "3-5 hrs",
      sku: "SAND-RIV-PLAS",
      imageUrl: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store2.id,
      categoryId: sand.id,
      name: "Blue Metal Crushed Aggregate 20mm",
      slug: "blue-metal-crushed-aggregate-20mm",
      unit: "ton",
      price: 145000, // ₹1,450
      discount: 20000, // MRP ₹1,650 (12% off)
      stock: 160,
      deliveryEta: "3-5 hrs",
      sku: "AGG-20MM-BM",
      imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80"
    },

    // 2. Structured Discovery: Heavy & General Building Supplies (Tiles, Bathroom, Paints, Plumbing, Electrical)
    {
      storeId: store3.id,
      categoryId: tiles.id,
      name: "Kajaria 600x600mm Glazed Vitrified Tiles (Box of 4)",
      slug: "kajaria-600x600-vitrified-tiles",
      unit: "box",
      price: 72000, // ₹720
      discount: 13000, // MRP ₹850 (15% off)
      stock: 95,
      deliveryEta: "1-2 days",
      sku: "KAJ-GVT-600",
      imageUrl: "https://images.unsplash.com/photo-1502005229762-ee1b2b8004f8?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store3.id,
      categoryId: tiles.id,
      name: "Somany Anti-Skid Ceramic Bathroom Floor Tiles",
      slug: "somany-antiskid-bathroom-tiles",
      unit: "box",
      price: 49000, // ₹490
      discount: 9000, // MRP ₹580 (16% off)
      stock: 130,
      deliveryEta: "1-2 days",
      sku: "SOM-BATH-FLR",
      imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store.id,
      categoryId: paints.id,
      name: "Asian Paints Apex Weatherproof Exterior Emulsion 20L",
      slug: "asian-paints-apex-exterior-20l",
      unit: "bucket",
      price: 435000, // ₹4,350
      discount: 75000, // MRP ₹5,100 (15% off)
      stock: 45,
      deliveryEta: "2-4 hrs",
      sku: "AP-APEX-20L",
      imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store.id,
      categoryId: paints.id,
      name: "Birla White Wall Care Waterproof Wall Putty 40kg",
      slug: "birla-white-wall-care-putty-40kg",
      unit: "bag",
      price: 89000, // ₹890
      discount: 16000, // MRP ₹1,050 (15% off)
      stock: 110,
      deliveryEta: "2-4 hrs",
      sku: "BW-PUTTY-40KG",
      imageUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store3.id,
      categoryId: plumbing.id,
      name: "Jaquar Florentine Single Lever Chrome Basin Mixer",
      slug: "jaquar-florentine-basin-mixer",
      unit: "piece",
      price: 245000, // ₹2,450
      discount: 75000, // MRP ₹3,200 (23% off)
      stock: 28,
      deliveryEta: "4 hrs",
      sku: "JAQ-FLOR-BSN",
      imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store3.id,
      categoryId: plumbing.id,
      name: "Ashirvad CPVC High-Pressure Water Pipe 1-inch (3m)",
      slug: "ashirvad-cpvc-water-pipe-1inch",
      unit: "piece",
      price: 39500, // ₹395
      discount: 8500, // MRP ₹480 (18% off)
      stock: 150,
      deliveryEta: "2-4 hrs",
      sku: "ASH-CPVC-1IN",
      imageUrl: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store3.id,
      categoryId: plumbing.id,
      name: "Hindware Ceramic One-Piece Western Water Closet",
      slug: "hindware-ceramic-one-piece-commode",
      unit: "piece",
      price: 649900, // ₹6,499
      discount: 170100, // MRP ₹8,200 (21% off)
      stock: 18,
      deliveryEta: "Same day",
      sku: "HIND-WCL-01",
      imageUrl: "https://images.unsplash.com/photo-1585058177579-2fa52b414f62?auto=format&fit=crop&w=700&q=80"
    },
    {
      storeId: store2.id,
      categoryId: electrical.id,
      name: "Finolex 2.5 sq mm Flame Retardant Copper Wire 90m",
      slug: "finolex-2-5-sqmm-fr-copper-wire-90m",
      unit: "coil",
      price: 285000, // ₹2,850
      discount: 55000, // MRP ₹3,400 (16% off)
      stock: 75,
      deliveryEta: "2-4 hrs",
      sku: "FIN-2.5-90M",
      imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=700&q=80"
    }
  ];

  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        categoryId: item.categoryId,
        name: item.name,
        unit: item.unit
      },
      create: {
        categoryId: item.categoryId,
        name: item.name,
        slug: item.slug,
        description: `${item.name} available from verified Etukas sellers with live price check and site delivery.`,
        unit: item.unit,
        images: {
          create: {
            url: item.imageUrl,
            altText: item.name
          }
        }
      }
    });

    await prisma.storeProduct.upsert({
      where: { storeId_productId: { storeId: item.storeId, productId: product.id } },
      update: {
        priceMinor: item.price,
        discountMinor: item.discount,
        stockQuantity: item.stock,
        deliveryEta: item.deliveryEta,
        isActive: true
      },
      create: {
        storeId: item.storeId,
        productId: product.id,
        sku: item.sku,
        priceMinor: item.price,
        discountMinor: item.discount,
        stockQuantity: item.stock,
        minOrderQuantity: 1,
        deliveryEta: item.deliveryEta,
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
