import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import dotenv from "dotenv";

const workspaceRoot = path.basename(process.cwd()).toLowerCase() === "server"
  ? path.resolve(process.cwd(), "..")
  : process.cwd();
dotenv.config({ path: path.join(workspaceRoot, ".env") });

const prisma = new PrismaClient();

function promptHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    return Promise.reject(new Error("Run this command in an interactive terminal to enter the password securely."));
  }

  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(label);

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Admin setup cancelled."));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
      } else if (key.name === "backspace") {
        value = value.slice(0, -1);
        process.stdout.write("\b \b");
      } else if (!key.ctrl && character) {
        value += character;
        process.stdout.write("*");
      }
    };
    process.stdin.on("keypress", onKeypress);
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Use your local .env file or load it with your deployment CLI.");
  }

  const prompts = createInterface({ input: process.stdin, output: process.stdout });
  let name: string;
  let email: string;
  let mobile: string;
  try {
    name = (await prompts.question("Admin name: ")).trim();
    email = (await prompts.question("Admin email: ")).trim().toLowerCase();
    mobile = (await prompts.question("Admin mobile: ")).trim();
  } finally {
    prompts.close();
  }

  const password = await promptHidden("Password (minimum 14 characters): ");
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || mobile.length < 8 || mobile.length > 20) {
    throw new Error("Enter a valid name, email address, and mobile number.");
  }
  if (password.length < 14 || password.length > 128) {
    throw new Error("Admin passwords must be between 14 and 128 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  const mobileOwner = await prisma.user.findUnique({ where: { mobile } });
  if (mobileOwner && mobileOwner.id !== existing?.id) {
    throw new Error("That mobile number is already assigned to another account.");
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          email,
          mobile,
          passwordHash,
          roles: [...new Set([...existing.roles, Role.ADMIN])],
          refreshTokenHash: null,
          isActive: true
        }
      })
    : await prisma.user.create({
        data: { name, email, mobile, passwordHash, roles: [Role.ADMIN] }
      });

  await prisma.auditLog.create({
    data: { actorId: user.id, action: "ADMIN_ACCOUNT_PROVISIONED", target: user.id }
  });
  console.log(`Admin account ready for ${user.email}. Run this command again with different details for each employee.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Admin account setup failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
