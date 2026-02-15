/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import OpenAI from 'openai';
import { config } from '../config';
import { configService } from './config.service';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { AIMetricsService } from './ai-metrics.service';
import { AnalysisCacheService } from './analysis-cache.service';
import { TokenCostControlMiddleware } from '../middleware/token-cost-control.middleware';
import { StructuredLogger } from '../utils/structured-logger';
import { circuitBreakers, CircuitBreakerOpenError } from '../utils/circuit-breaker';
import { aiCostPredictor, CostEstimate } from '../utils/ai-cost-predictor';

// Tipos para nuestro servicio
export interface AIResponse {
    success: boolean;
    data?: string;
    error?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    costInfo?: {
        estimatedCost: number;
        actualCost: number;
        model: string;
        savings?: number;
    };
    circuitBreakerUsed?: boolean;
}

export interface ConversationContext {
    messages: ChatCompletionMessageParam[];
    analysisId?: string;
    projectId?: string;
}

export interface AIServiceConfig {
    temperature?: number;
    maxTokens?: number;
    model?: string;
}

// Prompts centralizados y OPTIMIZADOS para máximo ahorro
export const PROMPTS = {
    ANALYSIS: `Eres QA experto. Analiza el requisito:
1. Resumen claro
2. Riesgos principales  
3. Casos edge
4. Seguridad crítica

Requisito:`,

    QUESTIONS: `Basado en el análisis, genera 3-5 preguntas QA clave:
- Clarificaciones necesarias
- Áreas de riesgo
- Casos límite

Análisis:`,

    STRATEGY: `Crea estrategia de pruebas:
1. Enfoque general
2. Escenarios clave
3. Cobertura
4. Prioridades

Análisis:`,

    GENERATE_QUESTIONS: `Experto QA: Del resumen, genera exactamente 3 preguntas críticas en JSON como array de strings.

Resumen:`,

    CONVERSATIONAL_ANALYSIS: `Analista QA senior. Analiza requisitos interactivamente con preguntas específicas para testing.`,
} as const;

// Utilidades para optimización de tokens
export class TokenOptimizer {
    static optimizePrompt(prompt: string): string {
        return prompt
            .replace(/\s+/g, ' ')           // Múltiples espacios a uno solo
            .replace(/\n\s*\n/g, '\n')      // Múltiples saltos de línea a uno solo
            .trim();
    }

    static truncateContext(text: string, maxTokens: number = 1500): string {
        // Estimación simple: ~4 caracteres por token
        const maxChars = maxTokens * 4;
        if (text.length <= maxChars) return text;
        
        return text.substring(0, maxChars) + '...';
    }

    static calculateEstimatedTokens(text: string): number {
        // Estimación aproximada: ~4 caracteres por token
        return Math.ceil(text.length / 4);
    }

    static shouldUseGPT4(complexity: 'low' | 'medium' | 'high', estimatedTokens: number): boolean {
        // Usar GPT-4 solo para casos complejos o cuando sea realmente necesario
        if (complexity === 'high') return true;
        if (complexity === 'medium' && estimatedTokens > 1000) return true;
        return false;
    }
}

const openai = new OpenAI({
    apiKey: configService.getOpenAIConfig().apiKey,
});

// Exportar también la instancia de openai para uso directo
export { openai };

export class OpenAIService {
    private defaultConfig: AIServiceConfig;
    private conversations: Map<string, ConversationContext>;

    constructor() {
        // Validar que la API key esté configurada
        const openaiConfig = configService.getOpenAIConfig();
        if (!openaiConfig.apiKey) {
            throw new Error('❌ OPENAI_API_KEY no está configurada. Revisa tu archivo .env');
        }

        this.defaultConfig = {
            temperature: openaiConfig.temperature,
            maxTokens: openaiConfig.maxTokens,
            model: openaiConfig.model
        };
        this.conversations = new Map();
        
        StructuredLogger.info('OpenAI Service initialized with Circuit Breaker', { method: 'constructor' });
    }

    /**
     * Predict cost before making AI call
     */
    async predictRequestCost(
        input: string, 
        complexity: 'low' | 'medium' | 'high' = 'medium',
        userId?: string
    ): Promise<CostEstimate> {
        return await aiCostPredictor.predictCost(input, complexity, userId);
    }

