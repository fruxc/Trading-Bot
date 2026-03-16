import https from "node:https";
import type { PortfolioSummary } from "../portfolio/manager";

/**
 * Telegram Bot Integration
 * Sends notifications, status updates, and portfolio summaries
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface TradeNotification {
  type: "TRADE_PROPOSED" | "TRADE_APPROVED" | "TRADE_REJECTED" | "TRADE_EXECUTED" | "TRADE_FAILED";
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  price: number;
  reason: string;
  confidence?: number;
  timestamp: string;
  tradeId?: string;
}

export class TelegramNotifier {
  private readonly config: TelegramConfig;
  private lastStatusPing = Date.now();
  private readonly STATUS_PING_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

  constructor(config: TelegramConfig) {
    this.config = config;
    if (config.enabled && !config.botToken) {
      console.warn("⚠️ Telegram enabled but botToken missing - notifications disabled");
    }
  }

  /**
   * Send trade notification
   */
  async notifyTrade(notification: TradeNotification): Promise<void> {
    if (!this.config.enabled || !this.config.botToken) return;

    const emoji = this.getTradeEmoji(notification.type);
    const message = this.formatTradeMessage(emoji, notification);

    // Use interactive buttons for trade proposals
    if (notification.type === "TRADE_PROPOSED" && notification.tradeId) {
      await this.sendMessageWithButtons(message, notification.tradeId);
    } else {
      await this.sendMessage(message);
    }
  }

  /**
   * Send portfolio summary
   */
  async notifyPortfolioSummary(portfolio: PortfolioSummary): Promise<void> {
    if (!this.config.enabled || !this.config.botToken) return;

    const message = this.formatPortfolioMessage(portfolio);
    await this.sendMessage(message);
  }

  /**
   * Send status ping (heartbeat every 6 hours)
   */
  async sendStatusPing(): Promise<void> {
    if (!this.config.enabled || !this.config.botToken) return;

    const now = Date.now();
    if (now - this.lastStatusPing < this.STATUS_PING_INTERVAL) {
      return; // Not time for next ping yet
    }

    const message = `
✅ *Trading Bot Status*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 System: ACTIVE
📅 Time: ${new Date().toLocaleString()}
📍 Location: ${process.env.NODE_ENV === "production" ? "🚀 Production Server" : "💻 Local Machine"}
🛡️ Risk Profile: ${process.env.RISK_PROFILE || "CONSERVATIVE"}

✅ Status: Monitoring for signals
⏰ Next check: 6 hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    await this.sendMessage(message);
    this.lastStatusPing = now;
  }

  /**
   * Send error alert
   */
  async notifyError(error: Error, context: string): Promise<void> {
    if (!this.config.enabled || !this.config.botToken) return;

    const message = `
❌ *ERROR ALERT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Context: ${context}
🚨 Error: ${error.message}
📅 Time: ${new Date().toISOString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ Action Required: Check logs immediately
    `;

    await this.sendMessage(message);
  }

  /**
   * Send approval request with inline buttons
   */
  async notifyApprovalRequest(
    tradeId: string,
    symbol: string,
    action: string,
    quantity: number,
    price: number,
    reason: string
  ): Promise<void> {
    if (!this.config.enabled || !this.config.botToken) return;

    const message = `🔔 *MANUAL APPROVAL REQUIRED*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${action === "BUY" ? "📈" : "📉"} Action: *${action}*
📊 Symbol: ${symbol}
📦 Quantity: ${quantity}
💰 Price: ₹${price}
📝 Reason: ${reason}

🆔 Trade ID: \`${tradeId}\`

⚠️ AWAITING YOUR APPROVAL`.trim();

    await this.sendMessageWithButtons(message, tradeId);
  }

  /**
   * Send message with inline approval/rejection buttons
   */
  sendMessageWithButtons(text: string, tradeId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.botToken) {
        reject(new Error("Bot token not configured"));
        return;
      }

      if (!this.config.chatId) {
        reject(new Error("Chat ID not configured"));
        return;
      }

      const trimmedText = text.trim();
      console.log(`📝 Sending message (length: ${trimmedText.length}):`, trimmedText.substring(0, 50) + "...");
      
      if (!trimmedText) {
        reject(new Error("Message text is empty after trimming"));
        return;
      }

      const data = JSON.stringify({
        chat_id: this.config.chatId,
        text: trimmedText,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ APPROVE",
                callback_data: `approve_${tradeId}`,
              },
              {
                text: "❌ REJECT",
                callback_data: `reject_${tradeId}`,
              },
            ],
          ],
        },
      });

      const options = {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${this.config.botToken}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
      };

      const req = https.request(options, (res) => {
        let responseBody = "";

        res.on("data", (chunk) => {
          responseBody += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(responseBody);
            if (response.ok) {
              resolve();
            } else {
              reject(new Error(`Telegram API error: ${response.description}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Format trade message
   */
  private formatTradeMessage(emoji: string, notification: TradeNotification): string {
    const typeLabel = {
      TRADE_PROPOSED: "Trade Proposed",
      TRADE_APPROVED: "Trade Approved ✅",
      TRADE_REJECTED: "Trade Rejected ❌",
      TRADE_EXECUTED: "Trade Executed 🎯",
      TRADE_FAILED: "Trade Failed ⚠️",
    }[notification.type];

    return `
${emoji} *${typeLabel}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${notification.action === "BUY" ? "📈" : "📉"} Action: ${notification.action}
📊 Symbol: ${notification.symbol}
📦 Quantity: ${notification.quantity}
💰 Price: ₹${notification.price}
📝 Reason: ${notification.reason}
${notification.confidence ? `🎯 Confidence: ${(notification.confidence * 100).toFixed(0)}%` : ""}
📅 Time: ${notification.timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  }

  /**
   * Format portfolio summary message
   */
  private formatPortfolioMessage(portfolio: PortfolioSummary): string {
    const changeColor = portfolio.dayChange >= 0 ? "📈" : "📉";
    const changeSign = portfolio.dayChange >= 0 ? "+" : "";

    let positionsText = "💼 *Holdings:*\n";
    portfolio.positions.forEach((pos) => {
      const plSign = pos.unrealizedPL >= 0 ? "+" : "";
      positionsText += `  ${pos.symbol}: ${pos.quantity} @ ₹${pos.averagePrice.toFixed(2)} | P&L: ${plSign}₹${pos.unrealizedPL.toFixed(2)}\n`;
    });

    return `
📊 *PORTFOLIO SUMMARY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 Total Value: ₹${portfolio.totalValue.toFixed(2)}
💰 Cash: ₹${portfolio.cash.toFixed(2)}
📈 Invested: ₹${portfolio.invested.toFixed(2)}

${changeColor} Today: ${changeSign}₹${portfolio.dayChange.toFixed(2)} (${changeSign}${portfolio.dayChangePercent.toFixed(2)}%)
📊 This Week: ${portfolio.weekChange >= 0 ? "+" : ""}₹${portfolio.weekChange.toFixed(2)}
📈 This Month: ${portfolio.monthChange >= 0 ? "+" : ""}₹${portfolio.monthChange.toFixed(2)}

${positionsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  }

  /**
   * Get emoji for notification type
   */
  private getTradeEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      TRADE_PROPOSED: "🔔",
      TRADE_APPROVED: "✅",
      TRADE_REJECTED: "❌",
      TRADE_EXECUTED: "🎯",
      TRADE_FAILED: "⚠️",
    };
    return emojiMap[type] || "💬";
  }

  /**
   * Send message to Telegram
   */
  private sendMessage(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.botToken) {
        reject(new Error("Bot token not configured"));
        return;
      }

      const trimmedText = text.trim();
      const data = JSON.stringify({
        chat_id: this.config.chatId,
        text: trimmedText,
        parse_mode: "Markdown",
      });

      const options = {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${this.config.botToken}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
      };

      const req = https.request(options, (res) => {
        let responseBody = "";

        res.on("data", (chunk) => {
          responseBody += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(responseBody);
            if (response.ok) {
              resolve();
            } else {
              reject(new Error(`Telegram API error: ${response.description}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Test Telegram connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.config.botToken) {
      console.log("⚠️ Telegram bot token not configured");
      return false;
    }

    // Check if token looks valid (should contain a colon)
    if (!this.config.botToken.includes(':')) {
      console.warn("⚠️  Telegram bot token appears invalid (missing colon). Get a real token from @BotFather on Telegram.");
      return false;
    }

    try {
      const testMessage = "✅ Trading Bot Telegram integration test - System is working!";
      await this.sendMessage(testMessage);
      console.log("✅ Telegram connection successful");
      return true;
    } catch (error) {
      console.error("❌ Telegram connection failed:", error);
      console.log("💡 Make sure:");
      console.log("   1. Bot token is real (from @BotFather)");
      console.log("   2. Chat ID is numeric (from @userinfobot)");
      console.log("   3. You've started a conversation with the bot");
      return false;
    }
  }
}

/**
 * Create Telegram notifier from environment
 */
export function createTelegramNotifier(): TelegramNotifier {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  const enabled = process.env.TELEGRAM_ENABLED !== "false" && !!botToken;

  return new TelegramNotifier({
    botToken,
    chatId,
    enabled,
  });
}
