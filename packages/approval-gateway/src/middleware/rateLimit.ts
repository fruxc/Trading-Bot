/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP/API key
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Create rate limiting middleware
 * @param maxRequests Maximum requests allowed
 * @param windowMs Time window in milliseconds
 */
export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute default
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get identifier (IP or API key if available)
    const apiKey = (req.headers['x-api-key'] as string) || '';
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.socket?.remoteAddress as string) ||
      'unknown';

    const identifier = apiKey ? `key_${apiKey}` : `ip_${ip}`;
    const now = Date.now();

    // Initialize or reset if window expired
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment request count
    store[identifier].count++;

    // Set rate limit headers
    const timeRemaining = Math.ceil(
      (store[identifier].resetTime - now) / 1000
    );
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - store[identifier].count));
    res.setHeader('X-RateLimit-Reset', String(store[identifier].resetTime));

    // Check if limit exceeded
    if (store[identifier].count > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${Math.round(windowMs / 1000)} seconds.`,
        retryAfter: timeRemaining,
      });
    }

    next();
  };
}

/**
 * Clean up expired entries periodically
 */
export function cleanupRateLimitStore() {
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }, 60000); // Cleanup every minute
}
