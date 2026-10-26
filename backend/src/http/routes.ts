import { Router } from 'express';
import type { TokenService } from '../ports/TokenService.js';
import type { AuthController } from './controllers/AuthController.js';
import type { DeckController } from './controllers/DeckController.js';
import type { FlashcardController } from './controllers/FlashcardController.js';
import type { ReviewController } from './controllers/ReviewController.js';
import type { SessionController } from './controllers/SessionController.js';
import { authenticate } from './middleware/authenticate.js';
import { validate } from './middleware/validate.js';
import { createFlashcardBody, idParams, loginBody, registerBody, revealBody, reviewBody, startSessionBody } from './schemas.js';

export interface Controllers {
  auth: AuthController;
  session: SessionController;
  deck: DeckController;
  review: ReviewController;
  flashcard: FlashcardController;
}

export function buildRouter(c: Controllers, tokens: TokenService): Router {
  const router = Router();

  // Public
  router.post('/auth/register', validate({ body: registerBody }), c.auth.register);
  router.post('/auth/login', validate({ body: loginBody }), c.auth.login);

  // Everything below requires a valid token.
  router.use(authenticate(tokens));
  router.get('/session/today', c.session.today);
  router.post('/session/start', validate({ body: startSessionBody }), c.session.start);
  router.get('/decks/daily', c.deck.daily);
  router.post('/review/reveal', validate({ body: revealBody }), c.review.reveal);
  router.post('/review', validate({ body: reviewBody }), c.review.submit);
  router.get('/flashcards', c.flashcard.list);
  router.get('/flashcards/:id', validate({ params: idParams }), c.flashcard.get);
  router.put('/flashcards/:id', validate({ params: idParams, body: createFlashcardBody }), c.flashcard.update);
  router.delete('/flashcards/:id', validate({ params: idParams }), c.flashcard.remove);
  router.post('/flashcards', validate({ body: createFlashcardBody }), c.flashcard.create);

  return router;
}
