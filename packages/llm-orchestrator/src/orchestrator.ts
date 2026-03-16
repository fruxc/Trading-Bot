/**
 * LLM Orchestrator
 * Manages LLM provider abstraction and trade proposal generation
 */
import {
  ILLMProvider,
  TradeSignal,
  PortfolioContext,
  TradeProposal,
} from '@trading-bot/shared';

export class LLMOrchestrator {
  constructor(private provider: ILLMProvider) {}

  /**
   * Evaluate a trade signal and generate a proposal
   */
  async proposeTrade(
    signal: TradeSignal,
    portfolio: PortfolioContext
  ): Promise<TradeProposal> {
    console.log(
      `📋 Evaluating signal with ${this.provider.getName()}: ${signal.symbol} ${signal.action}`
    );

    const proposal = await this.provider.evaluateSignal(signal, portfolio);

    console.log(
      `✅ Proposal generated: ${proposal.approved ? 'APPROVED' : 'REJECTED'}`
    );

    return proposal;
  }

  /**
   * Swap LLM provider at runtime
   * Demonstrates the flexibility of the interface-based design
   */
  setProvider(provider: ILLMProvider): void {
    console.log(`🔄 Switching LLM provider to: ${provider.getName()}`);
    this.provider = provider;
  }

  /**
   * Get current provider info
   */
  getCurrentProvider(): string {
    return this.provider.getName();
  }
}
