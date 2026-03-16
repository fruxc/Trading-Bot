/**
 * Shared types across all services
 */

export interface Trade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  proposedAt: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';
  proposalReason: string;
  approvalReason?: string;
  rejectionReason?: string;
  executedAt?: Date;
  executionPrice?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  change24h: number; // percentage
}

export interface WebhookPayload {
  tradeId: string;
  action: 'APPROVE' | 'REJECT';
  reason?: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}
