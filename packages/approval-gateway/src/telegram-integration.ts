/**
 * Telegram Integration for Approval Gateway
 * Sends notifications when trades are proposed, approved, and rejected
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
 * Notify that a trade has been proposed and needs approval
 */
export async function notifyTradeProposal(
  tradeId: string,
  symbol: string,
  action: "BUY" | "SELL",
  quantity: number,
  price: number,
  reason: string,
  _confidence?: number
): Promise<void> {
  if (!telegramNotifier) return;

  await telegramNotifier.notifyApprovalRequest(
    tradeId,
    symbol,
    action,
    quantity,
    price,
    reason
  );
}

/**
 * Notify that a trade has been approved
 */
export async function notifyTradeApproved(
  symbol: string,
  action: "BUY" | "SELL",
  quantity: number,
  price: number,
  reason: string
): Promise<void> {
  if (!telegramNotifier) return;

  const notification: TradeNotification = {
    type: "TRADE_APPROVED",
    symbol,
    action,
    quantity,
    price,
    reason,
    timestamp: new Date().toISOString(),
  };

  await telegramNotifier.notifyTrade(notification);
}

/**
 * Notify that a trade has been rejected
 */
export async function notifyTradeRejected(
  symbol: string,
  action: "BUY" | "SELL",
  quantity: number,
  price: number,
  reason: string
): Promise<void> {
  if (!telegramNotifier) return;

  const notification: TradeNotification = {
    type: "TRADE_REJECTED",
    symbol,
    action,
    quantity,
    price,
    reason,
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
 * Send status ping
 */
export async function sendStatusPing(): Promise<void> {
  if (!telegramNotifier) return;
  await telegramNotifier.sendStatusPing();
}

/**
 * Test Telegram connection
 */
export async function testTelegramConnection(): Promise<boolean> {
  if (!telegramNotifier) return false;
  return await telegramNotifier.testConnection();
}
