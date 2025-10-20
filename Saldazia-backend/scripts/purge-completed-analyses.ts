(async () => {
  try {
    const db = require('../src/services/conversational/database.service').conversationalDatabaseService;

    console.log('Running dry-run for purgeOldMessagesForCompletedAnalyses (keepLastUser=false)');
    const dry = await db.purgeOldMessagesForCompletedAnalyses({ dryRun: true, keepLastUser: false });
    console.log('Dry-run summary:');
    console.log(JSON.stringify(dry, null, 2));

    // Execute
    console.log('\nExecuting purge for completed analyses (this will delete rows)');
    const exec = await db.purgeOldMessagesForCompletedAnalyses({ dryRun: false, keepLastUser: false });
    console.log('Execution summary:');
    console.log(JSON.stringify(exec, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error running purge-completed-analyses', err);
    process.exit(1);
  }
})();
