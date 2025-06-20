import { PrismaClient } from "@prisma/client";

// Add detailed logging to help diagnose issues
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "event",
        level: "error",
      },
      {
        emit: "event",
        level: "info",
      },
      {
        emit: "event",
        level: "warn",
      },
    ],
  });
};

// Use globalThis to ensure we don't create multiple instances
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Add event listeners for debugging
if (process.env.NODE_ENV !== "production") {
  prisma.$on("query", (e) => {
    console.log("Query: " + e.query);
    console.log("Duration: " + e.duration + "ms");
  });

  prisma.$on("error", (e) => {
    console.error("Prisma Error:", e);
  });
}

export default prisma;

// In development, keep the connection alive across hot reloads
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
