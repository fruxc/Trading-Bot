/**
 * Abstract LLM Provider Interface
 * Allows swapping between different LLM implementations (Gemini, Anthropic, etc.)
 * without changing core orchestrator logic
 */
export interface ILLMProvider {
  /**
   * Evaluates a trade signal against portfolio context and returns a trade proposal
   * @param signal - Trading signal from strategy service
   * @param portfolio - Current portfolio state
   * @returns Promise resolving to a structured trade proposal
   */
  evaluateSignal(
    signal: TradeSignal,
    portfolio: PortfolioContext
  ): Promise<TradeProposal>;

  /**
   * Provider name for logging and debugging
   */
  getName(): string;
}

export interface TradeSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  price: number;
  timestamp: Date;
  reason: string;
}

export interface PortfolioContext {
  totalValue: number;
  positions: {
    [symbol: string]: {
      quantity: number;
      averageCost: number;
      currentPrice: number;
    };
  };
  cash: number;
  riskLimit: number; // percentage of portfolio
}

export interface TradeProposal {
  approved: boolean;
  proposedAction: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
  reason: string;
  riskAssessment: string;
  recommendedStopLoss?: number;
  recommendedTakeProfit?: number;
}
