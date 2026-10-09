import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  SERVER_PORT: z.coerce.number().int().positive().default(4000),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

if (parsed.data.NODE_ENV === "production") {
  if (parsed.data.JWT_ACCESS_SECRET.includes("replace") || parsed.data.JWT_REFRESH_SECRET.includes("replace")) {
    throw new Error("Production JWT secrets must be strong unique values.");
  }
  if (!parsed.data.COOKIE_SECURE) {
    throw new Error("COOKIE_SECURE=true is required in production.");
  }
}

export const env = parsed.data;
