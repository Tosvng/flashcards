import { useState } from 'react';
import type { DeckCard } from '../../domain/types';

/** The prompt: image + description. The French word is never part of the card until the reveal. */
export function ReviewCard({ card, backText }: { card: Pick<DeckCard, 'photoUrl' | 'description'>; backText?: string | null }) {
  const [broken, setBroken] = useState(false);
  const flipped = Boolean(backText);
  return (
    <div className={`card-flip${flipped ? ' flipped' : ''}`}>
    <figure className="card card-front" aria-hidden={flipped || undefined}>
      <div className="card-media">
        {broken ? (
          <div className="image-missing" role="img" aria-label="Picture could not be loaded">Picture unavailable</div>
        ) : (
          <img src={card.photoUrl} alt="Picture of the word to spell" onError={() => setBroken(true)} />
        )}
      </div>
      <figcaption>{card.description}</figcaption>
    </figure>
    {flipped ? (
      <figure className="card card-back" aria-label="Back of the card">
        <figcaption>{backText}</figcaption>
      </figure>
    ) : null}
    </div>
  );
}
