/**
 * Express Server Setup
 * Approval Gateway HTTP endpoints
 */
import express, { Express } from 'express';
import { TradeDatabase } from '@trading-bot/shared';
import { WebhookHandler } from './webhook-handler';

export function createServer(db: TradeDatabase): Express {
  const app = express();
  const webhookHandler = new WebhookHandler(db);

  // Middleware
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'approval-gateway' });
  });

  // Approval webhook endpoint (REST API)
  app.post('/webhooks/trade-approval', (req, res) => {
    webhookHandler.handleApprovalWebhook(req, res).catch(console.error);
  });

  // Telegram callback webhook (for button clicks)
  app.post('/webhooks/telegram', (req, res) => {
    webhookHandler.handleTelegramCallback(req, res).catch(console.error);
  });

  // Get pending trades
  app.get('/trades/pending', (req, res) => {
    webhookHandler.getPendingTrades(req, res).catch(console.error);
  });

  // Get all trades
  app.get('/trades', (req, res) => {
    webhookHandler.getAllTrades(req, res).catch(console.error);
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path,
    });
  });

  return app;
}
