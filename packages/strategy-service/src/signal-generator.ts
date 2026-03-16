/**
 * Trading Signal Generator
 * Generates trading signals based on mock market data
 */
import { TradeSignal, MarketData } from '@trading-bot/shared';

export class SignalGenerator {
  /**
   * Generates a trading signal based on market data
   * Using simple momentum-based logic for demo purposes
   */
  static generateSignal(marketData: MarketData[]): TradeSignal {
    // Select a random asset
    const signal = marketData[Math.floor(Math.random() * marketData.length)];

    // Simple strategy: buy on positive momentum, sell on negative
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.5;
    let reason = 'Neutral momentum';

    if (signal.change24h > 2) {
      action = 'BUY';
      confidence = Math.min(0.95, 0.5 + signal.change24h / 20);
      reason = `Positive momentum: ${signal.change24h.toFixed(2)}% 24h change`;
    } else if (signal.change24h < -2) {
      action = 'SELL';
      confidence = Math.min(0.95, 0.5 + Math.abs(signal.change24h) / 20);
      reason = `Negative momentum: ${signal.change24h.toFixed(2)}% 24h change`;
    } else {
      reason = `Neutral momentum: ${signal.change24h.toFixed(2)}% 24h change`;
    }

    return {
      symbol: signal.symbol,
      action,
      confidence: Number.parseFloat(confidence.toFixed(2)),
      price: signal.price,
      timestamp: signal.timestamp,
      reason,
    };
  }
}
