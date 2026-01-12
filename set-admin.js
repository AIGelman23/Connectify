const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const email = process.argv[2];

if (!email) {
  console.error(
    "Please provide an email address: node scripts/set-admin.js <email>"
  );
  process.exit(1);
}

async function main() {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    console.log(`User ${user.email} has been promoted to ADMIN.`);
  } catch (error) {
    console.error("Error promoting user (ensure user exists):", error.message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
