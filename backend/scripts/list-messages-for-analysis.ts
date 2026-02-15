import { prisma } from '../src/lib/prisma';

(async () => {
  try {
    const id = process.argv[2];
    if (!id) {
      console.error('Usage: npx ts-node scripts/list-messages-for-analysis.ts <analysisId>');
      process.exit(1);
    }

    await prisma.$connect();
    const analysis = await prisma.conversationalAnalysis.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!analysis) {
      console.error('Analysis not found', id);
      await prisma.$disconnect();
      process.exit(1);
    }

    const out = (analysis.messages || []).map(m => ({
      id: m.id,
      role: m.role,
      messageType: m.messageType,
      createdAt: m.createdAt,
      contentPreview: String(m.content || '').slice(0, 1000)
    }));

    console.log(JSON.stringify({ analysisId: id, totalMessages: out.length, messages: out }, null, 2));
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing messages for analysis', err);
    process.exit(1);
  }
})();
