/**
 * Webhook Handler
 * Processes approval/rejection requests and updates database
 */
import { Request, Response } from 'express';
import { TradeDatabase, WebhookPayload, AppError } from '@trading-bot/shared';
import {
  notifyTradeApproved,
  notifyTradeRejected,
  initTelegramNotifier,
} from './telegram-integration';

export class WebhookHandler {
  private readonly telegramReady: boolean;

  constructor(private readonly db: TradeDatabase) {
    // Initialize Telegram if configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        initTelegramNotifier();
        this.telegramReady = true;
      } catch (error) {
        console.warn('Telegram not configured:', error);
        this.telegramReady = false;
      }
    } else {
      this.telegramReady = false;
    }
  }

  /**
   * Handles approval/rejection webhook requests
   */
  async handleApprovalWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const payload = req.body as WebhookPayload;

      // Validate payload
      if (!payload.tradeId || !payload.action) {
        throw new AppError(
          'Missing required fields: tradeId, action',
          400,
          'INVALID_PAYLOAD'
        );
      }

      if (!['APPROVE', 'REJECT'].includes(payload.action)) {
        throw new AppError(
          'Invalid action. Must be APPROVE or REJECT',
          400,
          'INVALID_ACTION'
        );
      }

      // Get trade from database
      this.db.getTradeById(payload.tradeId, async (err, trade) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({
            success: false,
            error: 'Database error',
            code: 'DB_ERROR',
          });
          return;
        }

        if (!trade) {
          throw new AppError(
            `Trade not found: ${payload.tradeId}`,
            404,
            'NOT_FOUND'
          );
        }

        if ((trade as { status: string }).status !== 'PENDING') {
          throw new AppError(
            `Trade already processed with status: ${(trade as { status: string }).status}`,
            409,
            'ALREADY_PROCESSED'
          );
        }

        // Update trade status
        const status = payload.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        this.db.updateTradeStatus(
          payload.tradeId,
          status,
          payload.reason
        );

        const reasonText = payload.reason ? ` - Reason: ${payload.reason}` : '';
        console.log(
          `✅ Trade ${payload.tradeId} marked as ${status}${reasonText}`
        );

        // Send Telegram notification
        if (this.telegramReady) {
          try {
            const t = trade as any;
            if (payload.action === 'APPROVE') {
              await notifyTradeApproved(
                t.symbol,
                t.action,
                t.quantity,
                t.price,
                t.proposalReason || 'Trade approved'
              );
            } else {
              await notifyTradeRejected(
                t.symbol,
                t.action,
                t.quantity,
                t.price,
                payload.reason || 'No reason provided'
              );
            }
          } catch (error) {
            console.error('Error sending Telegram notification:', error);
            // Don't fail the request if Telegram fails
          }
        }

        res.json({
          success: true,
          message: `Trade ${status}`,
          tradeId: payload.tradeId,
          status,
        });
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        console.error('Unexpected error in webhook handler:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  }

  /**
   * Retrieves pending trades for display
   */
  async getPendingTrades(req: Request, res: Response): Promise<void> {
    try {
      this.db.getPendingTrades((err, trades) => {
        if (err) {
          console.error('Error fetching pending trades:', err);
          res.status(500).json({
            success: false,
            error: 'Failed to fetch pending trades',
          });
          return;
        }

        res.json({
          success: true,
          count: (trades || []).length,
          trades: trades || [],
        });
      });
    } catch (error) {
      console.error('Error fetching pending trades:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending trades',
      });
    }
  }

  /**
   * Retrieves all trades (for audit log)
   */
  async getAllTrades(req: Request, res: Response): Promise<void> {
    try {
      this.db.getAllTrades((err, trades) => {
        if (err) {
          console.error('Error fetching all trades:', err);
          res.status(500).json({
            success: false,
            error: 'Failed to fetch trades',
          });
          return;
        }

        res.json({
          success: true,
          count: (trades || []).length,
          trades: trades || [],
        });
      });
    } catch (error) {
      console.error('Error fetching all trades:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trades',
      });
    }
  }

  /**
   * Handle Telegram button callbacks
   */
  async handleTelegramCallback(req: Request, res: Response): Promise<void> {
    try {
      const update = req.body;

      // Parse callback query
      if (!update.callback_query) {
        res.json({ ok: true }); // Acknowledge to Telegram
        return;
      }

      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data; // Format: "approve_<tradeId>" or "reject_<tradeId>"

      // Extract action and tradeId
      const match = callbackData.match(/^(approve|reject)_(.+)$/);
      if (!match) {
        res.json({ ok: true });
        return;
      }

      const [, action, tradeId] = match;
      const approvalAction = action === 'approve' ? 'APPROVE' : 'REJECT';

      console.log(`📱 Telegram button clicked: ${approvalAction} for trade ${tradeId}`);

      // Get trade from database
      this.db.getTradeById(tradeId, async (err, trade) => {
        if (err || !trade) {
          console.error('Trade not found:', tradeId);
          res.json({ ok: true });
          return;
        }

        if ((trade as any).status !== 'PENDING') {
          console.warn(`Trade ${tradeId} already processed`);
          res.json({ ok: true });
          return;
        }

        // Update trade status
        const status = approvalAction === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        this.db.updateTradeStatus(tradeId, status, `Approved via Telegram`);

        console.log(`✅ Trade ${tradeId} marked as ${status}`);

        // Send Telegram notification
        if (this.telegramReady) {
          try {
            const t = trade as any;
            if (approvalAction === 'APPROVE') {
              await notifyTradeApproved(
                t.symbol,
                t.action,
                t.quantity,
                t.price,
                t.proposalReason || 'Trade approved'
              );
            } else {
              await notifyTradeRejected(
                t.symbol,
                t.action,
                t.quantity,
                t.price,
                'Rejected via Telegram'
              );
            }
          } catch (error) {
            console.error('Error sending Telegram notification:', error);
          }
        }

        // Acknowledge callback query to Telegram (removes loading state)
        res.json({ ok: true });
      });
    } catch (error) {
      console.error('Error handling Telegram callback:', error);
      res.json({ ok: true });
    }
  }
}
