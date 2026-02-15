import { prisma } from '../src/lib/prisma';

(async () => {
  try {
    await prisma.$connect();
    const analyses = await prisma.conversationalAnalysis.findMany({
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    });

    const results = analyses.map(a => {
      const total = (a.messages || []).length;
      const lastAssistant = [...(a.messages || [])].reverse().find(m => (m.role || '').toLowerCase() === 'assistant');
      const lastAssistantPreview = lastAssistant ? (String(lastAssistant.content || '').substring(0, 240)) : null;
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        totalMessages: total,
        lastAssistantPreview
      };
    });

    console.log(JSON.stringify(results, null, 2));
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing analyses', err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
