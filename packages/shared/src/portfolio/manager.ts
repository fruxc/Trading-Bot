/**
 * Portfolio Management & Summary Module
 * Tracks holdings, calculates P&L, and generates summaries
 */

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  invested: number; // quantity * averagePrice
  currentValue: number; // quantity * currentPrice
  unrealizedPL: number; // currentValue - invested
  unrealizedPLPercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  cash: number;
  invested: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weekChange: number;
  monthChange: number;
  positions: PortfolioPosition[];
  lastUpdated: string;
}

export interface GeopoliticalFactor {
  country: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  affectedSectors: string[];
  recommendation: "BUY" | "SELL" | "HOLD" | "AVOID";
  severity: number; // 0-100
}

export class PortfolioManager {
  private positions: Map<string, PortfolioPosition> = new Map();
  private cash = 100000; // Starting capital
  private dailyStartValue = 100000;
  private weeklyStartValue = 100000;
  private monthlyStartValue = 100000;

  /**
   * Update position in portfolio
   */
  updatePosition(symbol: string, quantity: number, price: number, action: "BUY" | "SELL"): void {
    const existing = this.positions.get(symbol) || {
      symbol,
      quantity: 0,
      averagePrice: 0,
      currentPrice: price,
      invested: 0,
      currentValue: 0,
      unrealizedPL: 0,
      unrealizedPLPercent: 0,
    };

    if (action === "BUY") {
      // Update average price for new position
      const totalInvested = existing.invested + price * quantity;
      const totalQuantity = existing.quantity + quantity;
      existing.averagePrice = totalInvested / totalQuantity;
      existing.quantity = totalQuantity;
      this.cash -= price * quantity;
    } else {
      // SELL
      existing.quantity -= quantity;
      this.cash += price * quantity;

      // If fully sold, remove position
      if (existing.quantity === 0) {
        this.positions.delete(symbol);
        return;
      }
    }

    existing.currentPrice = price;
    existing.invested = existing.quantity * existing.averagePrice;
    existing.currentValue = existing.quantity * price;
    existing.unrealizedPL = existing.currentValue - existing.invested;
    existing.unrealizedPLPercent = (existing.unrealizedPL / existing.invested) * 100;

    this.positions.set(symbol, existing);
  }

  /**
   * Update current prices (from market data)
   */
  updatePrices(priceUpdates: Record<string, number>): void {
    for (const [symbol, price] of Object.entries(priceUpdates)) {
      const position = this.positions.get(symbol);
      if (position) {
        position.currentPrice = price;
        position.currentValue = position.quantity * price;
        position.unrealizedPL = position.currentValue - position.invested;
        position.unrealizedPLPercent = (position.unrealizedPL / position.invested) * 100;
      }
    }
  }

