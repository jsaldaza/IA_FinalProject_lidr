#!/usr/bin/env node
const { prisma } =
  require("../dist/src/lib/prisma") || require("../src/lib/prisma");

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        createdAt: true,
      },
    });
    console.log("users count:", users.length);
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error querying users:", err);
    process.exit(1);
  }
}

main();
