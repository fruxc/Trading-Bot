/**
 * Telegram Integration for Execution Service
 * Sends execution status, portfolio updates, and status pings
 */

import {
  TelegramNotifier,
  createTelegramNotifier,
  TradeNotification,
  PortfolioSummary,
} from "@trading-bot/shared";

let telegramNotifier: TelegramNotifier | null = null;

/**
 * Initialize Telegram notifier
 */
export function initTelegramNotifier(): TelegramNotifier {
  if (!telegramNotifier) {
    telegramNotifier = createTelegramNotifier();
  }
  return telegramNotifier;
}

/**
 * Notify trade execution
 */
export async function notifyTradeExecuted(
  symbol: string,
  action: "BUY" | "SELL",
  quantity: number,
  _price: number,
  executedPrice: number,
  reason: string
): Promise<void> {
  if (!telegramNotifier) return;

  const notification: TradeNotification = {
    type: "TRADE_EXECUTED",
    symbol,
    action,
    quantity,
    price: executedPrice,
    reason: `${reason} (Executed @ ₹${executedPrice.toFixed(2)})`,
    timestamp: new Date().toISOString(),
  };

  await telegramNotifier.notifyTrade(notification);
}

/**
 * Notify trade failed
 */
export async function notifyTradeFailed(
  symbol: string,
  action: "BUY" | "SELL",
  quantity: number,
  price: number,
  error: string
): Promise<void> {
  if (!telegramNotifier) return;

  const notification: TradeNotification = {
    type: "TRADE_FAILED",
    symbol,
    action,
    quantity,
    price,
    reason: `Failed: ${error}`,
    timestamp: new Date().toISOString(),
  };

  await telegramNotifier.notifyTrade(notification);
}

/**
 * Send portfolio summary
 */
export async function sendPortfolioSummary(portfolio: PortfolioSummary): Promise<void> {
  if (!telegramNotifier) return;
  await telegramNotifier.notifyPortfolioSummary(portfolio);
}

/**
 * Send error alert
 */
export async function sendErrorAlert(error: Error, context: string): Promise<void> {
  if (!telegramNotifier) return;
  await telegramNotifier.notifyError(error, context);
}

/**
 * Send status ping (heartbeat)
 */
export async function sendStatusPing(): Promise<void> {
  if (!telegramNotifier) return;
  await telegramNotifier.sendStatusPing();
}

/**
 * Start periodic status pings (every 6 hours)
 */
export function startStatusPings(): NodeJS.Timeout {
  const interval = setInterval(async () => {
    try {
      await sendStatusPing();
    } catch (error) {
      console.error("Error sending status ping:", error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  // Send first ping immediately
  sendStatusPing().catch(console.error);

  return interval;
}

/**
 * Start periodic portfolio summaries (daily at 3:35 PM)
 */
export function startPortfolioUpdates(
  portfolioProvider: () => Promise<PortfolioSummary>
): NodeJS.Timeout {
  const checkTime = () => {
    const now = new Date();
    const targetHour = 15; // 3 PM
    const targetMinute = 35; // 35 minutes

    if (now.getHours() === targetHour && now.getMinutes() === targetMinute) {
      portfolioProvider()
        .then((portfolio) => sendPortfolioSummary(portfolio))
        .catch((error) => console.error("Error sending portfolio summary:", error));
    }
  };

  // Check every minute
  const interval = setInterval(checkTime, 60000);

  return interval;
}

/**
 * Test Telegram connection
 */
export async function testTelegramConnection(): Promise<boolean> {
  const notifier = initTelegramNotifier();
  return await notifier.testConnection();
}
