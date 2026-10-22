import type { Request, Response } from 'express';
import type { ReviewInput } from '../../domain/types.js';
import type { RevealInput, ReviewService } from '../../services/ReviewService.js';
import { userIdOf } from '../middleware/authenticate.js';

export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  reveal = (req: Request, res: Response): void => {
    res.json(this.reviews.reveal(userIdOf(req), req.body as RevealInput));
  };

  submit = (req: Request, res: Response): void => {
    res.json(this.reviews.submit(userIdOf(req), req.body as ReviewInput));
  };
}
