/**
 * Input Validation Middleware
 * Validates all request inputs to prevent injection and type errors
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Validate trade approval webhook input
 */
export function validateTradeApproval(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { tradeId, action } = req.body;

  // Validate tradeId format (UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!tradeId || !uuidRegex.test(tradeId)) {
    return res.status(400).json({
      error: 'Invalid tradeId',
      message: 'tradeId must be a valid UUID format',
    });
  }

  // Validate action
  if (!action || !['APPROVE', 'REJECT'].includes(action.toUpperCase())) {
    return res.status(400).json({
      error: 'Invalid action',
      message: 'action must be either "APPROVE" or "REJECT"',
    });
  }

  // Normalize and attach validated data
  req.body.tradeId = tradeId.toLowerCase();
  req.body.action = action.toUpperCase();

  return next();
}

/**
 * Validate symbol format
 */
export function validateSymbol(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { symbol } = req.body;

  if (symbol && !/^[A-Z]{1,5}$/.test(symbol)) {
    return res.status(400).json({
      error: 'Invalid symbol',
      message: 'symbol must be 1-5 uppercase letters (e.g., AAPL, BTC)',
    });
  }

  return next();
}

/**
 * Validate quantity
 */
export function validateQuantity(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { quantity } = req.body;

  if (quantity !== undefined && quantity !== null) {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 10000) {
      return res.status(400).json({
        error: 'Invalid quantity',
        message: 'quantity must be a positive number between 0 and 10000',
      });
    }
  }

  return next();
}

/**
 * Validate price
 */
export function validatePrice(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { price } = req.body;

  if (price !== undefined && price !== null) {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0 || p > 999999) {
      return res.status(400).json({
        error: 'Invalid price',
        message: 'price must be a positive number between 0 and 999999',
      });
    }
  }

  return next();
}

/**
 * Validate pagination parameters (limit, offset)
 */
export function validatePagination(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { limit = 100, offset = 0 } = req.query;

  const l = Number(limit);
  const o = Number(offset);

  if (!Number.isInteger(l) || l < 1 || l > 10000) {
    return res.status(400).json({
      error: 'Invalid limit',
      message: 'limit must be an integer between 1 and 10000',
    });
  }

  if (!Number.isInteger(o) || o < 0) {
    return res.status(400).json({
      error: 'Invalid offset',
      message: 'offset must be a non-negative integer',
    });
  }

  // Attach validated values
  req.query.limit = String(l);
  req.query.offset = String(o);

  return next();
}

/**
 * Validate date range for audit logs
 */
export function validateDateRange(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { start_date, end_date } = req.query;

  if (start_date) {
    const d = new Date(start_date as string);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({
        error: 'Invalid start_date',
        message: 'start_date must be a valid ISO 8601 date',
      });
    }
  }

  if (end_date) {
    const d = new Date(end_date as string);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({
        error: 'Invalid end_date',
        message: 'end_date must be a valid ISO 8601 date',
      });
    }
  }

  return next();
}

/**
 * Sanitize request body to prevent XSS
 */
export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        // Remove potentially dangerous characters
        req.body[key] = req.body[key]
          .replace(/[<>"']/g, '') // Remove HTML special chars
          .trim();
      }
    });
  }

  return next();
}
