// Broker adapter interface for pluggable broker implementations
export interface IBrokerAdapter {
  /**
   * Connect to broker and authenticate
   */
  connect(): Promise<void>;

  /**
   * Disconnect from broker
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Place a trade order on the broker
   * @param symbol Stock symbol (e.g., "AAPL")
   * @param quantity Number of shares
   * @param price Limit price for the order
   * @param action "BUY" or "SELL"
   * @returns Order ID from broker
   */
  placeTrade(
    symbol: string,
    quantity: number,
    price: number,
    action: "BUY" | "SELL"
  ): Promise<string>;

  /**
   * Get current market price for a symbol
   */
  getCurrentPrice(symbol: string): Promise<number>;

  /**
   * Get current holdings/portfolio
   */
  getPortfolio(): Promise<PortfolioPosition[]>;

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): Promise<void>;

  /**
   * Get order status
   */
  getOrderStatus(orderId: string): Promise<OrderStatus>;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPL: number; // Profit/Loss
}

export interface OrderStatus {
  orderId: string;
  symbol: string;
  quantity: number;
  price: number;
  action: "BUY" | "SELL";
  status: "PENDING" | "EXECUTED" | "REJECTED" | "CANCELLED";
  filledQuantity: number;
  executedPrice?: number;
  timestamp: string;
}

export interface RiskConfig {
  maxPositionSize: number; // % of portfolio
  maxDailyLoss: number; // % of portfolio
  maxDrawdown: number; // % of portfolio
  enablePaperTrading: boolean; // Simulate trades without executing
  minConfidence: number; // Only execute if signal confidence >= this
}

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  message: string;
  error?: string;
}