    /**
     * Check if request is within budget before execution
     */
    async validateBudget(userId: string, estimatedCost: number): Promise<boolean> {
        const budgetCheck = await aiCostPredictor.checkBudget(userId, estimatedCost);
        
        if (!budgetCheck.withinBudget) {
            StructuredLogger.warn('Budget exceeded for AI request', {
                method: 'validateBudget',
                userId,
                warnings: budgetCheck.warnings
            });
        }
        
        return budgetCheck.withinBudget;
    }

    private getConversationKey(analysisId?: string, projectId?: string): string {
        return `${analysisId || 'default'}-${projectId || 'default'}`;
    }

    private optimizeConfigForTask(task: 'analysis' | 'questions' | 'strategy' | 'chat'): AIServiceConfig {
        const configs = {
            analysis: { temperature: 0.2, maxTokens: 1500 },
            questions: { temperature: 0.4, maxTokens: 1000 },
            strategy: { temperature: 0.3, maxTokens: 2000 },
            chat: { temperature: 0.7, maxTokens: 1000 }
        };

        return { ...this.defaultConfig, ...configs[task] };
    }

    public getConversationContext(analysisId?: string, projectId?: string): ConversationContext {
        const key = this.getConversationKey(analysisId, projectId);
        if (!this.conversations.has(key)) {
            this.conversations.set(key, {
                messages: [],
                analysisId,
                projectId
            });
        }
        return this.conversations.get(key)!;
    }

    public async chat(
        prompt: string,
        systemPrompt?: string,
        config?: AIServiceConfig,
        analysisId?: string,
        projectId?: string
    ): Promise<AIResponse> {
        try {
            const context = this.getConversationContext(analysisId, projectId);

            // Agregar el system prompt si es nuevo o diferente al último
            if (systemPrompt && (context.messages.length === 0 ||
                (context.messages[0].role === 'system' && context.messages[0].content !== systemPrompt))) {
                context.messages.unshift({ role: 'system', content: systemPrompt });
            }

            // Agregar el nuevo mensaje del usuario
            context.messages.push({ role: 'user', content: prompt });

            const response = await openai.chat.completions.create({
                model: config?.model || this.defaultConfig.model!,
                messages: context.messages,
                temperature: config?.temperature || this.defaultConfig.temperature!,
                max_tokens: config?.maxTokens || this.defaultConfig.maxTokens!
            });

            const assistantMessage = response.choices[0].message;

            // Guardar la respuesta en el contexto
            if (assistantMessage) {
                context.messages.push({
                    role: assistantMessage.role,
                    content: assistantMessage.content || ''
                });
            }

            return {
                success: true,
                data: assistantMessage?.content || '',
                usage: {
                    promptTokens: response.usage?.prompt_tokens || 0,
                    completionTokens: response.usage?.completion_tokens || 0,
                    totalTokens: response.usage?.total_tokens || 0
                }
            };
        } catch (error: any) {
            StructuredLogger.error('OpenAI Service Error', error as Error, { method: 'chat' });
            return {
                success: false,
                error: error.message || 'Failed to get AI response'
            };
        }
    }

    public clearConversation(analysisId?: string, projectId?: string): void {
        const key = this.getConversationKey(analysisId, projectId);
        this.conversations.delete(key);
    }