  /**
   * Get portfolio summary
   */
  getSummary(): PortfolioSummary {
    const positions = Array.from(this.positions.values());
    const totalValue = this.cash + positions.reduce((sum, p) => sum + p.currentValue, 0);
    const invested = positions.reduce((sum, p) => sum + p.invested, 0);
    const unrealizedPL = positions.reduce((sum, p) => sum + p.unrealizedPL, 0);
    const unrealizedPLPercent = invested > 0 ? (unrealizedPL / invested) * 100 : 0;

    return {
      totalValue,
      cash: this.cash,
      invested,
      unrealizedPL,
      unrealizedPLPercent,
      dayChange: totalValue - this.dailyStartValue,
      dayChangePercent: ((totalValue - this.dailyStartValue) / this.dailyStartValue) * 100,
      weekChange: totalValue - this.weeklyStartValue,
      monthChange: totalValue - this.monthlyStartValue,
      positions,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Reset daily metrics (call at market open)
   */
  resetDailyMetrics(): void {
    const currentSummary = this.getSummary();
    this.dailyStartValue = currentSummary.totalValue;
  }

  /**
   * Reset weekly metrics (call every Monday)
   */
  resetWeeklyMetrics(): void {
    const currentSummary = this.getSummary();
    this.weeklyStartValue = currentSummary.totalValue;
  }

  /**
   * Reset monthly metrics (call 1st of month)
   */
  resetMonthlyMetrics(): void {
    const currentSummary = this.getSummary();
    this.monthlyStartValue = currentSummary.totalValue;
  }

  /**
   * Get risk metrics
   */
  getRiskMetrics() {
    const summary = this.getSummary();
    const exposurePercent = (summary.invested / summary.totalValue) * 100;
    const largestPosition = Array.from(this.positions.values()).reduce(
      (max, pos) => (pos.currentValue > max.currentValue ? pos : max),
      { currentValue: 0 } as any
    );
    const largestPositionPercent = (largestPosition.currentValue / summary.totalValue) * 100;

    return {
      exposurePercent, // How much of portfolio is invested
      largestPositionPercent, // Concentration risk
      numberOfPositions: this.positions.size,
      diversificationRating: this.calculateDiversificationRating(),
    };
  }

  private calculateDiversificationRating(): string {
    const count = this.positions.size;
    if (count === 0) return "NO_POSITIONS";
    if (count === 1) return "HIGHLY_CONCENTRATED";
    if (count <= 3) return "CONCENTRATED";
    if (count <= 8) return "MODERATE";
    return "WELL_DIVERSIFIED";
  }
}

/**
 * Geopolitical Risk Analyzer
 * Consider geopolitical factors in trading decisions
 */
export class GeopoliticalAnalyzer {
  private factors: Map<string, GeopoliticalFactor> = new Map();

  /**
   * Initialize with current geopolitical factors
   */
  initialize(): void {
    // Example: Add geopolitical factors
    this.addFactor({
      country: "USA",
      riskLevel: "MEDIUM",
      description: "Fed policy uncertainty, election cycle impacts",
      affectedSectors: ["TECH", "FINANCE"],
      recommendation: "HOLD",
      severity: 45,
    });

    this.addFactor({
      country: "INDIA",
      riskLevel: "LOW",
      description: "Stable growth outlook, strong rupee",
      affectedSectors: ["IT", "PHARMA", "ENERGY"],
      recommendation: "BUY",
      severity: 20,
    });

    this.addFactor({
      country: "EUROPE",
      riskLevel: "MEDIUM",
      description: "Energy crisis, inflation concerns",
      affectedSectors: ["ENERGY", "MANUFACTURING"],
      recommendation: "HOLD",
      severity: 50,
    });

    this.addFactor({
      country: "CHINA",
      riskLevel: "HIGH",
      description: "Tech regulations, real estate concerns",
      affectedSectors: ["TECH", "MANUFACTURING", "REAL_ESTATE"],
      recommendation: "AVOID",
      severity: 70,
    });
  }

  /**
   * Add or update a geopolitical factor
   */
  addFactor(factor: GeopoliticalFactor): void {
    this.factors.set(factor.country, factor);
  }

  /**
   * Get risk assessment for a symbol
   */
  assessSymbolRisk(symbol: string, country: string): {
    riskScore: number; // 0-100
    recommendation: string;
    factors: string[];
  } {
    const factor = this.factors.get(country);

    if (!factor) {
      return {
        riskScore: 30,
        recommendation: "HOLD",
        factors: ["No specific geopolitical factors identified"],
      };
    }

    return {
      riskScore: factor.severity,
      recommendation: factor.recommendation,
      factors: [
        `${factor.riskLevel} risk: ${factor.description}`,
        `Affected sectors: ${factor.affectedSectors.join(", ")}`,
      ],
    };
  }

  /**
   * Get all current geopolitical factors
   */
  getAllFactors(): GeopoliticalFactor[] {
    return Array.from(this.factors.values());
  }

  /**
   * Check if trading is recommended given current geopolitical situation
   */
  isTradingRecommended(): boolean {
    const criticalFactors = Array.from(this.factors.values()).filter((f) => f.severity > 80);
    return criticalFactors.length === 0;
  }

  /**
   * Get trading recommendation based on geopolitical factors
   */
  getTradingRecommendation(): string {
    const highRiskFactors = Array.from(this.factors.values()).filter((f) => f.severity > 60);

    if (highRiskFactors.length > 2) {
      return "CAUTION - Multiple high-risk geopolitical factors detected. Consider reducing positions.";
    }

    if (highRiskFactors.length > 0) {
      return `CAUTIOUS - Monitor: ${highRiskFactors.map((f) => f.country).join(", ")}`;
    }

    return "CONDITIONS_FAVORABLE";
  }
}
