import { ILLMProvider, TradeSignal, TradeProposal, PortfolioContext } from "../index";
import { GeopoliticalAnalyzer } from "../portfolio/manager";

/**
 * Enhanced LLM Provider with Geopolitical Analysis
 * Considers geopolitical factors in trading decisions
 */
export class EnhancedLLMProvider implements ILLMProvider {
  private geoAnalyzer: GeopoliticalAnalyzer;
  private baseProvider: ILLMProvider;

  constructor(baseProvider: ILLMProvider) {
    this.baseProvider = baseProvider;
    this.geoAnalyzer = new GeopoliticalAnalyzer();
    this.geoAnalyzer.initialize();
  }

  async evaluateSignal(signal: TradeSignal, portfolio: PortfolioContext): Promise<TradeProposal> {
    // Get base evaluation from underlying provider
    const baseProposal = await this.baseProvider.evaluateSignal(signal, portfolio);

    // Enhance with geopolitical analysis
    const geoRisk = this.geoAnalyzer.assessSymbolRisk(signal.symbol, signal.country || "INDIA");
    const tradingRecommendation = this.geoAnalyzer.getTradingRecommendation();

    // Adjust confidence based on geopolitical risk
    const adjustedConfidence = this.adjustConfidenceForGeo(signal.confidence, geoRisk.riskScore);

    // If geopolitical risk is critical, recommend rejection
    if (geoRisk.riskScore > 80) {
      return {
        approved: false,
        proposedAction: "HOLD",
        quantity: 0,
        reason: `⚠️ GEOPOLITICAL RISK ALERT: ${geoRisk.recommendation}. ${geoRisk.factors[0]}`,
        riskAssessment: `Geopolitical risk score: ${geoRisk.riskScore}/100`,
        recommendedStopLoss: signal.price * 0.95,
        recommendedTakeProfit: signal.price * 1.05,
      };
    }

    // Return enhanced proposal
    return {
      ...baseProposal,
      approved: baseProposal.approved && adjustedConfidence >= 0.6,
      reason: `${baseProposal.reason}\n\n📍 Geopolitical Assessment:\n${geoRisk.factors.join("\n")}`,
      riskAssessment: `${baseProposal.riskAssessment}\n\nGeopolitical Risk: ${geoRisk.riskScore}/100 (${geoRisk.recommendation})`,
      quantity: Math.floor(baseProposal.quantity * (adjustedConfidence / signal.confidence)),
    };
  }

  getName(): string {
    return `Enhanced_${this.baseProvider.getName()}`;
  }

  /**
   * Adjust confidence based on geopolitical risk
   */
  private adjustConfidenceForGeo(originalConfidence: number, geoRiskScore: number): number {
    // High geopolitical risk reduces confidence
    const riskFactor = 1 - geoRiskScore / 200; // Max 50% reduction
    return Math.max(originalConfidence * riskFactor, 0.3);
  }

  /**
   * Get geopolitical factors for reporting
   */
  getGeopoliticalFactors() {
    return this.geoAnalyzer.getAllFactors();
  }

  /**
   * Check if trading is generally safe
   */
  isTradingSafe(): boolean {
    return this.geoAnalyzer.isTradingRecommended();
  }
}

/**
 * International Market Aware LLM Provider
 * Evaluates stocks from multiple countries
 */
export class InternationalLLMProvider implements ILLMProvider {
  private countryRiskMap: Map<string, number> = new Map([
    ["USA", 30],
    ["UK", 35],
    ["EUROPE", 40],
    ["JAPAN", 35],
    ["INDIA", 45],
    ["CHINA", 70],
    ["EMERGING", 60],
  ]);

  async evaluateSignal(signal: TradeSignal, portfolio: PortfolioContext): Promise<TradeProposal> {
    const country = signal.country || "INDIA";
    const countryRisk = this.countryRiskMap.get(country) || 50;

    // Evaluate signal confidence based on country risk
    const adjustedConfidence = signal.confidence * (1 - countryRisk / 200);

    // Determine appropriate position size based on country
    let positionSizePercent = 5;
    if (country === "USA" || country === "UK") {
      positionSizePercent = 3; // More conservative for developed markets
    } else if (country === "EMERGING" || country === "CHINA") {
      positionSizePercent = 2; // Very conservative for emerging markets
    }

    // Calculate position size in rupees (assuming 100k portfolio)
    const portfolioValue = portfolio.cash + portfolio.positions.reduce((sum, p) => sum + p.currentValue, 0);
    const positionValue = (portfolioValue * positionSizePercent) / 100;
    const quantity = Math.floor(positionValue / signal.price);

    return {
      approved: adjustedConfidence >= 0.6,
      proposedAction: signal.action,
      quantity,
      reason: `International trade: ${country}. Signal confidence: ${(signal.confidence * 100).toFixed(0)}%. Adjusted for country risk: ${(adjustedConfidence * 100).toFixed(0)}%.`,
      riskAssessment: `Country: ${country} (Risk: ${countryRisk}/100). Portfolio allocation: ${positionSizePercent}%. Diversification benefit: Trading multiple countries reduces concentration risk.`,
      recommendedStopLoss: signal.price * (1 - 0.03), // 3% stop loss
      recommendedTakeProfit: signal.price * (1 + 0.07), // 7% take profit
    };
  }

  getName(): string {
    return "InternationalMarketLLM";
  }
}

/**
 * Sector-Aware LLM Provider
 * Considers sector-specific factors
 */
export class SectorAwareLLMProvider implements ILLMProvider {
  private sectorMultipliers: Map<string, number> = new Map([
    ["IT", 1.1], // Tech is hot, boost confidence
    ["PHARMA", 1.05],
    ["BANKING", 0.95],
    ["ENERGY", 0.9], // Energy volatile
    ["REAL_ESTATE", 0.8], // Real estate slower
    ["MANUFACTURING", 0.95],
    ["FMCG", 1.0],
  ]);

  async evaluateSignal(signal: TradeSignal, portfolio: PortfolioContext): Promise<TradeProposal> {
    const sector = signal.sector || "MANUFACTURING";
    const multiplier = this.sectorMultipliers.get(sector) || 1.0;

    const adjustedConfidence = signal.confidence * multiplier;
    const adjustedQuantity = Math.floor(15 * multiplier);

    return {
      approved: adjustedConfidence >= 0.6,
      proposedAction: signal.action,
      quantity: adjustedQuantity,
      reason: `Sector: ${sector}. Base confidence: ${(signal.confidence * 100).toFixed(0)}%. Sector adjusted: ${(adjustedConfidence * 100).toFixed(0)}% (Multiplier: ${multiplier}x).`,
      riskAssessment: `Sector momentum is ${multiplier > 1 ? "positive" : "challenging"}. Recommend diversifying across sectors to manage risk.`,
      recommendedStopLoss: signal.price * 0.95,
      recommendedTakeProfit: signal.price * 1.08,
    };
  }

  getName(): string {
    return "SectorAwareLLM";
  }
}
