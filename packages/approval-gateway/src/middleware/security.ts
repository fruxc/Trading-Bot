/**
 * Security Headers Middleware
 * Adds standard web security headers to all responses
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Add security headers to all responses
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Prevent browser from inferring content type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS protection in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy - only allow same-origin resources
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'");

  // CORS - allow all origins for API (can be restricted based on env)
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin as string;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-API-Key, Authorization'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // HSTS - only on HTTPS (production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  next();
}

/**
 * Handle CORS preflight requests
 */
export function corsPreflightHandler(
  req: Request,
  res: Response
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-API-Key, Authorization'
    );
    return res.sendStatus(200);
  }
}
