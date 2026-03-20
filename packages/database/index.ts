import { PrismaClient } from "@prisma/client";

// This exports OtpType, Role, User, etc. to the whole monorepo
export * from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaInstance =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
export default prismaInstance;




