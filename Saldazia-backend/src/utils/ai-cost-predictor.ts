/**
 * AI Cost Predictor - Advanced cost optimization system
 * Predicts and optimizes AI usage costs before making requests
 */

export interface CostEstimate {
  estimatedTokens: number;
  model: string;
  estimatedCost: number; // in USD
  confidence: number; // 0-1
  recommendations: string[];
  alternatives: ModelAlternative[];
}

export interface ModelAlternative {
  model: string;
  estimatedCost: number;
  qualityScore: number; // 0-1
  useCase: string[];
}

export interface CostBudget {
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number; // percentage of limit
}

export interface UsageStats {
  totalSpent: number;
  requestCount: number;
  averageCost: number;
  topModels: Array<{ model: string; usage: number; cost: number }>;
}

// Model pricing (costs per 1K tokens) - Updated September 2025 rates
const MODEL_PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 }
} as const;

type ModelName = keyof typeof MODEL_PRICING;

export class AICostPredictor {
  private static instance: AICostPredictor;
  private dailySpending: Map<string, number> = new Map(); // userId -> spending
  private monthlySpending: Map<string, number> = new Map();
  private lastResetDay: string = '';
  private lastResetMonth: string = '';

  static getInstance(): AICostPredictor {
    if (!this.instance) {
      this.instance = new AICostPredictor();
    }
    return this.instance;
  }

  /**
   * Advanced token estimation using multiple heuristics
   */
  estimateTokens(text: string, includeSystemPrompt: boolean = true): number {
    // More accurate token estimation
    const baseTokens = Math.ceil(text.length / 3.5); // Refined estimation
    
    // Account for system prompt tokens
    const systemPromptTokens = includeSystemPrompt ? 150 : 0;
    
    // Add overhead for JSON structure, formatting, etc.
    const overhead = Math.ceil(baseTokens * 0.1);
    
    return baseTokens + systemPromptTokens + overhead;
  }

  /**
   * Predict cost for a given input and complexity
   */
  async predictCost(
    input: string, 
    complexity: 'low' | 'medium' | 'high' = 'medium',
    userId?: string
  ): Promise<CostEstimate> {
    const inputTokens = this.estimateTokens(input);
    const outputTokens = this.estimateOutputTokens(complexity);
    
    const optimalModel = this.selectOptimalModel(inputTokens, complexity);
    const cost = this.calculateModelCost(optimalModel, inputTokens, outputTokens);
    
    const alternatives = this.getModelAlternatives(inputTokens, outputTokens, complexity);
    const recommendations = await this.generateCostRecommendations(
      inputTokens, 
      outputTokens, 
      complexity, 
      userId
    );

    return {
      estimatedTokens: inputTokens + outputTokens,
      model: optimalModel,
      estimatedCost: cost,
      confidence: this.calculateConfidence(inputTokens, complexity),
      recommendations,
      alternatives
    };
  }

  /**
   * Smart model selection based on cost-effectiveness and quality
   */
  private selectOptimalModel(
    inputTokens: number, 
    complexity: 'low' | 'medium' | 'high'
  ): ModelName {
    // For very simple tasks, always use cheapest
    if (complexity === 'low' && inputTokens < 500) {
      return 'gpt-3.5-turbo';
    }

    // For complex analysis or long inputs, use more capable models
    if (complexity === 'high' || inputTokens > 3000) {
      return 'gpt-4-turbo'; // Better cost/performance than gpt-4
    }

    // For medium complexity, balance cost and quality
    if (inputTokens > 1500) {
      return 'gpt-4-turbo';
    }

    return 'gpt-3.5-turbo';
  }

  /**
   * Estimate output tokens based on task complexity
   */
  private estimateOutputTokens(complexity: 'low' | 'medium' | 'high'): number {
    const estimates = {
      low: 300,      // Simple responses
      medium: 800,   // Detailed analysis
      high: 1500     // Comprehensive analysis
    };
    return estimates[complexity];
  }

