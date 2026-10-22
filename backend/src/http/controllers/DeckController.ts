import type { Request, Response } from 'express';
import type { DeckService } from '../../services/DeckService.js';
import { userIdOf } from '../middleware/authenticate.js';

export class DeckController {
  constructor(private readonly deck: DeckService) {}

  daily = (req: Request, res: Response): void => {
    res.json(this.deck.currentDeck(userIdOf(req)));
  };
}
