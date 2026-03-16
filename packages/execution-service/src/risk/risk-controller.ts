import { IBrokerAdapter, PortfolioPosition, RiskConfig } from "../types";

/**
 * Risk Controller - Validates trades against risk parameters
 * Prevents catastrophic losses and enforces position sizing
 */
export class RiskController {
  private dailyLosses = 0;
  private readonly maxOrdersPerDay = 50;
  private ordersToday = 0;

  constructor(private readonly config: RiskConfig) {
    this.resetDailyMetrics();
  }

  /**
   * Validate if a trade should be executed based on risk rules
   */
  async validateTrade(
    broker: IBrokerAdapter,
    symbol: string,
    quantity: number,
    price: number,
    action: "BUY" | "SELL",
    signalConfidence: number
  ): Promise<{ approved: boolean; reason: string }> {
    // 1. Check minimum confidence threshold
    if (signalConfidence < this.config.minConfidence) {
      return {
        approved: false,
        reason: `Signal confidence ${(signalConfidence * 100).toFixed(2)}% below minimum ${(this.config.minConfidence * 100).toFixed(2)}%`,
      };
    }

    // 2. Check daily order limit
    if (this.ordersToday >= this.maxOrdersPerDay) {
      return {
        approved: false,
        reason: `Daily order limit (${this.maxOrdersPerDay}) reached`,
      };
    }

    // 3. Get current portfolio for position sizing checks
    let portfolio: PortfolioPosition[] = [];
    try {
      portfolio = await broker.getPortfolio();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not fetch portfolio - ${message}, skipping position size check`);
    }

    // 4. Calculate portfolio value
    const portfolioValue = portfolio.reduce((sum, pos) => sum + pos.currentPrice * pos.quantity, 0);
    if (portfolioValue === 0) {
      return {
        approved: false,
        reason: "Cannot validate position size: portfolio value is zero",
      };
    }

    // 5. Check position size (don't exceed max % of portfolio)
    const tradeValue = price * quantity;
    const positionSize = (tradeValue / portfolioValue) * 100;

    if (positionSize > this.config.maxPositionSize) {
      return {
        approved: false,
        reason: `Position size ${positionSize.toFixed(2)}% exceeds max ${this.config.maxPositionSize}%`,
      };
    }

    // 6. Check daily loss limit
    if (this.dailyLosses >= this.config.maxDailyLoss) {
      return {
        approved: false,
        reason: `Daily loss limit (${this.config.maxDailyLoss}%) already reached`,
      };
    }

    // 7. Check if position exists for SELL orders (don't sell what we don't have)
    if (action === "SELL") {
      const existingPosition = portfolio.find((p) => p.symbol === symbol);
      if (!existingPosition || existingPosition.quantity < quantity) {
        const available = existingPosition?.quantity || 0;
        return {
          approved: false,
          reason: `Cannot sell ${quantity} of ${symbol}: only ${available} available`,
        };
      }
    }

    // 8. Check max drawdown (portfolio loss threshold)
    const unrealizedPL = portfolio.reduce((sum, pos) => sum + pos.unrealizedPL, 0);
    const drawdownPercent = (unrealizedPL / portfolioValue) * 100;
    if (drawdownPercent < -this.config.maxDrawdown) {
      return {
        approved: false,
        reason: `Current drawdown ${drawdownPercent.toFixed(2)}% exceeds max allowed ${-this.config.maxDrawdown}%`,
      };
    }

    return {
      approved: true,
      reason: "Trade passed all risk checks",
    };
  }

  /**
   * Record a trade execution for daily metrics tracking
   */
  recordTradeExecution(_action: "BUY" | "SELL", profitOrLoss: number): void {
    this.ordersToday++;
    if (profitOrLoss < 0) {
      this.dailyLosses += Math.abs(profitOrLoss);
    }
  }

  /**
   * Reset daily metrics at market open/end of day
   */
  resetDailyMetrics(): void {
    this.dailyLosses = 0;
    this.ordersToday = 0;
    // dayStartTime already set, will be used for tracking
    console.log("📊 Daily risk metrics reset");
  }

  /**
   * Get current risk status
   */
  getRiskStatus(): {
    dailyOrdersUsed: number;
    dailyLossesAccumulated: number;
    daysOrderLimit: number;
    maxDailyLossAllowed: number;
  } {
    return {
      dailyOrdersUsed: this.ordersToday,
      dailyLossesAccumulated: this.dailyLosses,
      daysOrderLimit: this.maxOrdersPerDay,
      maxDailyLossAllowed: this.config.maxDailyLoss,
    };
  }
}

/**
 * Configuration factory for different risk profiles
 */
export const RiskProfiles = {
  CONSERVATIVE: {
    maxPositionSize: 5, // Max 5% per trade
    maxDailyLoss: 2, // Max 2% daily loss
    maxDrawdown: 5, // Max 5% portfolio drawdown
    enablePaperTrading: true,
    minConfidence: 0.7, // Only execute 70%+ confidence trades
  },
  MODERATE: {
    maxPositionSize: 10, // Max 10% per trade
    maxDailyLoss: 5, // Max 5% daily loss
    maxDrawdown: 10, // Max 10% portfolio drawdown
    enablePaperTrading: false,
    minConfidence: 0.6,
  },
  AGGRESSIVE: {
    maxPositionSize: 15, // Max 15% per trade
    maxDailyLoss: 10, // Max 10% daily loss
    maxDrawdown: 15, // Max 15% portfolio drawdown
    enablePaperTrading: false,
    minConfidence: 0.5,
  },
  PAPER_TRADING: {
    maxPositionSize: 50, // Higher limits for testing
    maxDailyLoss: 100,
    maxDrawdown: 100,
    enablePaperTrading: true,
    minConfidence: 0.3, // Lower confidence threshold for testing
  },
};
