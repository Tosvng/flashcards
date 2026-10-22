import express, { type Express } from 'express';
import type { TokenService } from './ports/TokenService.js';
import { errorHandler, notFoundHandler } from './http/middleware/errorHandler.js';
import { webApp } from './http/middleware/webApp.js';
import { buildRouter, type Controllers } from './http/routes.js';

export interface AppOptions {
  /** Serve the built PWA from this directory, same-origin with the API. */
  webDir?: string | null;
}

export function createApp(controllers: Controllers, tokens: TokenService, options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  // Per-user data: browsers and proxies must never reuse an API response (stale data, or another user's).
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (_req, res) => void res.json({ status: 'ok' }));
  app.use('/api', buildRouter(controllers, tokens));
  if (options.webDir) app.use(webApp(options.webDir));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
