// 🌱 SEED DATA PARA SUPABASE - TESTFORGE AI
// =========================================
// Este script crea datos de ejemplo para probar la aplicación

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos para Supabase...');

  try {
    // 1️⃣ Crear usuario de prueba
    console.log('👤 Creando usuario de prueba...');
    
    const hashedPassword = await bcrypt.hash('testforge123', 10);
    
    const testUser = await prisma.user.upsert({
      where: { email: 'test@testforge.com' },
      update: {},
      create: {
        email: 'test@testforge.com',
        password: hashedPassword,
        name: 'Usuario de Prueba',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    console.log(`✅ Usuario creado: ${testUser.email}`);

    // 2️⃣ Crear proyecto de ejemplo
    console.log('📋 Creando proyecto de ejemplo...');
    
    const sampleProject = await prisma.project.upsert({
      where: { slug: 'ecommerce-app' },
      update: {},
      create: {
        title: 'Aplicación E-commerce Moderna',
        description: 'Sistema de comercio electrónico con carrito de compras, pagos y gestión de inventario',
        slug: 'ecommerce-app',
        status: 'ACTIVE',
        isPublic: true,
        analysisEnabled: true,
        userId: testUser.id,
        tags: ['ecommerce', 'react', 'nodejs', 'prisma'],
        settings: {
          allowPublicAccess: true,
          enableNotifications: true,
          defaultPriority: 'MEDIUM'
        }
      },
    });

    console.log(`✅ Proyecto creado: ${sampleProject.title}`);

    // 3️⃣ Crear análisis conversacional de ejemplo
    console.log('🤖 Creando análisis conversacional...');
    
    const sampleAnalysis = await prisma.conversationalAnalysis.create({
      data: {
        title: 'Análisis de Carrito de Compras',
        description: 'Análisis detallado del flujo de carrito de compras para la aplicación e-commerce',
        epicContent: `
Como usuario de la tienda online,
Quiero poder agregar productos a mi carrito de compras,
Para poder comprar múltiples productos en una sola transacción,
Y así tener una experiencia de compra eficiente.

Criterios de aceptación:
- Debo poder ver una lista de productos disponibles
- Debo poder agregar productos al carrito con cantidad específica
- Debo poder ver el contenido actual de mi carrito
- Debo poder modificar cantidades o eliminar productos
- Debo poder proceder al checkout cuando esté listo
        `,
        currentPhase: 'ANALYSIS',
        status: 'IN_PROGRESS',
        completeness: 0.75,
        complexity: 'MEDIUM',
        aiModel: 'gpt-4o-mini',
        tokenConsumption: 1500,
        costEstimate: 0.02,
        userId: testUser.id,
        startedAt: new Date(),
      },
    });

    console.log(`✅ Análisis creado: ${sampleAnalysis.title}`);

    // 4️⃣ Crear mensajes del chat
    console.log('💬 Creando mensajes del chat...');
    
    const messages = [
      {
        content: '¿Qué funcionalidades específicas necesita el carrito de compras?',
        role: 'ASSISTANT' as const,
        messageType: 'QUESTION' as const,
        category: 'FUNCTIONAL_REQUIREMENTS' as any,
        isImportant: true,
        tokenCount: 15,
        confidence: 0.9,
      },
      {
        content: 'El carrito debe permitir agregar productos, modificar cantidades, aplicar cupones de descuento y calcular totales con impuestos.',
        role: 'USER' as const,
        messageType: 'ANSWER' as const,
        tokenCount: 25,
        confidence: 1.0,
      },
      {
        content: '¿Cómo debe comportarse el carrito si el usuario cierra la sesión?',
        role: 'ASSISTANT' as const,
        messageType: 'CLARIFICATION' as const,
        category: 'DATA_HANDLING' as any,
        isImportant: true,
        tokenCount: 18,
        confidence: 0.85,
      },
      {
        content: 'El carrito debe persistir en la base de datos para usuarios registrados, y en localStorage para invitados.',
        role: 'USER' as const,
        messageType: 'ANSWER' as const,
        tokenCount: 22,
        confidence: 1.0,
      }
    ];

    for (const message of messages) {
      await prisma.conversationalMessage.create({
        data: {
          ...message,
          analysisId: sampleAnalysis.id,
        },
      });
    }

    console.log(`✅ ${messages.length} mensajes creados`);

    // 5️⃣ Crear casos de prueba
    console.log('🧪 Creando casos de prueba...');
    
    const testCases = [
      {
        title: 'Agregar producto al carrito',
        description: 'Verificar que un usuario puede agregar un producto al carrito y que se actualiza el contador',
        priority: 'HIGH',
        category: 'FUNCTIONAL',
        estimatedDuration: 15,
        generatedByAI: true,
        aiConfidence: 0.9,
        reviewStatus: 'APPROVED',
      },
      {
        title: 'Modificar cantidad en carrito',
        description: 'Verificar que el usuario puede cambiar la cantidad de productos en el carrito',
        priority: 'MEDIUM',
        category: 'FUNCTIONAL',
        estimatedDuration: 10,
        generatedByAI: true,
        aiConfidence: 0.85,
        reviewStatus: 'PENDING',
      },
      {
        title: 'Persistencia del carrito',
        description: 'Verificar que el carrito se mantiene después de cerrar y abrir la sesión',
        priority: 'HIGH',
        category: 'INTEGRATION',
        estimatedDuration: 20,
        generatedByAI: true,
        aiConfidence: 0.95,
        reviewStatus: 'APPROVED' as const,
      }
    ];

    for (const testCase of testCases) {
      await prisma.testCase.create({
        data: {
          ...testCase,
          conversationalAnalysisId: sampleAnalysis.id,
          userId: testUser.id,
        },
      });
    }

    console.log(`✅ ${testCases.length} casos de prueba creados`);

    // 6️⃣ Crear resumen de análisis
    console.log('📊 Creando resumen de análisis...');
    
    await prisma.analysisSummit.create({
      data: {
        conversationalAnalysisId: sampleAnalysis.id,
        refinedRequirements: {
          functional: [
            'Agregar productos al carrito',
            'Modificar cantidades',
            'Eliminar productos',
            'Aplicar cupones de descuento',
            'Calcular totales con impuestos'
          ],
          nonFunctional: [
            'Tiempo de respuesta < 200ms',
            'Disponibilidad 99.9%',
            'Soporte para 10,000 usuarios concurrentes'
          ]
        },
        functionalAspects: {
          coreFeatures: ['Agregar', 'Modificar', 'Eliminar', 'Calcular'],
          userFlows: ['Ver productos', 'Agregar al carrito', 'Checkout'],
          integrations: ['Sistema de pagos', 'Inventario', 'Usuarios']
        },
        nonFunctionalAspects: {
          performance: { responseTime: '< 200ms', throughput: '1000 rps' },
          security: { authentication: 'JWT', authorization: 'RBAC' },
          usability: { accessibility: 'WCAG 2.1', mobile: 'Responsive' }
        },
        identifiedRisks: {
          high: ['Concurrencia en inventario', 'Seguridad de pagos'],
          medium: ['Performance bajo carga', 'Experiencia móvil'],
          low: ['Compatibilidad de navegadores']
        },
        businessRules: [
          'Solo productos en stock pueden agregarse al carrito',
          'Carrito expira después de 30 días de inactividad',
          'Descuentos no se acumulan'
        ],
        acceptanceCriteria: [
          'Usuario puede agregar productos al carrito',
          'Carrito muestra total correcto',
          'Carrito persiste entre sesiones'
        ],
        suggestedTestCases: testCases.map(tc => tc.title),
        completenessScore: 0.85,
        qualityScore: 0.9,
        riskLevel: 'MEDIUM',
      },
    });

    console.log('✅ Resumen de análisis creado');

    // 7️⃣ Crear métricas de IA
    console.log('📈 Creando métricas de IA...');
    
    await prisma.aIUsageMetric.create({
      data: {
        userId: testUser.id,
        requestType: 'analysis_generation',
        model: 'gpt-4o-mini',
        endpoint: '/api/conversational-analysis',
        promptTokens: 800,
        completionTokens: 1200,
        totalTokens: 2000,
        estimatedCost: 0.02,
        responseTime: 1500,
        success: true,
      },
    });

    console.log('✅ Métricas de IA creadas');

    // 8️⃣ Crear historial de conversación
    console.log('📝 Creando historial de conversación...');
    
    await prisma.conversationHistory.create({
      data: {
        conversationKey: `analysis-${sampleAnalysis.id}`,
        messages: {
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: new Date().toISOString()
          }))
        },
        sessionDuration: 1800, // 30 minutos
        messageCount: messages.length,
        analysisId: sampleAnalysis.id,
        userId: testUser.id,
      },
    });

    console.log('✅ Historial de conversación creado');

    console.log('\n🎉 ¡Seed completado exitosamente!');
    console.log('\n📊 DATOS CREADOS:');
    console.log(`   👤 Usuario: test@testforge.com / testforge123`);
    console.log(`   📋 Proyecto: ${sampleProject.title}`);
    console.log(`   🤖 Análisis: ${sampleAnalysis.title}`);
    console.log(`   💬 Mensajes: ${messages.length}`);
    console.log(`   🧪 Test Cases: ${testCases.length}`);
    console.log(`   📊 Resumen completo generado`);
    console.log('\n🚀 ¡Listo para probar la aplicación!');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
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