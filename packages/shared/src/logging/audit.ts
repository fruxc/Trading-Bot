/**
 * Audit Logging Utilities
 * Centralized logging for all trade events for compliance and debugging
 */

import { TradeDatabase } from "../database/schema";

export interface AuditLogEvent {
  action: string;
  tradeId?: string | null;
  userId?: string | null;
  oldState?: any;
  newState?: any;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: 'SUCCESS' | 'FAILED';
  errorMessage?: string | null;
}

export class AuditLogger {
  constructor(private db: TradeDatabase) {}

  /**
   * Log a trade proposal event
   */
  logTradeProposal(
    tradeId: string,
    trade: any,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    (this.db as any).logAuditEvent(
      'TRADE_PROPOSED',
      tradeId,
      'system',
      null,
      trade,
      reason,
      ipAddress,
      userAgent,
      'SUCCESS'
    );
  }

  /**
   * Log a trade approval event
   */
  logTradeApproved(
    tradeId: string,
    oldState: any,
    newState: any,
    userId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    (this.db as any).logAuditEvent(
      'TRADE_APPROVED',
      tradeId,
      userId,
      oldState,
      newState,
      reason,
      ipAddress,
      userAgent,
      'SUCCESS'
    );
  }

  /**
   * Log a trade rejection event
   */
  logTradeRejected(
    tradeId: string,
    oldState: any,
    newState: any,
    userId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    (this.db as any).logAuditEvent(
      'TRADE_REJECTED',
      tradeId,
      userId,
      oldState,
      newState,
      reason,
      ipAddress,
      userAgent,
      'SUCCESS'
    );
  }

  /**
   * Log a trade execution event
   */
  logTradeExecuted(
    tradeId: string,
    oldState: any,
    newState: any,
    executionPrice: number,
    ipAddress?: string,
    userAgent?: string
  ) {
    (this.db as any).logAuditEvent(
      'TRADE_EXECUTED',
      tradeId,
      'system',
      oldState,
      { ...newState, execution_price: executionPrice },
      `Trade executed at price ${executionPrice}`,
      ipAddress,
      userAgent,
      'SUCCESS'
    );
  }

  /**
   * Log a trade execution failure
   */
  logTradeExecutionFailed(
    tradeId: string,
    oldState: any,
    error: Error,
    ipAddress?: string,
    userAgent?: string
  ) {
    (this.db as any).logAuditEvent(
      'TRADE_EXECUTION_FAILED',
      tradeId,
      'system',
      oldState,
      null,
      null,
      ipAddress,
      userAgent,
      'FAILED',
      error.message
    );
  }

  /**
   * Log Telegram notification event
   */
  logTelegramNotification(
    tradeId: string,
    notificationType: string,
    success: boolean,
    errorMessage?: string
  ) {
    (this.db as any).logAuditEvent(
      `TELEGRAM_${notificationType}`,
      tradeId,
      'system',
      null,
      null,
      null,
      null,
      null,
      success ? 'SUCCESS' : 'FAILED',
      errorMessage || null
    );
  }

  /**
   * Log custom event
   */
  logEvent(event: AuditLogEvent) {
    (this.db as any).logAuditEvent(
      event.action,
      event.tradeId || null,
      event.userId || null,
      event.oldState,
      event.newState,
      event.reason || null,
      event.ipAddress || null,
      event.userAgent || null,
      event.status || 'SUCCESS',
      event.errorMessage || null
    );
  }

  /**
   * Query audit logs
   */
  getAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: { tradeId?: string; action?: string; startDate?: string; endDate?: string },
    callback?: (err: Error | null, logs: any[]) => void
  ) {
    (this.db as any).getAuditLogs(limit, offset, filters, callback);
  }
}

/**
 * Create audit logger instance
 */
export function createAuditLogger(db: TradeDatabase): AuditLogger {
  return new AuditLogger(db);
}
