/**
 * SQLite Database Schema
 * Handles trade logging and status tracking
 */
import sqlite3 from 'sqlite3';
import * as node_path from 'node:path';

export class TradeDatabase {
  private readonly db: sqlite3.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || node_path.join(process.cwd(), 'trades.db');
    this.db = new sqlite3.Database(finalPath);
    this.db.configure('busyTimeout', 5000);
    this.initialize();
  }

  private initialize(): void {
    // Create trades table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL')),
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        proposed_at DATETIME NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED')),
        proposal_reason TEXT,
        approval_reason TEXT,
        rejection_reason TEXT,
        executed_at DATETIME,
        execution_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_proposed_at ON trades(proposed_at);

      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'trader' CHECK(role IN ('trader', 'approver', 'admin')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        active BOOLEAN DEFAULT TRUE
      );

      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        trade_id TEXT,
        user_id TEXT,
        old_state TEXT,
        new_state TEXT,
        reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'SUCCESS',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trade_id) REFERENCES trades(id)
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_trade_id ON audit_logs(trade_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `, (err) => {
      if (err) {
        console.error('Error initializing database:', err);
      }
    });
  }

  insertTrade(trade: {
    id: string;
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    proposedAt: Date;
    proposalReason: string;
  }): void {
    const query = `
      INSERT INTO trades (id, symbol, action, quantity, price, proposed_at, status, proposal_reason)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `;

    this.db.run(
      query,
      [
        trade.id,
        trade.symbol,
        trade.action,
        trade.quantity,
        trade.price,
        trade.proposedAt.toISOString(),
        trade.proposalReason,
      ],
      (err) => {
        if (err) {
          console.error('Error inserting trade:', err);
        }
      }
    );
  }

  updateTradeStatus(
    tradeId: string,
    status: 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED',
    reason?: string,
    executionPrice?: number
  ): void {
    let query: string;
    let params: unknown[];

    if (status === 'EXECUTED' && executionPrice) {
      query =
        'UPDATE trades SET status = ?, execution_price = ?, executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      params = [status, executionPrice, tradeId];
    } else if (reason) {
      const field =
        status === 'APPROVED' ? 'approval_reason' : 'rejection_reason';
      query = `UPDATE trades SET status = ?, ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params = [status, reason, tradeId];
    } else {
      query =
        'UPDATE trades SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      params = [status, tradeId];
    }

    this.db.run(query, params, (err) => {
      if (err) {
        console.error('Error updating trade status:', err);
      }
    });
  }

  getTradeById(
    tradeId: string,
    callback: (err: Error | null, trade: unknown) => void
  ): void {
    const query = 'SELECT * FROM trades WHERE id = ?';
    this.db.get(query, [tradeId], callback);
  }

  getPendingTrades(callback: (err: Error | null, trades: unknown[]) => void): void {
    const query =
      'SELECT * FROM trades WHERE status = ? ORDER BY proposed_at DESC';
    this.db.all(query, ['PENDING'], callback);
  }

  getAllTrades(callback: (err: Error | null, trades: unknown[]) => void): void {
    const query = 'SELECT * FROM trades ORDER BY proposed_at DESC';
    this.db.all(query, callback);
  }

  getApprovedTrades(callback: (err: Error | null, trades: unknown[]) => void): void {
    const query = "SELECT * FROM trades WHERE status = 'APPROVED' AND executed_at IS NULL ORDER BY proposed_at ASC";
    this.db.all(query, callback);
  }

  // API Key Management
  createApiKey(
    key: string,
    name: string,
    role: 'trader' | 'approver' | 'admin' = 'trader',
    callback?: (err: Error | null) => void
  ): void {
    const query =
      'INSERT INTO api_keys (key, name, role) VALUES (?, ?, ?)';
    this.db.run(query, [key, name, role], callback);
  }

  getApiKeyByKey(
    key: string,
    callback: (err: Error | null, apiKey: any) => void
  ): void {
    const query =
      'SELECT * FROM api_keys WHERE key = ? AND active = TRUE';
    this.db.get(query, [key], (err, row) => {
      callback(err, row);
      // Update last_used timestamp
      if (row) {
        this.db.run(
          'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE key = ?',
          [key]
        );
      }
    });
  }

  getApiKeys(
    callback: (err: Error | null, keys: any[]) => void
  ): void {
    const query = 'SELECT id, name, role, created_at, last_used, active FROM api_keys ORDER BY created_at DESC';
    this.db.all(query, callback);
  }

  deactivateApiKey(
    key: string,
    callback?: (err: Error | null) => void
  ): void {
    const query = 'UPDATE api_keys SET active = FALSE WHERE key = ?';
    this.db.run(query, [key], callback);
  }

  // Audit Logging
  logAuditEvent(
    action: string,
    tradeId: string | null,
    userId: string | null,
    oldState: any,
    newState: any,
    reason: string | null,
    ipAddress: string | null,
    userAgent: string | null,
    status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
    errorMessage: string | null = null,
    callback?: (err: Error | null) => void
  ): void {
    const query = `
      INSERT INTO audit_logs 
      (action, trade_id, user_id, old_state, new_state, reason, ip_address, user_agent, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      action,
      tradeId,
      userId,
      oldState ? JSON.stringify(oldState) : null,
      newState ? JSON.stringify(newState) : null,
      reason,
      ipAddress,
      userAgent,
      status,
      errorMessage,
    ];
    this.db.run(query, params, callback);
  }

  getAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters: { tradeId?: string; action?: string; startDate?: string; endDate?: string } = {},
    callback?: (err: Error | null, logs: any[]) => void
  ): void {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (filters.tradeId) {
      query += ' AND trade_id = ?';
      params.push(filters.tradeId);
    }
    if (filters.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }
    if (filters.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    if (callback) {
      this.db.all(query, params, callback);
    }
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
    });
  }
}

