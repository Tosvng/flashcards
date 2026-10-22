import type { Request, RequestHandler } from 'express';
import { UnauthorizedError } from '../../domain/errors.js';
import type { TokenService } from '../../ports/TokenService.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

/** Verifies `Authorization: Bearer <token>` and sets req.userId. */
export function authenticate(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const header = req.header('authorization') ?? '';
    const match = /^Bearer (.+)$/.exec(header);
    if (!match) throw new UnauthorizedError('Missing bearer token');
    req.userId = tokens.verify(match[1]!);
    next();
  };
}

/** The authenticated user's id; controllers use this and never read a user id from the request body. */
export function userIdOf(req: Request): number {
  if (req.userId === undefined) throw new UnauthorizedError();
  return req.userId;
}
