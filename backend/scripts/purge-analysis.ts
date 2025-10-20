(async () => {
  try {
    const id = process.argv[2];
    if (!id) {
      console.error('Usage: npx ts-node scripts/purge-analysis.ts <analysisId>');
      process.exit(1);
    }

    const db = require('../src/services/conversational/database.service').conversationalDatabaseService;

    console.log('Running dry-run purge for analysis:', id);
    const dry = await db.purgeMessagesForAnalysis(id, { dryRun: true, keepLastAssistant: true, keepLastUser: false });
    console.log('Dry-run result:');
    console.log(JSON.stringify(dry, null, 2));

    // Proceed to execute deletion
    console.log('\nProceeding to delete messages (keepLastAssistant = true, keepLastUser = false)');
    const exec = await db.purgeMessagesForAnalysis(id, { dryRun: false, keepLastAssistant: true, keepLastUser: false });
    console.log('Execution result:');
    console.log(JSON.stringify(exec, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error running purge script', err);
    process.exit(1);
  }
})();
