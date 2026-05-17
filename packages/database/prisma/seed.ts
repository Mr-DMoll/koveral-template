import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "bcryptjs";
const { hash } = pkg;
import { PrismaClient } from "../generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("❌ DATABASE_URL missing from .env");
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);

  try {
    console.log("🌱 Starting Seeding...");

    const email = "owner@obit.com";
    const rawPassword = process.env.INITIAL_SUPERADMIN_PASSWORD;

    if (!rawPassword) {
      throw new Error("❌ INITIAL_SUPERADMIN_PASSWORD missing from .env");
    }

    console.log(`🔑 Hashing password for: ${email}`);
    const hashedPassword = await hash(rawPassword, 12);

    // Simple upsert with minimal fields first
    const superAdmin = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: "SUPER_ADMIN",
        accountStatus: "ACTIVE",
      },
      create: {
        email,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        accountStatus: "ACTIVE",
        firstName: "Katlego",
        lastName: "Admin",
      },
    });

    console.log("✅ Super Admin synchronized:", superAdmin.email);
    console.log("✅ Seeding complete.");
  } catch (error: any) {
    console.error("❌ Seed Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();