import type { Request, Response } from 'express';
import type { SessionService } from '../../services/SessionService.js';
import { userIdOf } from '../middleware/authenticate.js';

export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  /** Read-only: today's session, or a preview of what starting it will do. */
  today = (req: Request, res: Response): void => {
    res.json(this.sessions.preview(userIdOf(req)));
  };

  start = (req: Request, res: Response): void => {
    const { skipNewCards } = req.body as { skipNewCards: boolean };
    res.json(this.sessions.start(userIdOf(req), skipNewCards));
  };
}
