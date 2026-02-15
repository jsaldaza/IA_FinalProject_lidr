// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAI } from 'openai';
import { configService } from './config.service';
import { prisma } from '../lib/prisma';
const { StructuredLogger } = require('../utils/structured-logger');

const openai = new OpenAI({ apiKey: configService.getOpenAIConfig().apiKey });

export interface TestCaseGenerationRequest {
  projectId: string;
  userId: string;
}

export interface TestCaseGenerationFromAnalysisRequest {
  analysisId: string;
  userId: string;
}

export interface TestCaseGenerationFromConversationalAnalysisRequest {
  conversationalAnalysisId: string;
  userId: string;
}

export interface GeneratedTestCase {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
}

export interface TestCaseGenerationResult {
  success: boolean;
  testCases: GeneratedTestCase[];
  errors: string[];
}

/**
 * Servicio experto para generar casos de prueba desde proyectos
 */
export class TestCaseGenerationService {
  
  /**
   * Genera casos de prueba automáticamente desde un proyecto
   */
  static async generateTestCasesFromProject(
    request: TestCaseGenerationRequest
  ): Promise<TestCaseGenerationResult> {
    try {
  StructuredLogger.info('🧪 GENERATE TEST CASES: Iniciando generación desde proyecto', { projectId: request.projectId, userId: request.userId });

      // 1. Obtener el proyecto con sus análisis asociados
      const project = await prisma.project.findFirst({
        where: {
          id: request.projectId,
          userId: request.userId,
        },
        include: {
          analyses: {
            where: {
              status: 'COMPLETED'
            },
            include: {
              questions: true,
              testStrategies: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!project) {
        return {
          success: false,
          testCases: [],
          errors: ['Proyecto no encontrado o sin acceso']
        };
      }

      if (!project.analyses || project.analyses.length === 0) {
        return {
          success: false,
          testCases: [],
          errors: ['Proyecto no tiene análisis completados']
        };
      }

      // 2. Usar el análisis más reciente del proyecto
      const latestAnalysis = project.analyses[0];

      // 3. Construir el contexto para la IA
      const context = this.buildProjectContext(project, latestAnalysis);
      
  // 4. Generar casos de prueba usando IA
  const generatedCases = await this.generateWithAI(context);

  // 5. Refinar, normalizar y completar con heurísticas si hace falta
  const refinedCases = this.refineAndCompleteCases(generatedCases, project as any, latestAnalysis as any);

  // 6. Guardar casos generados en la base de datos
  const savedTestCases = await this.saveTestCasesFromAnalysis(refinedCases, request.userId, latestAnalysis.id);
      
  StructuredLogger.info(`✅ GENERATE TEST CASES: ${savedTestCases.length} casos generados y guardados`, { projectId: request.projectId, userId: request.userId });
      
      return {
        success: true,
        testCases: savedTestCases,
        errors: []
      };
      
    } catch (error) {
  StructuredLogger.error('❌ GENERATE TEST CASES: Error en generación', error, { projectId: request.projectId, userId: request.userId });
      return {
        success: false,
        testCases: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Genera casos de prueba automáticamente desde un análisis
   */
  static async generateTestCasesFromAnalysis(
    request: TestCaseGenerationFromAnalysisRequest
  ): Promise<TestCaseGenerationResult> {
    try {
  StructuredLogger.info('🧪 GENERATE TEST CASES: Iniciando generación desde análisis', { analysisId: request.analysisId, userId: request.userId });

      // 1. Obtener el análisis y su proyecto (si existe)
      const analysis = await prisma.analysis.findFirst({
        where: { id: request.analysisId, userId: request.userId, status: 'COMPLETED' },
        include: { questions: true, testStrategies: true, project: true }
      });

      if (!analysis) {
        return { success: false, testCases: [], errors: ['Análisis no encontrado o no está COMPLETED'] };
      }

      const project = analysis.project || { name: 'Proyecto', description: '' } as any;

      // 2. Construir el contexto para la IA
      const context = this.buildProjectContext(project, analysis);

      // 3. Generar casos de prueba usando IA
      const generatedCases = await this.generateWithAI(context);

      // 4. Refinar y completar
      const refinedCases = this.refineAndCompleteCases(generatedCases, project as any, analysis as any);

      // 5. Guardar casos generados en la base de datos
      const savedTestCases = await this.saveTestCasesFromAnalysis(refinedCases, request.userId, analysis.id);

  StructuredLogger.info(`✅ GENERATE TEST CASES: ${savedTestCases.length} casos generados y guardados (desde análisis)`, { analysisId: request.analysisId, userId: request.userId });

      return { success: true, testCases: savedTestCases, errors: [] };
    } catch (error) {
  StructuredLogger.error('❌ GENERATE TEST CASES (analysis): Error en generación', error, { analysisId: request.analysisId, userId: request.userId });
      return { success: false, testCases: [], errors: [error instanceof Error ? error.message : 'Error desconocido'] };
    }
  }

  /**
   * Genera casos de prueba automáticamente desde un análisis conversacional (NUEVO MÉTODO PRINCIPAL)
   */
  static async generateTestCasesFromConversationalAnalysis(
    request: TestCaseGenerationFromConversationalAnalysisRequest
  ): Promise<TestCaseGenerationResult> {
    try {
  StructuredLogger.info('🧪 GENERATE TEST CASES: Iniciando generación desde análisis conversacional', { conversationalAnalysisId: request.conversationalAnalysisId, userId: request.userId });

      // 1. Obtener el análisis conversacional completado
      const conversationalAnalysis = await prisma.conversationalAnalysis.findFirst({
        where: { 
          id: request.conversationalAnalysisId, 
          userId: request.userId, 
          OR: [
            { status: 'COMPLETED' },
            { currentPhase: 'COMPLETED' }
          ]
        },
        include: { 
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10 // Reducir a 10 mensajes para evitar sobrecarga
          }
        }
      });

      if (!conversationalAnalysis) {
        // Fallback: buscar el proyecto sin restricción de estado para debug
        const anyProject = await prisma.conversationalAnalysis.findFirst({
          where: { 
            id: request.conversationalAnalysisId, 
            userId: request.userId
          }
        });

        if (!anyProject) {
          return { 
            success: false, 
            testCases: [], 
            errors: ['Proyecto no encontrado o no tienes acceso a él'] 
          };
        } else {
          return { 
            success: false, 
            testCases: [], 
            errors: [`Proyecto encontrado pero no está completado. Estado actual: ${anyProject.status}, Fase: ${anyProject.currentPhase}`] 
          };
        }
      }

      // 2. Construir el contexto para la IA usando el análisis conversacional
      const context = this.buildConversationalAnalysisContext(conversationalAnalysis);

      // 3. Generar casos de prueba usando IA
      const generatedCases = await this.generateWithAI(context);

      // 4. Refinar y completar
      const refinedCases = this.refineAndCompleteCasesFromConversational(generatedCases, conversationalAnalysis);

      // 5. Guardar casos generados en la base de datos (nueva versión para conversational)
      const savedTestCases = await this.saveTestCasesFromConversational(refinedCases, request.userId, conversationalAnalysis.id);

  StructuredLogger.info(`✅ GENERATE TEST CASES: ${savedTestCases.length} casos generados y guardados (desde análisis conversacional)`, { conversationalAnalysisId: request.conversationalAnalysisId, userId: request.userId });

      return { success: true, testCases: savedTestCases, errors: [] };
    } catch (error) {
  StructuredLogger.error('❌ GENERATE TEST CASES (conversational): Error en generación', error, { conversationalAnalysisId: request.conversationalAnalysisId, userId: request.userId });
      return { success: false, testCases: [], errors: [error instanceof Error ? error.message : 'Error desconocido'] };
    }
  }

  /**
   * Construye el contexto del proyecto para la IA
   */
  private static buildProjectContext(project: any, analysis: any): string {
    const contextParts = [
      `INFORMACIÓN DEL PROYECTO:`,
      `Nombre: ${project.name}`,
      `Descripción: ${project.description || 'No especificada'}`,
      ``,
      `ANÁLISIS DE REQUISITOS:`,
      `Requisito: ${analysis.requirement}`,
      `Resumen: ${analysis.summary}`,
      ``
    ];

    // Agregar preguntas si existen
    if (analysis.questions && analysis.questions.length > 0) {
      contextParts.push(`PREGUNTAS CLAVE:`);
      analysis.questions.forEach((q: any, index: number) => {
        contextParts.push(`${index + 1}. ${q.content}`);
        if (q.answer) {
          contextParts.push(`   Respuesta: ${q.answer}`);
        }
      });
      contextParts.push('');
    }

    // Agregar estrategias de prueba si existen
    if (analysis.testStrategies && analysis.testStrategies.length > 0) {
      contextParts.push(`ESTRATEGIAS DE PRUEBA:`);
      analysis.testStrategies.forEach((strategy: any, index: number) => {
        contextParts.push(`${index + 1}. ${strategy.title}: ${strategy.description}`);
      });
      contextParts.push('');
    }

    // Agregar red flags si existen
    if (analysis.redFlags && analysis.redFlags.length > 0) {
      contextParts.push(`ASPECTOS CRÍTICOS A CONSIDERAR:`);
      analysis.redFlags.forEach((flag: string, index: number) => {
        contextParts.push(`${index + 1}. ${flag}`);
      });
    }

    return contextParts.join('\n');
  }

  /**
   * Construye el contexto del análisis conversacional para la IA (MEJORADO)
   */
  private static buildConversationalAnalysisContext(conversationalAnalysis: any): string {
    const contextParts = [
      `INFORMACIÓN DEL PROYECTO:`,
      `Título: ${conversationalAnalysis.title}`,
      `Descripción: ${conversationalAnalysis.description || 'No especificada'}`,
      `Estado: ${conversationalAnalysis.status} (${conversationalAnalysis.completeness}% completado)`,
      ``,
    ];

    // 🔥 PRIORIDAD 1: Usar el análisis final guardado en epicContent (cuando proyecto está completado)
    if (conversationalAnalysis.status === 'COMPLETED' && conversationalAnalysis.epicContent) {
      contextParts.push(`LEVANTAMIENTO DE REQUISITOS FINALIZADO:`);
      contextParts.push(conversationalAnalysis.epicContent);
      contextParts.push(``);
    } else {
      // FALLBACK: Usar descripción original si no hay análisis final
      contextParts.push(`CONTENIDO ÉPICO/REQUISITOS INICIAL:`);
      contextParts.push(conversationalAnalysis.description || 'No especificado');
      contextParts.push(``);
    }

    // Agregar contexto adicional de la conversación solo si es relevante
    if (conversationalAnalysis.messages && conversationalAnalysis.messages.length > 0) {
      contextParts.push(`CONTEXTO ADICIONAL DE LA CONVERSACIÓN:`);
      
      // Filtrar solo mensajes finales del asistente que contengan análisis estructurado
      const finalAnalysisMessages = conversationalAnalysis.messages
        .filter((msg: any) => 
          msg.role === 'ASSISTANT' && 
          (msg.content.includes('=== LEVANTAMIENTO') || 
           msg.content.includes('=== FIN LEVANTAMIENTO') ||
           msg.content.includes('Roles del sistema') ||
           msg.content.includes('Reglas de negocio') ||
           msg.content.includes('Requisitos funcionales'))
        )
        .slice(0, 1); // Solo el mensaje más relevante
      
      if (finalAnalysisMessages.length > 0) {
        const finalMsg = finalAnalysisMessages[0];
        const preview = finalMsg.content.length > 500 
          ? finalMsg.content.substring(0, 500) + '...' 
          : finalMsg.content;
        contextParts.push(preview);
        contextParts.push('');
      }
    }

    contextParts.push(`NOTA: Este proyecto completó un levantamiento de requisitos mediante análisis conversacional con IA. Usa esta información estructurada para generar casos de prueba comprehensivos.`);

    return contextParts.join('\n');
  }

  /**
   * Genera casos de prueba usando IA (OpenAI)
   */
  private static async generateWithAI(context: string): Promise<GeneratedTestCase[]> {
    const prompt = `
Eres un Experto en QA y Testing con más de 20 años de experiencia diseñando casos de prueba efectivos en múltiples dominios (finanzas, e‑commerce, SaaS, educación, salud, OTT, CRM, etc.).

Objetivo:
- A partir del contexto del proyecto y su análisis de requisitos, genera un conjunto sólido de casos de prueba descriptivos que cubran los principales riesgos y funcionalidades.

Lineamientos obligatorios:
1) Enfócate en QUÉ validar, no en CÓMO: no escribas pasos detallados; describe la intención de la prueba.
2) Redacta títulos y descripciones en español, claros y específicos, evitando ambigüedades.
3) Varía las categorías para cubrir perspectivas funcionales y no funcionales cuando corresponda.
4) Asigna prioridad según impacto y probabilidad: CRITICAL (fallo detiene negocio), HIGH (afecta funcionalidades clave), MEDIUM (impacto moderado), LOW (menor impacto).
5) Evita duplicados: cada “title” debe ser único y no solaparse con otros.
6) Adapta los casos al dominio y a la información provista (requisitos, preguntas y respuestas, estrategias, red flags).
7) Cantidad: genera entre 12 y 18 casos relevantes. Si el contexto es muy acotado, al menos 10.
8) Salida estricta: responde SOLO un arreglo JSON válido, sin texto adicional, sin comentarios y SIN bloques de Markdown.

Guías de redacción:
- title: conciso (máx. ~80 caracteres) y autoexplicativo.
- description: 120–200 caracteres aprox., indicando condición, alcance y validación esperada.
- priority: uno de "LOW", "MEDIUM", "HIGH" o "CRITICAL" (en MAYÚSCULAS).
- category: una etiqueta corta alineada al enfoque principal del caso. Usa preferentemente una de: "Funcional", "Seguridad", "Usabilidad", "Performance", "Compatibilidad", "Integración", "Datos", "Accesibilidad", "API", "Interfaz", "Recuperación de errores". Si ninguna aplica, usa "Otro".

Contexto del proyecto (fuente de verdad):
${context}

Formato de respuesta (JSON exacto):
[
  {
    "title": "Título conciso del caso",
    "description": "Qué se valida y por qué es importante (sin pasos)",
    "priority": "CRITICAL|HIGH|MEDIUM|LOW",
    "category": "Funcional|Seguridad|Usabilidad|Performance|Compatibilidad|Integración|Datos|Accesibilidad|API|Interfaz|Recuperación de errores|Otro"
  }
]
`;

    try {
      const response = await openai.chat.completions.create({
        model: configService.getOpenAIConfig().model, // Usar modelo configurado
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en QA y testing que genera casos de prueba precisos y efectivos basados en análisis de requisitos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No se recibió respuesta de la IA');
      }

      // Extraer JSON de la respuesta de forma robusta
      let jsonContent = content;

      // Si viene en bloque ```json ... ``` extrae el interior, si viene como arreglo plano [ ... ] usa el match completo
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const arrayMatch = content.match(/\[[\s\S]*\]/);

      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
      } else if (arrayMatch) {
        jsonContent = arrayMatch[0];
      }

      const testCases = JSON.parse(jsonContent);
      
      if (!Array.isArray(testCases)) {
        throw new Error('La respuesta de la IA no es un array válido');
      }

      return testCases.map(tc => ({
        title: tc.title || 'Caso sin título',
        description: tc.description || 'Sin descripción',
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(tc.priority) ? tc.priority : 'MEDIUM',
        category: tc.category || 'Funcional'
      }));

    } catch (error) {
  StructuredLogger.error('Error generando con IA', error);
      // Retorna un conjunto mínimo; se completará luego por heurística
      return [
        {
          title: 'Verificación de funcionalidad principal',
          description: 'Validar que la funcionalidad principal cumple el requisito definido, sin errores aparentes',
          priority: 'HIGH',
          category: 'Funcional'
        },
        {
          title: 'Validación de datos de entrada',
          description: 'Comprobar validaciones y manejo de errores ante entradas inválidas o límites',
          priority: 'MEDIUM',
          category: 'Datos'
        },
        {
          title: 'Controles de seguridad esenciales',
          description: 'Verificar autenticación/autorización y no exposición de datos sensibles',
          priority: 'HIGH',
          category: 'Seguridad'
        }
      ];
    }
  }

  /**
   * Normaliza y enriquece la lista de casos: categorías, prioridades, unicidad, cantidad.
   * Si faltan casos, agrega heurísticos usando la info del análisis.
   */
  private static refineAndCompleteCases(
    cases: GeneratedTestCase[],
    project: any,
    analysis: any
  ): GeneratedTestCase[] {
    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const allowedCategories = [
      'Funcional', 'Seguridad', 'Usabilidad', 'Performance', 'Compatibilidad',
      'Integración', 'Datos', 'Accesibilidad', 'API', 'Interfaz', 'Recuperación de errores', 'Otro'
    ];

    const normalizePriority = (p: string | undefined): 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL' => {
      if (!p) return 'MEDIUM';
      const up = String(p).toUpperCase();
      if (allowedPriorities.includes(up)) return up as any;
      // Mapas comunes
      const map: Record<string, 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'> = {
        BAJA: 'LOW', MEDIA: 'MEDIUM', ALTA: 'HIGH', CRITICA: 'CRITICAL', CRÍTICA: 'CRITICAL'
      };
      return map[up] || 'MEDIUM';
    };

    const normalizeCategory = (c: string | undefined): string => {
      if (!c) return 'Funcional';
      const base = String(c).trim().toLowerCase();
      const map: Record<string, string> = {
        funcional: 'Funcional', funcionalidad: 'Funcional',
        seguridad: 'Seguridad', auth: 'Seguridad', autenticacion: 'Seguridad', autenticación: 'Seguridad',
        usabilidad: 'Usabilidad', ux: 'Usabilidad',
        performance: 'Performance', rendimiento: 'Performance', carga: 'Performance', stress: 'Performance',
        compatibilidad: 'Compatibilidad', navegadores: 'Compatibilidad', dispositivos: 'Compatibilidad',
        integracion: 'Integración', integración: 'Integración',
        datos: 'Datos', validacion: 'Datos', validación: 'Datos',
        accesibilidad: 'Accesibilidad', a11y: 'Accesibilidad',
        api: 'API',
        interfaz: 'Interfaz', ui: 'Interfaz',
        'recuperacion de errores': 'Recuperación de errores', errores: 'Recuperación de errores',
      };
      const mapped = map[base];
      if (mapped && allowedCategories.includes(mapped)) return mapped;
      // Capitaliza primera letra
      const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
      return allowedCategories.includes(capitalized) ? capitalized : 'Otro';
    };

    // Filtrar malformados y normalizar
    const cleaned: GeneratedTestCase[] = cases
      .filter(tc => tc && tc.title && tc.description)
      .map(tc => ({
        title: String(tc.title).trim().slice(0, 120),
        description: String(tc.description).trim().slice(0, 280),
        priority: normalizePriority(tc.priority),
        category: normalizeCategory(tc.category)
      }));

    // Eliminar duplicados por título (case-insensitive)
    const seen = new Set<string>();
    const deduped = cleaned.filter(tc => {
      const key = tc.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Asegurar cantidad entre 10 y 18, complementando con heurísticos
    let result = deduped.slice(0, 18);
    if (result.length < 10) {
      const heuristic = this.generateHeuristicCases(project, analysis);
      for (const h of heuristic) {
        if (result.length >= 18) break;
        if (!seen.has(h.title.toLowerCase())) {
          result.push(h);
          seen.add(h.title.toLowerCase());
        }
        if (result.length >= 10) break; // mínimo logrado
      }
    }

    // Si aún no llega a 10, rellena con genéricos balanceados
    const fillers: GeneratedTestCase[] = [
      { title: 'Manejo de errores y mensajes', description: 'Verificar mensajes claros y acciones recuperables ante errores de negocio y técnicos', priority: 'MEDIUM', category: 'Recuperación de errores' },
      { title: 'Persistencia y consistencia de datos', description: 'Comprobar que las operaciones CRUD mantienen integridad y consistencia transaccional', priority: 'HIGH', category: 'Datos' },
      { title: 'Compatibilidad de navegadores y dispositivos', description: 'Validar funcionamiento y layout en navegadores y dispositivos principales', priority: 'LOW', category: 'Compatibilidad' },
      { title: 'Rendimiento en escenario pico', description: 'Evaluar tiempos de respuesta bajo carga típica y picos razonables', priority: 'MEDIUM', category: 'Performance' },
    ];
    for (const f of fillers) {
      if (result.length >= 10) break;
      if (!seen.has(f.title.toLowerCase())) {
        result.push(f);
        seen.add(f.title.toLowerCase());
      }
    }

    return result.slice(0, 18);
  }

  /**
   * Normaliza y enriquece casos basados en análisis conversacional (NUEVO MÉTODO)
   */
  private static refineAndCompleteCasesFromConversational(
    cases: GeneratedTestCase[],
    conversationalAnalysis: any
  ): GeneratedTestCase[] {
    // Usar la misma lógica de normalización pero con contexto conversacional
    const result = this.refineAndCompleteCases(cases, 
      { name: conversationalAnalysis.title, description: conversationalAnalysis.description },
      { requirement: conversationalAnalysis.epicContent, summary: conversationalAnalysis.description }
    );

    // Agregar casos específicos para análisis conversacional si faltan
    if (result.length < 12) {
      const conversationalSpecific: GeneratedTestCase[] = [
        {
          title: 'Validación del flujo principal definido',
          description: `Verificar que el sistema cumple con el flujo principal establecido en el análisis conversacional para ${conversationalAnalysis.title}`,
          priority: 'HIGH',
          category: 'Funcional'
        },
        {
          title: 'Coherencia con requisitos conversacionales',
          description: 'Comprobar que la implementación es coherente con los requisitos definidos durante el análisis conversacional',
          priority: 'HIGH',
          category: 'Funcional'
        }
      ];

      const seen = new Set(result.map(tc => tc.title.toLowerCase()));
      for (const cs of conversationalSpecific) {
        if (result.length >= 18) break;
        if (!seen.has(cs.title.toLowerCase())) {
          result.push(cs);
          seen.add(cs.title.toLowerCase());
        }
      }
    }

    return result.slice(0, 18);
  }

  /**
   * Genera casos heurísticos a partir de estrategias, preguntas y red flags del análisis
   */
  private static generateHeuristicCases(project: any, analysis: any): GeneratedTestCase[] {
    const out: GeneratedTestCase[] = [];
    const name = project?.name || 'Proyecto';

    // A partir de estrategias
    if (analysis?.testStrategies?.length) {
      for (const st of analysis.testStrategies) {
        const title = `Estrategia: ${st.title}`;
        out.push({
          title,
          description: `Validar cobertura definida en la estrategia "${st.title}" para ${name}: ${st.description?.slice(0, 120) || ''}`.trim(),
          priority: 'HIGH',
          category: 'Funcional'
        });
      }
    }

    // A partir de preguntas y respuestas
    if (analysis?.questions?.length) {
      for (const q of analysis.questions.slice(0, 6)) {
        out.push({
          title: `Validación requisito aclarado: ${String(q.content).slice(0, 50)}`,
          description: `Comprobar cumplimiento de la aclaración de requisitos: ${String(q.content).slice(0, 160)}`,
          priority: 'MEDIUM',
          category: 'Funcional'
        });
      }
    }

    // A partir de red flags
    if (analysis?.redFlags?.length) {
      for (const rf of analysis.redFlags.slice(0, 4)) {
        out.push({
          title: `Mitigación de riesgo: ${String(rf).slice(0, 60)}`,
          description: `Asegurar que el sistema aborda el riesgo identificado: ${String(rf).slice(0, 160)}`,
          priority: 'CRITICAL',
          category: 'Seguridad'
        });
      }
    }

    // Casos transversales basados en resumen/requisito
    const requirement = String(analysis?.requirement || '').slice(0, 140);
    if (requirement) {
      out.push({ title: 'Escenarios límite y validaciones', description: `Explorar límites, valores extremos y validaciones según requisito: ${requirement}`, priority: 'HIGH', category: 'Datos' });
      out.push({ title: 'Flujo principal feliz (happy path)', description: `Verificar el flujo principal definido en el requisito: ${requirement}`, priority: 'HIGH', category: 'Funcional' });
      out.push({ title: 'Interrupciones y reintentos', description: `Comprobar comportamiento ante interrupciones y reintentos en el flujo principal`, priority: 'MEDIUM', category: 'Recuperación de errores' });
      out.push({ title: 'Accesibilidad básica', description: `Validar foco, etiquetas, contraste y navegación por teclado en vistas clave`, priority: 'LOW', category: 'Accesibilidad' });
    }

    return out;
  }

  /**
   * Guarda los casos de prueba generados en la base de datos
   */
  private static async saveTestCasesFromAnalysis(
    testCases: GeneratedTestCase[], 
    userId: string,
    conversationalAnalysisId: string
  ): Promise<any[]> {
    const savedCases = [];

    for (const testCase of testCases) {
      try {
        const saved = await prisma.testCase.create({
          data: {
            title: testCase.title,
            description: `[${testCase.category}] ${testCase.title}: ${testCase.description}`,
            priority: testCase.priority as any,
            generatedByAI: true,
            userId: userId,
            conversationalAnalysisId: conversationalAnalysisId
          },
          include: {
            conversationalAnalysis: {
              select: {
                title: true,
                userId: true
              }
            }
          }
        });
        savedCases.push(saved);
      } catch (error) {
  StructuredLogger.error('Error guardando caso de prueba', error, { title: testCase.title });
      }
    }

    return savedCases;
  }

  /**
   * Guarda los casos de prueba generados desde análisis conversacional en la base de datos (CORREGIDO PARA MONGODB)
   */
  private static async saveTestCasesFromConversational(
    testCases: GeneratedTestCase[], 
    userId: string,
    conversationalAnalysisId: string
  ): Promise<any[]> {
    console.log('🧪 DEBUG: Saving test cases:', { count: testCases.length, userId, conversationalAnalysisId });
    
    const savedCases: any[] = [];

    for (const testCase of testCases) {
      try {
        console.log('🧪 DEBUG: Saving individual test case:', testCase.title);
        
        // Crear caso de prueba con datos mínimos requeridos
        const saved = await prisma.testCase.create({
          data: {
            title: testCase.title,
            description: testCase.description,
            priority: testCase.priority,
            category: testCase.category,
            generatedByAI: true,
            userId: userId,
            conversationalAnalysisId: conversationalAnalysisId
          }
        });

        console.log('🧪 DEBUG: Test case saved successfully:', saved.id);
        savedCases.push(saved);
        
      } catch (error) {
        console.error('🧪 ERROR: Failed to save test case:', testCase.title, error);
        StructuredLogger.error('Error guardando caso de prueba', error, { 
          testCase: testCase.title, 
          userId, 
          conversationalAnalysisId 
        });
        
        // Continuar con el siguiente caso en lugar de fallar completamente
        continue;
      }
    }

    console.log('🧪 DEBUG: Total saved test cases:', savedCases.length);
    return savedCases;
  }
}
