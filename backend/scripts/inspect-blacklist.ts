import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    await prisma.$connect();
    const rows = await prisma.blacklistedToken.findMany({ take: 50 });
    console.log('blacklistedToken count:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error querying blacklistedToken:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