  /**
   * Calculate cost for specific model and token usage
   */
  private calculateModelCost(
    model: ModelName, 
    inputTokens: number, 
    outputTokens: number
  ): number {
    const pricing = MODEL_PRICING[model];
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Generate alternative model suggestions
   */
  private getModelAlternatives(
    inputTokens: number, 
    outputTokens: number,
    complexity: 'low' | 'medium' | 'high'
  ): ModelAlternative[] {
    const alternatives: ModelAlternative[] = [];

    Object.entries(MODEL_PRICING).forEach(([model, _pricing]) => {
      const cost = this.calculateModelCost(model as ModelName, inputTokens, outputTokens);
      const qualityScore = this.getModelQualityScore(model as ModelName, complexity);
      const useCase = this.getModelUseCases(model as ModelName);

      alternatives.push({
        model,
        estimatedCost: cost,
        qualityScore,
        useCase
      });
    });

    // Sort by cost-effectiveness (quality/cost ratio)
    return alternatives.sort((a, b) => 
      (b.qualityScore / b.estimatedCost) - (a.qualityScore / a.estimatedCost)
    );
  }

  /**
   * Model quality scoring for different complexity levels
   */
  private getModelQualityScore(model: ModelName, complexity: 'low' | 'medium' | 'high'): number {
    const qualityMatrix = {
      'gpt-4': { low: 0.95, medium: 1.0, high: 1.0 },
      'gpt-4-turbo': { low: 0.93, medium: 0.98, high: 0.98 },
      'gpt-3.5-turbo': { low: 0.85, medium: 0.80, high: 0.70 },
      'claude-3-opus': { low: 0.94, medium: 0.97, high: 0.99 },
      'claude-3-sonnet': { low: 0.88, medium: 0.90, high: 0.85 },
      'claude-3-haiku': { low: 0.82, medium: 0.75, high: 0.65 }
    };
    
    return qualityMatrix[model][complexity];
  }

  /**
   * Get appropriate use cases for each model
   */
  private getModelUseCases(model: ModelName): string[] {
    const useCases = {
      'gpt-4': ['Complex analysis', 'Critical decisions', 'High-quality content'],
      'gpt-4-turbo': ['Balanced cost/quality', 'Most use cases', 'Production apps'],
      'gpt-3.5-turbo': ['Simple tasks', 'High volume', 'Cost optimization'],
      'claude-3-opus': ['Creative tasks', 'Long-form content', 'Research'],
      'claude-3-sonnet': ['Balanced usage', 'Code generation', 'Analysis'],
      'claude-3-haiku': ['Fast responses', 'Simple queries', 'Real-time apps']
    };
    
    return useCases[model];
  }

  /**
   * Calculate confidence score for cost prediction
   */
  private calculateConfidence(inputTokens: number, complexity: 'low' | 'medium' | 'high'): number {
    let confidence = 0.8; // Base confidence
    
    // Higher confidence for typical input sizes
    if (inputTokens >= 100 && inputTokens <= 2000) {
      confidence += 0.1;
    }
    
    // Adjust based on complexity
    if (complexity === 'medium') {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Generate personalized cost optimization recommendations
   */
  private async generateCostRecommendations(
    inputTokens: number,
    _outputTokens: number,
    complexity: 'low' | 'medium' | 'high',
    userId?: string
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Token optimization recommendations
    if (inputTokens > 2000) {
      recommendations.push(
        "💡 Consider summarizing input to reduce token usage by 30-50%"
      );
    }

    if (complexity === 'high' && inputTokens < 1000) {
      recommendations.push(
        "⚡ Task may not require high complexity - consider medium complexity for 60% cost savings"
      );
    }

    // User-specific recommendations
    if (userId) {
      const userStats = await this.getUserSpendingStats(userId);
      if (userStats.dailySpending > userStats.dailyBudget * 0.8) {
        recommendations.push(
          "⚠️ Approaching daily budget limit - consider batching requests or using cache"
        );
      }
    }

    // General optimization tips
    recommendations.push(
      "🔄 Enable caching to avoid duplicate AI calls",
      "📊 Use batch processing for multiple similar requests"
    );

    return recommendations;
  }

  /**
   * Track and update user spending
   */
  async recordSpending(userId: string, cost: number, model: string): Promise<void> {
    const today = new Date().toDateString();
    const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Reset daily/monthly counters if needed
    if (this.lastResetDay !== today) {
      this.dailySpending.clear();
      this.lastResetDay = today;
    }

    if (this.lastResetMonth !== thisMonth) {
      this.monthlySpending.clear();
      this.lastResetMonth = thisMonth;
    }

    // Update spending
    const currentDaily = this.dailySpending.get(userId) || 0;
    const currentMonthly = this.monthlySpending.get(userId) || 0;

    this.dailySpending.set(userId, currentDaily + cost);
    this.monthlySpending.set(userId, currentMonthly + cost);

    // Log significant spending
    if (cost > 0.10) { // Log expenses over 10 cents
      console.log(`💰 AI Cost: User ${userId} spent $${cost.toFixed(4)} on ${model}`);
    }
  }

  /**
   * Get user spending statistics
   */
  private async getUserSpendingStats(userId: string): Promise<{
    dailySpending: number;
    monthlySpending: number;
    dailyBudget: number;
    monthlyBudget: number;
  }> {
    return {
      dailySpending: this.dailySpending.get(userId) || 0,
      monthlySpending: this.monthlySpending.get(userId) || 0,
      dailyBudget: 5.00,  // $5 daily default
      monthlyBudget: 100.00 // $100 monthly default
    };
  }

  /**
   * Check if user is within budget
   */
  async checkBudget(userId: string, estimatedCost: number): Promise<{
    withinBudget: boolean;
    warnings: string[];
  }> {
    const stats = await this.getUserSpendingStats(userId);
    const warnings: string[] = [];

    const projectedDaily = stats.dailySpending + estimatedCost;
    const projectedMonthly = stats.monthlySpending + estimatedCost;

    let withinBudget = true;

    if (projectedDaily > stats.dailyBudget) {
      withinBudget = false;
      warnings.push(`Would exceed daily budget: $${projectedDaily.toFixed(2)} > $${stats.dailyBudget}`);
    }

    if (projectedMonthly > stats.monthlyBudget) {
      withinBudget = false;
      warnings.push(`Would exceed monthly budget: $${projectedMonthly.toFixed(2)} > $${stats.monthlyBudget}`);
    }

    // Warning at 80% of budget
    if (projectedDaily > stats.dailyBudget * 0.8) {
      warnings.push(`⚠️ Approaching daily budget limit (80%)`);
    }

    return { withinBudget, warnings };
  }
}

// Export singleton instance
export const aiCostPredictor = AICostPredictor.getInstance();