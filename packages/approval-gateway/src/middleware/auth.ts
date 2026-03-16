/**
 * API Key Authentication Middleware
 * Validates X-API-Key header and authorizes based on role
 */

import { Request, Response, NextFunction } from 'express';
import { TradeDatabase } from '@trading-bot/shared';

export interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: number;
    key: string;
    name: string;
    role: 'trader' | 'approver' | 'admin';
    created_at: string;
    last_used: string | null;
  };
  userId?: string;
  ipAddress: string;
}

/**
 * Middleware to validate API key from X-API-Key header
 */
export function createAuthMiddleware(db: TradeDatabase) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const apiKeyRequired = process.env.API_KEY_REQUIRED !== 'false';
    const apiKeyHeader = req.headers['x-api-key'] as string;

    // Get client IP address
    req.ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.socket?.remoteAddress as string) ||
      'unknown';

    // If API keys are not required (development), allow all requests
    if (!apiKeyRequired) {
      req.apiKey = {
        id: 0,
        key: 'dev-key',
        name: 'Development',
        role: 'admin',
        created_at: new Date().toISOString(),
        last_used: null,
      };
      req.userId = 'dev-mode';
      return next();
    }

    // API key required: validate it
    if (!apiKeyHeader) {
      return res.status(401).json({
        error: 'Missing API key',
        message: 'Please provide X-API-Key header',
      });
    }

    // Validate API key against database
    (db as any).getApiKeyByKey(apiKeyHeader, (err: Error | null, apiKey: any) => {
      if (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ error: 'Authentication error' });
      }

      if (!apiKey) {
        // Log failed auth attempt
        (db as any).logAuditEvent(
          'AUTH_FAILED',
          null,
          null,
          null,
          null,
          'Invalid or inactive API key',
          req.ipAddress,
          req.headers['user-agent'] as string,
          'FAILED',
          'API key not found or inactive'
        );

        return res.status(401).json({
          error: 'Invalid API key',
          message: 'The provided API key is invalid or inactive',
        });
      }

      // Store API key info in request
      req.apiKey = apiKey;
      req.userId = `api-key-${apiKey.id}`;

      next();
    });
  };
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...allowedRoles: Array<'trader' | 'approver' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.apiKey.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This endpoint requires one of these roles: ${allowedRoles.join(', ')}`,
        yourRole: req.apiKey.role,
      });
    }

    next();
  };
}

/**
 * Middleware to log authentication events
 */
export function createAuthLoggingMiddleware(db: TradeDatabase) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Capture original response.json to log successful requests
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.apiKey) {
        // Log successful request
        (db as any).logAuditEvent(
          'API_REQUEST',
          null,
          req.userId || null,
          null,
          { method: req.method, path: req.path },
          null,
          req.ipAddress,
          req.headers['user-agent'] as string,
          'SUCCESS'
        );
      }
      return originalJson(data);
    };

    next();
  };
}
