/**
 * Strategy Service Entry Point
 * Generates market signals for trading
 */
import { MarketDataProvider } from './market-data';
import { SignalGenerator } from './signal-generator';

async function main() {
  console.log('🚀 Strategy Service Started\n');

  // Simulate continuous signal generation
  for (let i = 0; i < 5; i++) {
    const marketData = MarketDataProvider.generateMarketData();
    const signal = SignalGenerator.generateSignal(marketData);

    console.log(`📊 Signal #${i + 1}:`);
    console.log(JSON.stringify(signal, null, 2));
    console.log('');

    // Wait 2 seconds between signals
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('✅ Strategy Service Demo Complete');
}

main().catch(console.error);
