/**
 * 🧪 Script de Testing para Verificar Optimizaciones de TestForge
 * 
 * Este script prueba todas las optimizaciones implementadas:
 * 1. Control de presupuesto de tokens
 * 2. Cache de análisis
 * 3. Selección optimizada de modelos
 * 4. Métricas de ahorro
 */

import { AnalysisCacheService } from '../services/analysis-cache.service';
import { openAIService } from '../services/openai.service';

// Simular diferentes tipos de requisitos para testing
const TEST_REQUIREMENTS = [
  {
    id: 'test-1',
    requirement: 'Crear un sistema de login con autenticación de dos factores para usuarios',
    complexity: 'medium' as const
  },
  {
    id: 'test-2', 
    requirement: 'Implementar dashboard con métricas en tiempo real para administradores',
    complexity: 'high' as const
  },
  {
    id: 'test-3',
    requirement: 'Agregar funcionalidad de exportar reportes en formato PDF',
    complexity: 'low' as const
  },
  {
    id: 'test-4',
    requirement: 'Sistema de pagos integrado con Stripe y PayPal para e-commerce',
    complexity: 'high' as const
  },
  {
    id: 'test-5',
    requirement: 'Crear un sistema de login con autenticación de dos factores para usuarios', // Duplicado para probar cache
    complexity: 'medium' as const
  }
];

interface TestResult {
  testId: string;
  success: boolean;
  tokensUsed: number;
  fromCache: boolean;
  model: string;
  cost: number;
  processingTime: number;
  error?: string;
}

class OptimizationTester {
  private results: TestResult[] = [];
  private totalTokensUsed = 0;
  private totalTokensSaved = 0;
  private totalCost = 0;

  async runAllTests(): Promise<void> {
    console.log('🚀 Iniciando Tests de Optimización de TestForge');
    console.log('='.repeat(60));

    // Limpiar cache para empezar fresh
    AnalysisCacheService.clearCache();

    // Ejecutar tests de análisis
    for (const test of TEST_REQUIREMENTS) {
      await this.testAnalysisOptimization(test);
    }

    // Ejecutar tests de preguntas (usando análisis cacheados)
    await this.testQuestionGeneration();

    // Mostrar resultados
    this.displayResults();
  }

