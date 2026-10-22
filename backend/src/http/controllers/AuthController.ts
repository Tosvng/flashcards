import type { Request, Response } from 'express';
import type { AuthService } from '../../services/AuthService.js';

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const { email, password, timeZone } = req.body as { email: string; password: string; timeZone?: string };
    res.status(201).json(await this.auth.register(email, password, timeZone));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email: string; password: string };
    res.json(await this.auth.login(email, password));
  };
}
