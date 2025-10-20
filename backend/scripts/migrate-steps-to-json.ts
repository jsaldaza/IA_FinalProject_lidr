import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateTestStrategySteps() {
    const strategies = await prisma.testStrategy.findMany();

    for (const strategy of strategies) {
        if (typeof strategy.steps === 'string') {
            try {
                const parsed = JSON.parse(strategy.steps);
                const stepsArray = Array.isArray(parsed) ? parsed : [parsed];
                await prisma.testStrategy.update({
                    where: { id: strategy.id },
                    data: { steps: stepsArray }
                });
                console.log(`Migrated steps for strategy ${strategy.id}`);
            } catch (e) {
                console.error(`Failed to parse steps for strategy ${strategy.id}:`, e);
            }
        }
    }
}

async function migrateTestScenarioSteps() {
    const scenarios = await prisma.testScenario.findMany();

    for (const scenario of scenarios) {
        if (typeof scenario.steps === 'string') {
            try {
                const parsed = JSON.parse(scenario.steps);
                const stepsArray = Array.isArray(parsed) ? parsed : [parsed];
                await prisma.testScenario.update({
                    where: { id: scenario.id },
                    data: { steps: stepsArray }
                });
                console.log(`Migrated steps for scenario ${scenario.id}`);
            } catch (e) {
                console.error(`Failed to parse steps for scenario ${scenario.id}:`, e);
            }
        }
    }
}

async function main() {
    await migrateTestStrategySteps();
    await migrateTestScenarioSteps();
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
}); 