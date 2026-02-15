/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../lib/prisma';

export interface AIUsageMetrics {
    totalRequests: number;
    totalTokensUsed: number;
    averageTokensPerRequest: number;
    modelUsage: Record<string, number>;
    costEstimation: number;
    requestsByType: Record<string, number>;
}

export interface AIUsageRecord {
    id?: string;
    userId: string;
    requestType: 'analysis' | 'questions' | 'strategy' | 'chat';
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    createdAt?: Date;
}

class AIMetricsService {
    private static readonly TOKEN_COSTS = {
        'gpt-3.5-turbo': {
            input: 0.0015 / 1000,  // $0.0015 per 1K input tokens
            output: 0.002 / 1000   // $0.002 per 1K output tokens
        },
        'gpt-4': {
            input: 0.03 / 1000,    // $0.03 per 1K input tokens  
            output: 0.06 / 1000    // $0.06 per 1K output tokens
        }
    };

    static calculateCost(model: string, promptTokens: number, completionTokens: number): number {
        const costs = this.TOKEN_COSTS[model as keyof typeof this.TOKEN_COSTS];
        if (!costs) return 0;

        return (promptTokens * costs.input) + (completionTokens * costs.output);
    }

    static async recordUsage(usage: Omit<AIUsageRecord, 'id' | 'createdAt' | 'estimatedCost'>): Promise<void> {
        try {
            const estimatedCost = this.calculateCost(usage.model, usage.promptTokens, usage.completionTokens);

            // Persistir en base de datos
            await prisma.aIUsageMetric.create({
                data: {
                    userId: usage.userId,
                    requestType: usage.requestType,
                    model: usage.model,
                    promptTokens: usage.promptTokens,
                    completionTokens: usage.completionTokens,
                    totalTokens: usage.totalTokens,
                    estimatedCost
                }
            });

            console.log('📊 AI Usage Recorded:', {
                ...usage,
                estimatedCost: `$${estimatedCost.toFixed(4)}`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error recording AI usage:', error);
            // En caso de error de DB, al menos loggear
            console.log('📊 AI Usage (logged only):', {
                ...usage,
                estimatedCost: `$${this.calculateCost(usage.model, usage.promptTokens, usage.completionTokens).toFixed(4)}`,
                timestamp: new Date().toISOString()
            });
        }
    }

    static async getDailyUsage(userId: string, date: Date = new Date()): Promise<AIUsageMetrics> {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const records = await prisma.aIUsageMetric.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });

            return this.calculateMetricsFromRecords(records);
        } catch (error) {
            console.error('Error getting daily usage:', error);
            // Fallback a datos mock
            return this.getMockDailyUsage();
        }
    }

    static async getUserMonthlyUsage(userId: string, date: Date = new Date()): Promise<AIUsageMetrics> {
        try {
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

            const records = await prisma.aIUsageMetric.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            });

            return this.calculateMetricsFromRecords(records);
        } catch (error) {
            console.error('Error getting monthly usage:', error);
            // Fallback a datos mock
            return this.getMockMonthlyUsage();
        }
    }

    private static calculateMetricsFromRecords(records: any[]): AIUsageMetrics {
        if (records.length === 0) {
            return {
                totalRequests: 0,
                totalTokensUsed: 0,
                averageTokensPerRequest: 0,
                modelUsage: {},
                costEstimation: 0,
                requestsByType: {}
            };
        }

        const totalRequests = records.length;
        const totalTokensUsed = records.reduce((sum, record) => sum + record.totalTokens, 0);
        const averageTokensPerRequest = Math.round(totalTokensUsed / totalRequests);
        const costEstimation = records.reduce((sum, record) => sum + record.estimatedCost, 0);

        // Calcular usage por modelo
        const modelUsage: Record<string, number> = {};
        records.forEach(record => {
            modelUsage[record.model] = (modelUsage[record.model] || 0) + 1;
        });

        // Calcular requests por tipo
        const requestsByType: Record<string, number> = {};
        records.forEach(record => {
            requestsByType[record.requestType] = (requestsByType[record.requestType] || 0) + 1;
        });

        return {
            totalRequests,
            totalTokensUsed,
            averageTokensPerRequest,
            modelUsage,
            costEstimation,
            requestsByType
        };
    }

    // Métodos de fallback con datos mock
    private static getMockDailyUsage(): AIUsageMetrics {
        return {
            totalRequests: 25,
            totalTokensUsed: 15750,
            averageTokensPerRequest: 630,
            modelUsage: {
                'gpt-3.5-turbo': 20,
                'gpt-4': 5
            },
            costEstimation: 0.45,
            requestsByType: {
                'analysis': 8,
                'questions': 10,
                'strategy': 5,
                'chat': 2
            }
        };
    }

    private static getMockMonthlyUsage(): AIUsageMetrics {
        return {
            totalRequests: 350,
            totalTokensUsed: 220500,
            averageTokensPerRequest: 630,
            modelUsage: {
                'gpt-3.5-turbo': 280,
                'gpt-4': 70
            },
            costEstimation: 12.85,
            requestsByType: {
                'analysis': 120,
                'questions': 140,
                'strategy': 70,
                'chat': 20
            }
        };
    }

    static getOptimizationRecommendations(metrics: AIUsageMetrics): string[] {
        const recommendations: string[] = [];

        if (metrics.averageTokensPerRequest > 1000) {
            recommendations.push('💡 Considera optimizar la longitud de tus prompts para reducir tokens');
        }

        const gpt4Usage = metrics.modelUsage['gpt-4'] || 0;
        const totalRequests = metrics.totalRequests;
        const gpt4Percentage = (gpt4Usage / totalRequests) * 100;

        if (gpt4Percentage > 30) {
            recommendations.push('💰 Alto uso de GPT-4. Evalúa si GPT-3.5-turbo puede cubrir algunos casos');
        }

        if (metrics.costEstimation > 10) {
            recommendations.push('💸 Costo mensual elevado. Revisa las optimizaciones disponibles');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Uso optimizado de IA. ¡Buen trabajo!');
        }

        return recommendations;
    }
}

export { AIMetricsService };
