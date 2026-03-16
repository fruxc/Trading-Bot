/**
 * Portfolio Evaluator
 * Generates mock portfolio context for testing
 */
import { PortfolioContext } from '@trading-bot/shared';

export class PortfolioEvaluator {
  /**
   * Generates a mock portfolio state
   */
  static getMockPortfolio(): PortfolioContext {
    return {
      totalValue: 100000,
      cash: 25000,
      riskLimit: 2,
      positions: {
        AAPL: {
          quantity: 100,
          averageCost: 140,
          currentPrice: 150,
        },
        MSFT: {
          quantity: 50,
          averageCost: 300,
          currentPrice: 380,
        },
        GOOGL: {
          quantity: 30,
          averageCost: 120,
          currentPrice: 140,
        },
      },
    };
  }

  /**
   * Calculates portfolio risk metrics
   */
  static calculateRiskMetrics(portfolio: PortfolioContext): {
    exposurePercentage: number;
    allocatedValue: number;
    riskCapacity: number;
  } {
    const allocatedValue = Object.values(portfolio.positions).reduce(
      (sum, pos) => sum + pos.quantity * pos.currentPrice,
      0
    );

    const exposurePercentage = (allocatedValue / portfolio.totalValue) * 100;
    const riskCapacity = (portfolio.riskLimit * portfolio.totalValue) / 100;

    return {
      exposurePercentage,
      allocatedValue,
      riskCapacity,
    };
  }
}
