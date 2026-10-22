import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../../domain/errors.js';

const STATUS: Record<string, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(STATUS[err.code] ?? 400).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Malformed JSON from express.json()
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'Malformed JSON body' } });
    return;
  }
  if ((err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'VALIDATION', message: 'Request body too large' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
};
