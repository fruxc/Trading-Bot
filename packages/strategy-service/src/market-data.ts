/**
 * Mock Market Data Provider
 * Generates realistic market data for testing
 */
import { MarketData } from '@trading-bot/shared';

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];

export class MarketDataProvider {
  /**
   * Generates mock market data for trading
   */
  static generateMarketData(): MarketData[] {
    return SYMBOLS.map((symbol) => ({
      symbol,
      price: this.getRandomPrice(symbol),
      volume: Math.floor(Math.random() * 1000000) + 100000,
      timestamp: new Date(),
      change24h: (Math.random() - 0.5) * 10, // -5% to +5%
    }));
  }

  /**
   * Gets mock price data for a symbol
   */
  static getRandomPrice(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      AAPL: 150,
      GOOGL: 140,
      MSFT: 380,
      TSLA: 250,
      AMZN: 180,
    };

    const base = basePrices[symbol] || 100;
    const variance = (Math.random() - 0.5) * base * 0.1; // ±5% variance
    return Number.parseFloat((base + variance).toFixed(2));
  }
}