    public async analyzeWithCriticalThinking(
        requirement: string,
        analysisId?: string,
        projectId?: string
    ): Promise<AIResponse> {
    StructuredLogger.info('Starting analyzeWithCriticalThinking', { method: 'analyzeWithCriticalThinking' });

        const systemPrompt = `You are an expert QA analyst and critical thinker with over 20 years of experience in software testing. 
Your task is to:
1. Thoroughly analyze the given requirement
2. Identify potential ambiguities, risks, and edge cases
3. Think critically about business and technical implications
4. Consider security, performance, and user experience aspects
5. Question assumptions and identify missing information

Be thorough, critical, and detailed in your analysis. Ask probing questions that challenge assumptions and reveal potential issues.`;

    StructuredLogger.debug('System prompt prepared', { method: 'analyzeWithCriticalThinking' });

        try {
            const response = await this.chat(
                requirement,
                systemPrompt,
                { temperature: 0.7, model: 'gpt-3.5-turbo' },
                analysisId,
                projectId
            );
            StructuredLogger.ai('analyzeWithCriticalThinking response', { method: 'analyzeWithCriticalThinking' });
            return response;
        } catch (error) {
            StructuredLogger.error('Error in analyzeWithCriticalThinking', error as Error, { method: 'analyzeWithCriticalThinking' });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    public async generateTestStrategy(
        requirement: string,
        analysis: string,
        questions: string[],
        analysisId?: string,
        projectId?: string
    ): Promise<AIResponse> {
        const context = `
Requirement: ${requirement}

Analysis: ${analysis}

Key Questions Identified:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`;

        const systemPrompt = `You are an expert QA strategist with over 20 years of experience in software testing.
Your task is to create a comprehensive test strategy that:
1. Addresses all identified questions and concerns
2. Covers all aspects of testing (functional, non-functional, security, performance)
3. Prioritizes test areas based on risk and business impact
4. Suggests specific test approaches and techniques
5. Identifies required tools and resources
6. Considers automation opportunities

Be specific, practical, and thorough in your strategy. Think about both immediate testing needs and long-term quality assurance.`;

        return this.chat(
            context,
            systemPrompt,
            { temperature: 0.7, model: 'gpt-4' },
            analysisId,
            projectId
        );
    }

    public async generateTestScenarios(
        strategy: string,
        analysisId?: string,
        projectId?: string
    ): Promise<AIResponse> {
        const systemPrompt = `You are an expert test designer with deep experience in creating effective test scenarios.
Your task is to:
1. Create detailed test scenarios based on the provided strategy
2. Cover both happy paths and edge cases
3. Include preconditions and expected results
4. Consider different user roles and permissions
5. Include data variations and boundary conditions

Format each scenario clearly with:
- Scenario ID and title
- Preconditions
- Steps
- Expected results
- Priority level`;

        return this.chat(
            strategy,
            systemPrompt,
            { temperature: 0.7, model: 'gpt-3.5-turbo' },
            analysisId,
            projectId
        );
    }

    static async refineAnalysis(requirement: string, questionsAndAnswers: Array<{ question: string; answer: string }>) {
        try {
            const prompt = `
                Como experto en testing y análisis de requerimientos, por favor refina el siguiente análisis basándote en las respuestas proporcionadas.

                REQUERIMIENTO:
                ${requirement}

                PREGUNTAS Y RESPUESTAS:
                ${questionsAndAnswers.map(qa => `
                    Pregunta: ${qa.question}
                    Respuesta: ${qa.answer}
                `).join('\n')}

                Por favor, proporciona:
                1. Un resumen actualizado del análisis
                2. Lista de red flags actualizada
                3. Estrategias de prueba actualizadas

                Formato de respuesta (JSON):
                {
                    "summary": "Resumen actualizado del análisis...",
                    "redFlags": ["Red flag 1", "Red flag 2", ...],
                    "testStrategies": ["Estrategia 1", "Estrategia 2", ...]
                }
            `;

            const completion = await openai.chat.completions.create({
                model: config.openai.model,
                messages: [
                    {
                        role: "system",
                        content: "Eres un experto en testing y análisis de requerimientos. Tu tarea es refinar el análisis basándote en las respuestas proporcionadas."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: config.openai.maxTokens,
                response_format: { type: "json_object" }
            });

            const response = completion.choices[0].message.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }

            return JSON.parse(response);
        } catch (error) {
            StructuredLogger.error('OpenAI Service Error', error as Error, { method: 'refineAnalysis' } as any);
            throw error;
        }
    }

    /**
     * Calculate actual cost of AI request
     */
    private calculateActualCost(inputTokens: number, outputTokens: number, model: string): number {
        // Simplified cost calculation - should match AICostPredictor pricing
        const pricing: Record<string, { input: number; output: number }> = {
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4-turbo': { input: 0.01, output: 0.03 },
            'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
        };

        const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
        const inputCost = (inputTokens / 1000) * modelPricing.input;
        const outputCost = (outputTokens / 1000) * modelPricing.output;
        
        return inputCost + outputCost;
    }

    // Métodos centralizados para funcionalidades principales
    async analyzeRequirement(requirement: string, userId?: string): Promise<AIResponse> {
        try {
            // 🎯 STEP 1: Verificar caché primero
            const cachedAnalysis = await AnalysisCacheService.getCachedAnalysis(requirement);
            if (cachedAnalysis) {
                StructuredLogger.info('Using cached analysis', { method: 'analyzeRequirement' });
                return {
                    success: true,
                    data: cachedAnalysis.content,
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
            }

            // 🎯 STEP 2: Predicción de costos
            const costEstimate = await this.predictRequestCost(requirement, 'medium', userId);
            StructuredLogger.info('Cost prediction', {
                method: 'analyzeRequirement',
                estimatedCost: costEstimate.estimatedCost,
                model: costEstimate.model
            });

            // 🎯 STEP 3: Validar presupuesto si hay userId
            if (userId) {
                const budgetOk = await this.validateBudget(userId, costEstimate.estimatedCost);
                if (!budgetOk) {
                    return {
                        success: false,
                        error: 'Request would exceed budget limits. Consider using cache or simpler analysis.',
                        costInfo: {
                            estimatedCost: costEstimate.estimatedCost,
                            actualCost: 0,
                            model: costEstimate.model
                        }
                    };
                }
            }

            // 🎯 STEP 4: Optimizar prompts y texto
            const optimizedPrompt = TokenOptimizer.optimizePrompt(PROMPTS.ANALYSIS);
            const optimizedRequirement = TokenOptimizer.truncateContext(requirement, 1200);
            
            // 🎯 STEP 5: Usar modelo recomendado por el cost predictor
            const optimalModel = costEstimate.model;
            const taskConfig = this.optimizeConfigForTask('analysis');

            // 🎯 STEP 6: Ejecutar con Circuit Breaker
            const completion = await circuitBreakers.openai.execute(async () => {
                return await openai.chat.completions.create({
                    model: optimalModel,
                    messages: [
                        { role: "system", content: optimizedPrompt },
                        { role: "user", content: optimizedRequirement }
                    ],
                    temperature: taskConfig.temperature,
                    max_tokens: Math.min(taskConfig.maxTokens || 1500, 1000),
                });
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            // 🎯 STEP 7: Calcular costo real
            const actualCost = this.calculateActualCost(
                completion.usage?.prompt_tokens || 0,
                completion.usage?.completion_tokens || 0,
                optimalModel
            );

            // 🎯 STEP 8: Registrar gasto real
            if (userId && actualCost > 0) {
                await aiCostPredictor.recordSpending(userId, actualCost, optimalModel);
            }

            // 🎯 STEP 9: Cachear el resultado para futuros usos
            const totalTokens = completion.usage?.total_tokens || 0;
            await AnalysisCacheService.cacheAnalysis(
                requirement, 
                content, 
                totalTokens, 
                optimalModel
            );

            // 🎯 STEP 10: Registrar métricas y costos
            if (completion.usage && userId) {
                await AIMetricsService.recordUsage({
                    userId,
                    requestType: 'analysis',
                    model: optimalModel,
                    promptTokens: completion.usage.prompt_tokens,
                    completionTokens: completion.usage.completion_tokens,
                    totalTokens: completion.usage.total_tokens
                });

                await TokenCostControlMiddleware.recordTokenUsage(
                    userId,
                    optimalModel,
                    completion.usage.prompt_tokens,
                    completion.usage.completion_tokens
                );
            }

            const savings = costEstimate.estimatedCost - actualCost;
            StructuredLogger.ai('Analysis generated with cost tracking', { 
                method: 'analyzeRequirement', 
                totalTokens,
                estimatedCost: costEstimate.estimatedCost,
                actualCost,
                savings
            });

            return {
                success: true,
                data: content,
                usage: completion.usage ? {
                    promptTokens: completion.usage.prompt_tokens,
                    completionTokens: completion.usage.completion_tokens,
                    totalTokens: completion.usage.total_tokens
                } : undefined,
                costInfo: {
                    estimatedCost: costEstimate.estimatedCost,
                    actualCost,
                    model: optimalModel,
                    savings: savings > 0 ? savings : undefined
                },
                circuitBreakerUsed: true
            };
        } catch (error) {
            // Handle Circuit Breaker specific errors
            if (error instanceof CircuitBreakerOpenError) {
                StructuredLogger.warn('Circuit breaker prevented AI request', { 
                    method: 'analyzeRequirement',
                    error: error.message
                });
                return {
                    success: false,
                    error: 'AI service temporarily unavailable. Please try again later.',
                    circuitBreakerUsed: true
                };
            }

            StructuredLogger.error('OpenAI Analyze Requirement Error', error as Error, { method: 'analyzeRequirement' } as any);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to analyze requirement'
            };
        }
    }

    async generateQuestionsFromAnalysis(analysis: string): Promise<AIResponse> {
        try {
            // 🎯 STEP 1: Verificar caché de preguntas primero
            const cachedQuestions = await AnalysisCacheService.getCachedQuestions(analysis);
            if (cachedQuestions) {
                StructuredLogger.info('Using cached questions', { method: 'generateQuestionsFromAnalysis' });
                return {
                    success: true,
                    data: cachedQuestions.join('\n'),
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
            }

            // 🎯 STEP 2: Optimizar para máximo ahorro
            const optimizedPrompt = TokenOptimizer.optimizePrompt(PROMPTS.QUESTIONS);
            const optimizedAnalysis = TokenOptimizer.truncateContext(analysis, 800); // Más agresivo
            const optimalModel = 'gpt-3.5-turbo'; // Forzar modelo más barato
            const taskConfig = this.optimizeConfigForTask('questions');

            const completion = await openai.chat.completions.create({
                model: optimalModel,
                messages: [
                    { role: "system", content: optimizedPrompt },
                    { role: "user", content: optimizedAnalysis }
                ],
                temperature: taskConfig.temperature,
                max_tokens: Math.min(taskConfig.maxTokens || 1000, 600), // Límite más estricto
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            // 🎯 STEP 3: Cachear las preguntas generadas
            const totalTokens = completion.usage?.total_tokens || 0;
            const questions = content.split('\n').filter(q => q.trim().length > 0);
            
            await AnalysisCacheService.cacheQuestions(
                analysis,
                questions,
                totalTokens,
                optimalModel
            );

            StructuredLogger.ai('Questions generated', { method: 'generateQuestionsFromAnalysis', totalTokens });

            return {
                success: true,
                data: content,
                usage: completion.usage ? {
                    promptTokens: completion.usage.prompt_tokens,
                    completionTokens: completion.usage.completion_tokens,
                    totalTokens: completion.usage.total_tokens
                } : undefined
            };
        } catch (error) {
            StructuredLogger.error('OpenAI Generate Questions Error', error as Error, { method: 'generateQuestionsFromAnalysis' } as any);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate questions'
            };
        }
    }

    async generateTestStrategySimple(analysis: string): Promise<AIResponse> {
        try {
            const completion = await openai.chat.completions.create({
                model: config.openai.model,
                messages: [
                    { role: "system", content: PROMPTS.STRATEGY },
                    { role: "user", content: analysis }
                ],
                temperature: 0.2,
                max_tokens: config.openai.maxTokens,
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            return {
                success: true,
                data: content,
                usage: completion.usage ? {
                    promptTokens: completion.usage.prompt_tokens,
                    completionTokens: completion.usage.completion_tokens,
                    totalTokens: completion.usage.total_tokens
                } : undefined
            };
        } catch (error) {
            StructuredLogger.error('OpenAI Generate Strategy Error', error as Error, { method: 'generateTestStrategySimple' } as any);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate test strategy'
            };
        }
    }

    async generateQuestionsList(summary: string): Promise<string[]> {
        try {
            const prompt = `${PROMPTS.GENERATE_QUESTIONS}
"""${summary}"""`;

            const completion = await openai.chat.completions.create({
                model: config.openai.model,
                messages: [
                    { role: 'system', content: 'Eres un experto QA en análisis de requisitos.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.4,
                max_tokens: config.openai.maxTokens,
            });

            const result = completion.choices[0]?.message?.content;
            if (!result) {
                throw new Error('No se generaron preguntas.');
            }

            // Limpiar el bloque de markdown si viene en formato ```json\n...\n```
            const cleanResult = result
                .replace(/```json\n?/g, '')  // Quitar inicio de bloque markdown
                .replace(/```/g, '')         // Quitar cierre de bloque markdown
                .trim();

            const questions: string[] = JSON.parse(cleanResult);
            return questions;

        } catch (error) {
            StructuredLogger.error('OpenAI Generate Questions List Error', error as Error, { method: 'generateQuestionsList' } as any);
            throw new Error('Failed to generate questions list');
        }
    }
}

// Exportar una instancia única del servicio
export const openAIService = new OpenAIService(); 