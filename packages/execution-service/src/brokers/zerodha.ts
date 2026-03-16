import KiteConnect from "kiteconnect";
import { IBrokerAdapter, OrderStatus, PortfolioPosition } from "../types";

export class ZerodhaBroker implements IBrokerAdapter {
  private readonly kite: any;
  private connected = false;
  private readonly paperTradingMode: boolean;
  private readonly executedOrders: Map<string, OrderStatus> = new Map();

  constructor(apiKey: string, accessToken: string, paperTrading = false) {
    this.kite = new KiteConnect.KiteConnect({ api_key: apiKey });
    this.kite.setAccessToken(accessToken);
    this.paperTradingMode = paperTrading;
  }

  async connect(): Promise<void> {
    try {
      // Validate connection by fetching account details
      const profile = await this.kite.getProfile();
      console.log(`✅ Connected to Zerodha - Account: ${profile.user_id}`);
      this.connected = true;

      if (this.paperTradingMode) {
        console.log("⚠️ Running in PAPER TRADING MODE - No real trades will be executed");
      }
    } catch (error: any) {
      throw new Error(`Failed to connect to Zerodha: ${error.message}`);
    }
  }

  disconnect(): Promise<void> {
    this.connected = false;
    console.log("Disconnected from Zerodha");
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async placeTrade(
    symbol: string,
    quantity: number,
    price: number,
    action: "BUY" | "SELL"
  ): Promise<string> {
    if (!this.connected) {
      throw new Error("Not connected to broker");
    }

    // Convert symbol to Zerodha format (e.g., "AAPL" -> "NSE:AAPL" for Indian stocks, or "NSEFO:" for forex)
    // For Zerodha NSE: prefix is "NSE:" for stocks, "BSE:" for bonds
    const zerodhaSymbol = `NSE:${symbol}`;

    try {
      if (this.paperTradingMode) {
        // Simulate order in paper trading mode
        const orderId = `PAPER_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        this.executedOrders.set(orderId, {
          orderId,
          symbol,
          quantity,
          price,
          action,
          status: "EXECUTED",
          filledQuantity: quantity,
          executedPrice: price,
          timestamp: new Date().toISOString(),
        });
        console.log(`📝 [PAPER TRADING] ${action} ${quantity} ${symbol} @ ₹${price}`);
        return orderId;
      }

      // Real execution on Zerodha
      const orderParams = {
        tradingsymbol: zerodhaSymbol,
        exchange: "NSE",
        quantity: quantity.toString(),
        price: price.toString(),
        order_type: "LIMIT",
        transaction_type: action === "BUY" ? "BUY" : "SELL",
        validity: "DAY", // Order valid for today only
      };

      const response = await this.kite.placeOrder(orderParams, "regular");

      console.log(`✅ Order placed - ID: ${response.order_id}`);
      return response.order_id;
    } catch (error: any) {
      throw new Error(`Failed to place trade on Zerodha: ${error.message}`);
    }
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    if (!this.connected) {
      throw new Error("Not connected to broker");
    }

    try {
      const zerodhaSymbol = `NSE:${symbol}`;
      const quote = await this.kite.getQuote("NSE", [zerodhaSymbol]);
      return quote[zerodhaSymbol].last_price;
    } catch (error: any) {
      throw new Error(`Failed to get price for ${symbol}: ${error.message}`);
    }
  }

  async getPortfolio(): Promise<PortfolioPosition[]> {
    if (!this.connected) {
      throw new Error("Not connected to broker");
    }

    try {
      const holdings = await this.kite.getHoldings();
      return holdings.map((h: any) => ({
        symbol: h.tradingsymbol.replace("NSE:", ""),
        quantity: h.quantity,
        averagePrice: h.average_price,
        currentPrice: h.last_price,
        unrealizedPL: (h.last_price - h.average_price) * h.quantity,
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch portfolio: ${error.message}`);
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected to broker");
    }

    try {
      if (this.paperTradingMode) {
        this.executedOrders.delete(orderId);
        console.log(`📝 [PAPER TRADING] Order cancelled - ID: ${orderId}`);
        return;
      }

      await this.kite.cancelOrder(orderId, "regular");
      console.log(`✅ Order cancelled - ID: ${orderId}`);
    } catch (error: any) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    if (!this.connected) {
      throw new Error("Not connected to broker");
    }

    // Check paper trading orders first
    if (this.executedOrders.has(orderId)) {
      return this.executedOrders.get(orderId)!;
    }

    try {
      const orders = await this.kite.getOrders();
      const order = orders.find((o: any) => o.order_id === orderId);

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      return {
        orderId: order.order_id,
        symbol: order.tradingsymbol.replace("NSE:", ""),
        quantity: order.quantity,
        price: order.price,
        action: order.transaction_type === "BUY" ? "BUY" : "SELL",
        status: this.mapZerodhaStatus(order.status),
        filledQuantity: order.filled_quantity,
        executedPrice: order.average_price || order.price,
        timestamp: order.order_timestamp,
      };
    } catch (error: any) {
      throw new Error(`Failed to get order status: ${error.message}`);
    }
  }

  private mapZerodhaStatus(zerodhaStatus: string): "PENDING" | "EXECUTED" | "REJECTED" | "CANCELLED" {
    const statusMap: Record<string, "PENDING" | "EXECUTED" | "REJECTED" | "CANCELLED"> = {
      PENDING: "PENDING",
      COMPLETE: "EXECUTED",
      CANCELLED: "CANCELLED",
      REJECTED: "REJECTED",
      OPEN: "PENDING",
      PARTIALLY_FILLED: "PENDING",
    };
    return statusMap[zerodhaStatus] || "PENDING";
  }
}

/**
 * Mock broker for testing (paper trading without API)
 */
export class MockBroker implements IBrokerAdapter {
  private connected = false;
  private readonly portfolio: Map<string, PortfolioPosition> = new Map();
  private readonly orders: Map<string, OrderStatus> = new Map();
  private readonly priceHistory: Map<string, number> = new Map([
    ["AAPL", 150],
    ["MSFT", 320],
    ["GOOGL", 100],
  ]);

  async connect(): Promise<void> {
    this.connected = true;
    // Initialize portfolio
    this.portfolio.set("AAPL", {
      symbol: "AAPL",
      quantity: 10,
      averagePrice: 145,
      currentPrice: 150,
      unrealizedPL: 50,
    });
    console.log("✅ Connected to Mock Broker");
  }

  disconnect(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async placeTrade(
    symbol: string,
    quantity: number,
    price: number,
    action: "BUY" | "SELL"
  ): Promise<string> {
    if (!this.connected) throw new Error("Not connected");
    const orderId = `MOCK_${Date.now()}`;
    this.orders.set(orderId, {
      orderId,
      symbol,
      quantity,
      price,
      action,
      status: "EXECUTED",
      filledQuantity: quantity,
      executedPrice: price,
      timestamp: new Date().toISOString(),
    });
    console.log(`✅ [MOCK] ${action} ${quantity} ${symbol} @ ₹${price}`);
    return orderId;
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    return this.priceHistory.get(symbol) || 100;
  }

  async getPortfolio(): Promise<PortfolioPosition[]> {
    return Array.from(this.portfolio.values());
  }

  async cancelOrder(orderId: string): Promise<void> {
    this.orders.delete(orderId);
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    return this.orders.get(orderId) || ({} as OrderStatus);
  }
}
