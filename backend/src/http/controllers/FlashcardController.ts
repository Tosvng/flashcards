import type { Request, Response } from 'express';
import type { NewFlashcard } from '../../domain/types.js';
import type { FlashcardService } from '../../services/FlashcardService.js';
import { userIdOf } from '../middleware/authenticate.js';

export class FlashcardController {
  constructor(private readonly flashcards: FlashcardService) {}

  get = (req: Request, res: Response): void => {
    const { id } = req.params as unknown as { id: number };
    res.json(this.flashcards.get(userIdOf(req), id));
  };

  create = (req: Request, res: Response): void => {
    res.status(201).json(this.flashcards.add(userIdOf(req), req.body as NewFlashcard));
  };
}
