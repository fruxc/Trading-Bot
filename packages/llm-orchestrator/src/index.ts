/**
 * LLM Orchestrator Entry Point
 * Demonstrates signal evaluation with pluggable LLM providers
 */
import { TradeSignal } from '@trading-bot/shared';
import { LLMOrchestrator } from './orchestrator';
import { PortfolioEvaluator } from './portfolio-evaluator';
import { MockLLMProvider } from './providers/mock-provider';
import { GeminiProvider } from './providers/gemini-provider';

async function main() {
  console.log('🚀 LLM Orchestrator Started\n');

  // Initialize with mock provider (swap with Gemini if API key is available)
  let provider = new MockLLMProvider();

  if (process.env.GEMINI_API_KEY) {
    try {
      provider = new GeminiProvider();
      console.log('✅ Using Gemini Provider\n');
    } catch (error) {
      console.log(
        '⚠️  Gemini Provider failed, falling back to Mock Provider\n'
      );
    }
  } else {
    console.log('ℹ️  No GEMINI_API_KEY found, using Mock Provider\n');
  }

  const orchestrator = new LLMOrchestrator(provider);
  const portfolio = PortfolioEvaluator.getMockPortfolio();

  // Demo signal
  const signal: TradeSignal = {
    symbol: 'AAPL',
    action: 'BUY',
    confidence: 0.75,
    price: 150,
    timestamp: new Date(),
    reason: 'Positive momentum detected in 24h chart',
  };

  console.log('📊 Input Signal:');
  console.log(JSON.stringify(signal, null, 2));
  console.log('');

  console.log('💼 Current Portfolio:');
  console.log(`Total Value: $${portfolio.totalValue}`);
  console.log(`Available Cash: $${portfolio.cash}`);
  console.log(
    `Risk Limit: ${portfolio.riskLimit}% | Positions: ${Object.keys(portfolio.positions).length}`
  );
  console.log('');

  try {
    const proposal = await orchestrator.proposeTrade(signal, portfolio);

    console.log('📋 Trade Proposal:');
    console.log(JSON.stringify(proposal, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error evaluating signal:', error);
  }

  console.log('✅ LLM Orchestrator Demo Complete');
}

main().catch(console.error);
