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
  console.log("🌱 Seeding database...");

  // Create default system settings
  await prisma.systemSetting.upsert({
    where:  { key: "registration_mode" },
    update: {},
    create: { key: "registration_mode", value: "INVITE_ONLY" },
  });

  await prisma.systemSetting.upsert({
    where:  { key: "app_name" },
    update: {},
    create: { key: "app_name", value: "My App" },
  });

  // Create super admin
  const password = await bcrypt.hash("SuperAdmin123!", 12);

  const superAdmin = await prisma.user.upsert({
    where:  { email: "superadmin@example.com" },
    update: {},
    create: {
      email:         "superadmin@example.com",
      password,
      role:          "SUPER_ADMIN",
      accountStatus: "ACTIVE",
      firstName:     "Super",
      lastName:      "Admin",
      displayName:   "Super Admin",
    },
  });

  console.log(`✅ Super admin: ${superAdmin.email}`);
  console.log(`   Password: SuperAdmin123!`);
  console.log(`\n⚠️  Change this password immediately after first login!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());