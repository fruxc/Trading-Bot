/**
 * Mock LLM Provider Implementation
 * Useful for testing without API calls
 */
import {
  ILLMProvider,
  TradeSignal,
  PortfolioContext,
  TradeProposal,
} from '@trading-bot/shared';

export class MockLLMProvider implements ILLMProvider {
  async evaluateSignal(
    signal: TradeSignal,
    portfolio: PortfolioContext
  ): Promise<TradeProposal> {
    // Simulate evaluation logic
    const riskRatio = signal.action === 'BUY' ? 0.05 : 0.03; // 5% for BUY, 3% for SELL
    const tradeSize = portfolio.totalValue * riskRatio;
    const quantity = Math.floor(tradeSize / signal.price);

    const isApproved =
      signal.confidence > 0.6 &&
      (signal.action === 'HOLD' ||
        portfolio.cash > tradeSize ||
        signal.action === 'SELL');

    return {
      approved: isApproved,
      proposedAction: signal.action,
      quantity,
      reason: `Mock evaluation for ${signal.action}: ${signal.reason}`,
      riskAssessment: `Allocating ${(riskRatio * 100).toFixed(1)}% of portfolio`,
      recommendedStopLoss:
        signal.action === 'BUY'
          ? Number.parseFloat((signal.price * 0.95).toFixed(2))
          : undefined,
      recommendedTakeProfit:
        signal.action === 'BUY'
          ? Number.parseFloat((signal.price * 1.15).toFixed(2))
          : undefined,
    };
  }

  getName(): string {
    return 'MockLLMProvider';
  }
}
