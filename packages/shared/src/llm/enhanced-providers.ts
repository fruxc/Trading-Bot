/**
 * Enhanced LLM Providers
 * Specialized LLM implementations for advanced trading analysis
 */
import type { ILLMProvider, TradeSignal, PortfolioContext, TradeProposal } from '../interfaces/llm-provider';

/**
 * International LLM Provider
 * Considers global market conditions and diversification
 */
export class InternationalLLMProvider implements ILLMProvider {
  async evaluateSignal(signal: TradeSignal, portfolio: PortfolioContext): Promise<TradeProposal> {
    // Base confidence from signal
    const baseConfidence = signal.confidence;
    
    // Check portfolio diversity
    const positionCount = Object.keys(portfolio.positions).length;
    const diversificationScore = Math.min(1, positionCount / 10); // Higher score with more positions
    
    // Risk check: ensure sufficient cash reserves
    const cashRatio = portfolio.cash / portfolio.totalValue;
    const hasAdequateCash = cashRatio > 0.1; // Need at least 10% cash reserve
    
    // Adjust confidence based on international factors
    const adjustedConfidence = baseConfidence * (0.7 + 0.3 * diversificationScore);
    
    const shouldApprove = adjustedConfidence > 0.6 && 
                         hasAdequateCash && 
                         signal.action !== 'HOLD';

    return {
      approved: shouldApprove,
      proposedAction: signal.action,
      quantity: signal.action === 'HOLD' ? 0 : Math.floor(portfolio.cash / signal.price * 0.05), // Risk 5% of cash per trade
      reason: shouldApprove 
        ? `Global analysis supports ${signal.action}: ${signal.reason} (diversity score: ${diversificationScore.toFixed(2)})`
        : `International conditions warrant caution: cash ratio too low or signal weak`,
      riskAssessment: `Portfolio diversification: ${positionCount} positions, Cash reserves: ${(cashRatio * 100).toFixed(1)}%`,
      recommendedStopLoss: signal.action === 'BUY' ? signal.price * 0.95 : signal.price * 1.05,
      recommendedTakeProfit: signal.action === 'BUY' ? signal.price * 1.08 : signal.price * 0.92,
    };
  }

  getName(): string {
    return 'InternationalLLMProvider';
  }
}

/**
 * Sector Aware LLM Provider
 * Analyzes trading signals with sector-level market awareness
 */
export class SectorAwareLLMProvider implements ILLMProvider {
  async evaluateSignal(signal: TradeSignal, portfolio: PortfolioContext): Promise<TradeProposal> {
    // Confidence-based approval strategy
    const confidence = signal.confidence;
    
    // Check if position already exists (sector concentration risk)
    const positionExists = signal.symbol in portfolio.positions;
    const existingQuantity = positionExists 
      ? portfolio.positions[signal.symbol]?.quantity || 0 
      : 0;
    
    // Avoid over-concentration in same security
    const allowAddition = existingQuantity === 0 || signal.action === 'SELL';
    
    // High confidence signals get approval if position check passes
    const approved = confidence > 0.65 && allowAddition && signal.action !== 'HOLD';
    
    const quantity = approved 
      ? Math.floor(portfolio.cash / signal.price * 0.03) // Risk 3% per sector trade
      : 0;

    return {
      approved,
      proposedAction: signal.action,
      quantity,
      reason: approved
        ? `Sector analysis supports ${signal.action}: ${signal.reason}`
        : `Sector concentration risk or weak signal confidence`,
      riskAssessment: `Position concentration: ${positionExists ? 'EXISTS' : 'NEW'}, Signal confidence: ${(confidence * 100).toFixed(1)}%`,
      recommendedStopLoss: signal.action === 'BUY' ? signal.price * 0.93 : signal.price * 1.07,
      recommendedTakeProfit: signal.action === 'BUY' ? signal.price * 1.1 : signal.price * 0.9,
    };
  }

  getName(): string {
    return 'SectorAwareLLMProvider';
  }
}

/**
 * Risk-Conservative LLM Provider
 * Very strict approval criteria for high-risk scenarios
 */
export class RiskConservativeLLMProvider implements ILLMProvider {
  async evaluateSignal(signal: TradeSignal, portfolio: PortfolioContext): Promise<TradeProposal> {
    // Only approve very high confidence signals
    const minConfidence = 0.8;
    const cashBuffer = portfolio.cash / portfolio.totalValue;
    
    // Conservative: need 20% cash reserve
    const hasSufficientCash = cashBuffer > 0.2;
    
    // Count open positions for diversification check
    const positionCount = Object.keys(portfolio.positions).length;
    const notOverconcentrated = positionCount < 8;
    
    const approved = signal.confidence >= minConfidence && 
                    hasSufficientCash && 
                    notOverconcentrated &&
                    signal.action !== 'HOLD';
    
    const quantity = approved 
      ? Math.floor(portfolio.cash / signal.price * 0.02) // Very small: 2% per trade
      : 0;

    return {
      approved,
      proposedAction: signal.action,
      quantity,
      reason: approved
        ? `Conservative approval for high-confidence ${signal.action}: ${signal.reason}`
        : `Signal does not meet conservative risk criteria`,
      riskAssessment: `Cash buffer: ${(cashBuffer * 100).toFixed(1)}%, Positions: ${positionCount}, Confidence: ${(signal.confidence * 100).toFixed(1)}%`,
      recommendedStopLoss: signal.action === 'BUY' ? signal.price * 0.96 : signal.price * 1.04,
      recommendedTakeProfit: signal.action === 'BUY' ? signal.price * 1.06 : signal.price * 0.94,
    };
  }

  getName(): string {
    return 'RiskConservativeLLMProvider';
  }
}