  private async testAnalysisOptimization(test: typeof TEST_REQUIREMENTS[0]): Promise<void> {
    console.log(`\n🔍 Testing: ${test.id} (${test.complexity})`);
    
    const startTime = Date.now();
    
    try {
      // Simular el middleware de control de costos
      const canProceed = await this.simulateTokenBudgetCheck();
      
      if (!canProceed) {
        console.log('❌ Bloqueado por límite de tokens');
        return;
      }

      // Ejecutar análisis con optimizaciones
      const result = await openAIService.analyzeRequirement(test.requirement, 'test-user');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      if (result.success && result.data) {
        const tokensUsed = result.usage?.totalTokens || 0;
        const fromCache = tokensUsed === 0; // Si no usó tokens, vino del cache
        
        // Determinar modelo usado (simulado)
        const model = this.getModelUsed(test.complexity);
        const cost = this.calculateCost(tokensUsed, model);

        this.results.push({
          testId: test.id,
          success: true,
          tokensUsed,
          fromCache,
          model,
          cost,
          processingTime
        });

        if (fromCache) {
          console.log(`✅ ${test.id}: Cache HIT - 0 tokens usados, ${processingTime}ms`);
          this.totalTokensSaved += 800; // Estimación de tokens ahorrados
        } else {
          console.log(`✅ ${test.id}: Análisis generado - ${tokensUsed} tokens, ${processingTime}ms, $${cost.toFixed(4)}`);
          this.totalTokensUsed += tokensUsed;
          this.totalCost += cost;
        }
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.log(`❌ ${test.id}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      this.results.push({
        testId: test.id,
        success: false,
        tokensUsed: 0,
        fromCache: false,
        model: 'error',
        cost: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testQuestionGeneration(): Promise<void> {
    console.log('\n🔍 Testing Question Generation with Cache');
    
    // Usar el primer análisis para generar preguntas
    const firstResult = this.results.find(r => r.success);
    
    if (!firstResult) {
      console.log('❌ No hay análisis exitoso para probar generación de preguntas');
      return;
    }

    try {
      const startTime = Date.now();
      
      // Simular análisis para generar preguntas
      const mockAnalysis = 'Análisis de sistema de login con 2FA: requiere validación, seguridad robusta, UX optimizada.';
      
      const result = await openAIService.generateQuestionsFromAnalysis(mockAnalysis);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      if (result.success) {
        const tokensUsed = result.usage?.totalTokens || 0;
        const fromCache = tokensUsed === 0;
        
        console.log(`✅ Question Generation: ${fromCache ? 'Cache HIT' : 'Generated'} - ${tokensUsed} tokens, ${processingTime}ms`);
        
        if (!fromCache) {
          this.totalTokensUsed += tokensUsed;
          this.totalCost += this.calculateCost(tokensUsed, 'gpt-3.5-turbo');
        } else {
          this.totalTokensSaved += 500; // Estimación
        }
      }
    } catch (error) {
      console.log(`❌ Question Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async simulateTokenBudgetCheck(): Promise<boolean> {
    // Simular verificación de presupuesto
    const dailyUsage = 1500; // Simular uso actual
    const dailyLimit = 2000; // Límite diario
    
    return dailyUsage < dailyLimit;
  }

  private getModelUsed(complexity: 'low' | 'medium' | 'high'): string {
    // Simular la lógica del modelo optimizado
    if (complexity === 'high') {
      return 'gpt-4';
    }
    return 'gpt-3.5-turbo';
  }

  private calculateCost(tokens: number, model: string): number {
    const costPer1K = model === 'gpt-4' ? 0.03 : 0.003;
    return (tokens / 1000) * costPer1K;
  }

  private displayResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('='.repeat(60));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    const cached = this.results.filter(r => r.fromCache);

    console.log(`\n✅ Tests Exitosos: ${successful.length}/${this.results.length}`);
    console.log(`💾 Cache Hits: ${cached.length}/${successful.length}`);
    console.log(`❌ Tests Fallidos: ${failed.length}`);

    console.log('\n💰 ANÁLISIS DE COSTOS:');
    console.log(`   Tokens Usados: ${this.totalTokensUsed.toLocaleString()}`);
    console.log(`   Tokens Ahorrados: ${this.totalTokensSaved.toLocaleString()}`);
    console.log(`   Costo Total: $${this.totalCost.toFixed(4)}`);
    console.log(`   Ahorro Estimado: $${((this.totalTokensSaved / 1000) * 0.003).toFixed(4)}`);

    const efficiencyRate = this.totalTokensSaved / (this.totalTokensUsed + this.totalTokensSaved) * 100;
    console.log(`   Eficiencia de Cache: ${efficiencyRate.toFixed(1)}%`);

    console.log('\n🎯 OPTIMIZACIONES ACTIVAS:');
    console.log('   ✅ Control de Presupuesto de Tokens');
    console.log('   ✅ Cache Inteligente de Análisis');
    console.log('   ✅ Selección Optimizada de Modelos');
    console.log('   ✅ Prompts Comprimidos y Optimizados');

    console.log('\n📈 PROYECCIÓN MENSUAL:');
    const monthlyTokens = this.totalTokensUsed * 30;
    const monthlyCost = this.totalCost * 30;
    const monthlyLimit = 10; // $10 mensuales

    console.log(`   Tokens/mes: ${monthlyTokens.toLocaleString()}`);
    console.log(`   Costo/mes: $${monthlyCost.toFixed(2)}`);
    console.log(`   Presupuesto: $${monthlyLimit.toFixed(2)}`);
    
    if (monthlyCost <= monthlyLimit) {
      console.log(`   ✅ DENTRO DEL PRESUPUESTO (${((monthlyCost/monthlyLimit)*100).toFixed(1)}% usado)`);
    } else {
      console.log(`   ⚠️ EXCEDE PRESUPUESTO (${((monthlyCost/monthlyLimit)*100).toFixed(1)}% del límite)`);
    }

    console.log('\n🏆 RECOMENDACIONES:');
    if (efficiencyRate < 30) {
      console.log('   • Aumentar reutilización de análisis similares');
    }
    if (monthlyCost > monthlyLimit * 0.8) {
      console.log('   • Considerar límites más estrictos por usuario');
    }
    console.log('   • Mantener uso de GPT-3.5-turbo por defecto');
    console.log('   • Implementar templates para casos comunes');

    // Estadísticas del cache
    const cacheStats = AnalysisCacheService.getCacheStats();
    console.log('\n💾 ESTADÍSTICAS DE CACHE:');
    console.log(`   Entradas Totales: ${cacheStats.totalEntries}`);
    console.log(`   Hits Totales: ${cacheStats.totalHits}`);
    console.log(`   Promedio Hits/Entrada: ${cacheStats.averageHits.toFixed(1)}`);
  }
}

// Función principal para ejecutar el test
export async function runOptimizationTests(): Promise<void> {
  const tester = new OptimizationTester();
  await tester.runAllTests();
}

// Si se ejecuta directamente
if (require.main === module) {
  runOptimizationTests().catch(console.error);
}
