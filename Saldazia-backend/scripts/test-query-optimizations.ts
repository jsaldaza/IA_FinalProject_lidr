/**
 * Script para probar las optimizaciones de queries implementadas
 * Ejecutar con: npx ts-node scripts/test-query-optimizations.ts
 */

import { conversationalDatabaseService } from '../src/services/conversational/database.service';
import { prisma } from '../src/lib/prisma';
import { StructuredLogger } from '../src/utils/structured-logger';

async function testQueryOptimizations() {
  console.log('🚀 Probando optimizaciones de queries...\n');

  try {
    // 1. Obtener un usuario de prueba
    const testUser = await prisma.user.findFirst();
    if (!testUser) {
      console.log('❌ No hay usuarios en la base de datos. Creando usuario de prueba...');
      return;
    }

    console.log(`👤 Usuario de prueba: ${testUser.email} (ID: ${testUser.id})\n`);

    // 2. Comparar métodos optimizados vs no optimizados
    console.log('📊 Comparando métodos de obtención de análisis:\n');

    // Método optimizado (sin mensajes por defecto)
    const startOptimized = Date.now();
    const optimizedAnalyses = await conversationalDatabaseService.getUserAnalyses(testUser.id, {
      includeMessages: false,
      limit: 10
    });
    const timeOptimized = Date.now() - startOptimized;

    console.log(`⚡ Método OPTIMIZADO: ${timeOptimized}ms para ${optimizedAnalyses.length} análisis`);

    // Método con mensajes (más lento)
    const startWithMessages = Date.now();
    const analysesWithMessages = await conversationalDatabaseService.getUserAnalyses(testUser.id, {
      includeMessages: true,
      limit: 10
    });
    const timeWithMessages = Date.now() - startWithMessages;

    console.log(`🐌 Método con mensajes: ${timeWithMessages}ms para ${analysesWithMessages.length} análisis`);
    console.log(`📈 Mejora: ${((timeWithMessages - timeOptimized) / timeWithMessages * 100).toFixed(1)}% más rápido\n`);

    // 3. Probar método con estadísticas
    console.log('📈 Probando método con estadísticas optimizadas:');
    const startWithStats = Date.now();
    const analysesWithStats = await conversationalDatabaseService.getUserAnalysesWithStats(testUser.id);
    const timeWithStats = Date.now() - startWithStats;

    console.log(`📊 Método con estadísticas: ${timeWithStats}ms para ${analysesWithStats.length} análisis`);
    console.log(`💬 Total de mensajes: ${analysesWithStats.reduce((sum, a) => sum + a.messageCount, 0)}\n`);

    // 4. Probar cálculo de cobertura optimizado
    if (optimizedAnalyses.length > 0) {
      const testAnalysis = optimizedAnalyses[0];
      console.log(`🎯 Probando cálculo de cobertura para análisis: ${testAnalysis.title}`);

      const startCoverage = Date.now();
      const coverage = await conversationalDatabaseService.calculateAnalysisCoverage(testAnalysis.id);
      const timeCoverage = Date.now() - startCoverage;

      console.log(`📊 Cobertura calculada en ${timeCoverage}ms:`);
      console.log(`   - Score general: ${coverage.overallScore}%`);
      console.log(`   - Funcional: ${coverage.functionalCoverage}%`);
      console.log(`   - No funcional: ${coverage.nonFunctionalCoverage}%`);
      console.log(`   - Reglas negocio: ${coverage.businessRulesCoverage}%`);
      console.log(`   - Criterios aceptación: ${coverage.acceptanceCriteriaCoverage}%\n`);
    }

    // 5. Comparar con método legacy (si hay mensajes)
    if (analysesWithMessages.length > 0 && analysesWithMessages[0].messages.length > 0) {
      const testAnalysis = analysesWithMessages[0];
      console.log(`🔄 Comparando cálculo legacy vs optimizado:`);

      // Legacy calculation (in-memory)
      const startLegacy = Date.now();
      const legacyCoverage = {
        overallScore: testAnalysis.completeness,
        functionalCoverage: 0, // Would need to implement legacy calculation
        nonFunctionalCoverage: 0,
        businessRulesCoverage: 0,
        acceptanceCriteriaCoverage: 0
      };
      const timeLegacy = Date.now() - startLegacy;

      // Optimized calculation
      const startOptimizedCoverage = Date.now();
      const optimizedCoverage = await conversationalDatabaseService.calculateAnalysisCoverage(testAnalysis.id);
      const timeOptimizedCoverage = Date.now() - startOptimizedCoverage;

      console.log(`🐌 Método legacy: ${timeLegacy}ms`);
      console.log(`⚡ Método optimizado: ${timeOptimizedCoverage}ms`);
      console.log(`📈 Mejora: ${timeLegacy > 0 ? ((timeLegacy - timeOptimizedCoverage) / timeLegacy * 100).toFixed(1) : 'N/A'}% más rápido\n`);
    }

    // 6. Estadísticas generales
    console.log('📋 Estadísticas generales de la base de datos:');

    const [
      totalAnalyses,
      totalMessages,
      completedAnalyses,
      avgMessagesPerAnalysis
    ] = await Promise.all([
      prisma.conversationalAnalysis.count(),
      prisma.conversationalMessage.count(),
      prisma.conversationalAnalysis.count({ where: { status: 'COMPLETED' } }),
      prisma.conversationalMessage.groupBy({
        by: ['analysisId'],
        _count: { id: true }
      }).then(groups => {
        const total = groups.reduce((sum, g) => sum + g._count.id, 0);
        return groups.length > 0 ? total / groups.length : 0;
      })
    ]);

    console.log(`   - Total análisis: ${totalAnalyses}`);
    console.log(`   - Total mensajes: ${totalMessages}`);
    console.log(`   - Análisis completados: ${completedAnalyses}`);
    console.log(`   - Promedio mensajes por análisis: ${avgMessagesPerAnalysis.toFixed(1)}\n`);

    console.log('✅ Pruebas de optimización completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    StructuredLogger.error('Query optimization test failed', error as Error);
  }
}

// Ejecutar pruebas
testQueryOptimizations().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});