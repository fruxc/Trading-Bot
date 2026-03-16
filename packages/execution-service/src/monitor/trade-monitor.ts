import { TradeDatabase, Trade } from "@trading-bot/shared";
import { IBrokerAdapter } from "../types";
import { RiskController } from "../risk/risk-controller";

/**
 * Trade Monitor - Continuously monitors database for approved trades
 * and executes them via the broker
 */
export class TradeMonitor {
  private monitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs = 10000; // Poll every 10 seconds

  constructor(
    private readonly db: TradeDatabase,
    private readonly broker: IBrokerAdapter,
    private readonly riskController: RiskController
  ) {}

  /**
   * Start monitoring for approved trades
   */
  async start(): Promise<void> {
    if (this.monitoring) {
      console.log("⚠️ Monitor is already running");
      return;
    }

    this.monitoring = true;
    console.log("🚀 Trade Monitor started - polling every 10 seconds");

    // Initial check
    await this.checkAndExecutePendingTrades();

    // Set up interval
    this.monitorInterval = setInterval(async () => {
      try {
        await this.checkAndExecutePendingTrades();
      } catch (error) {
        console.error("❌ Error in trade monitor:", error);
      }
    }, this.pollIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.monitoring = false;
    console.log("⏹️ Trade Monitor stopped");
  }

  /**
   * Check for approved trades and execute them
   */
  private async checkAndExecutePendingTrades(): Promise<void> {
    try {
      // Get all trades with status = APPROVED
      const trades = await this.getAllApprovedTrades();

      if (trades.length === 0) {
        return;
      }

      console.log(`📋 Found ${trades.length} approved trade(s) to execute`);

      for (const trade of trades) {
        await this.executeTrade(trade);
      }
    } catch (error) {
      console.error("Error checking approved trades:", error);
    }
  }

  /**
   * Execute a single trade
   */
  private async executeTrade(trade: Trade): Promise<void> {
    const tradeId = trade.id;
    const { symbol, action, quantity, price } = trade;

    try {
      console.log(`\n⚡ Executing trade: ${tradeId}`);
      console.log(`   Action: ${action} ${quantity} ${symbol} @ ₹${price}`);

      // Check if broker is connected
      if (!this.broker.isConnected()) {
        throw new Error("Broker not connected");
      }

      // Place the order
      const orderId = await this.broker.placeTrade(symbol, quantity, price, action as "BUY" | "SELL");

      // Update database - mark as executing
      await this.updateTradeStatus(tradeId, "EXECUTING", `Order placed - ID: ${orderId}`);

      // Wait briefly for order to settle
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check order status
      const orderStatus = await this.broker.getOrderStatus(orderId);

      if (orderStatus.status === "EXECUTED") {
        console.log(`✅ Trade executed successfully`);
        console.log(`   Filled: ${orderStatus.filledQuantity}/${quantity} shares`);
        console.log(`   Price: ₹${orderStatus.executedPrice}`);

        // Calculate P&L if this is a closing trade
        let pnl = 0;
        if (action === "SELL") {
          // Rough P&L calculation
          pnl = (orderStatus.executedPrice! - price) * quantity;
        }

        // Update database - mark as executed
        await this.updateTradeStatus(
          tradeId,
          "EXECUTED",
          `Order executed at ₹${orderStatus.executedPrice} (${orderStatus.filledQuantity}/${quantity} filled)`,
          orderStatus.executedPrice
        );

        // Record execution for daily metrics
        this.riskController.recordTradeExecution(action as "BUY" | "SELL", pnl);
      } else if (orderStatus.status === "REJECTED") {
        console.log(`❌ Trade rejected by broker`);
        await this.updateTradeStatus(tradeId, "FAILED", "Order rejected by broker");
      } else if (orderStatus.status === "CANCELLED") {
        console.log(`❌ Trade cancelled`);
        await this.updateTradeStatus(tradeId, "FAILED", "Order cancelled");
      } else {
        console.log(`⏳ Trade still pending: ${orderStatus.status}`);
        // Keep it in APPROVED status to retry later
      }
    } catch (error: any) {
      console.error(`❌ Failed to execute trade ${tradeId}:`, error.message);
      await this.updateTradeStatus(tradeId, "FAILED", `Execution error: ${error.message}`);
    }
  }

  /**
   * Get all approved trades from database
   */
  private getAllApprovedTrades(): Promise<Trade[]> {
    return new Promise((resolve, reject) => {
      this.db.db.all(
        "SELECT * FROM trades WHERE status = 'APPROVED' AND executed_at IS NULL ORDER BY proposed_at ASC",
        (err: any, rows: Trade[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Update trade status in database
   */
  private updateTradeStatus(
    tradeId: string,
    status: string,
    reason: string,
    executionPrice?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const query =
        status === "EXECUTED"
          ? `UPDATE trades SET status = ?, executed_at = ?, execution_price = ?, updated_at = ? WHERE id = ?`
          : `UPDATE trades SET status = ?, approval_reason = ?, updated_at = ? WHERE id = ?`;

      const params =
        status === "EXECUTED"
          ? [status, new Date().toISOString(), executionPrice, new Date().toISOString(), tradeId]
          : [status, reason, new Date().toISOString(), tradeId];

      this.db.db.run(query, params, (err: any) => {
        if (err) {
          console.error(`Error updating trade ${tradeId}:`, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get monitor status
   */
  isMonitoring(): boolean {
    return this.monitoring;
  }

  /**
   * Get risk status during monitoring
   */
  getRiskStatus() {
    return this.riskController.getRiskStatus();
  }
}
