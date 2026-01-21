import { PrismaClient } from "@prisma/client";

// Use globalThis to ensure we don't create multiple instances
const globalForPrisma = globalThis;

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV !== "production"
        ? ["error", "warn"]
        : ["error"],
  });
  return client;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// In development, keep the connection alive across hot reloads
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
