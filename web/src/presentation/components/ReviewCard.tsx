import { useState } from 'react';
import type { DeckCard } from '../../domain/types';

/** The prompt: image + description. The French word is never part of the card until the reveal. */
export function ReviewCard({ card }: { card: Pick<DeckCard, 'photoUrl' | 'description'> }) {
  const [broken, setBroken] = useState(false);
  return (
    <figure className="card">
      <div className="card-media">
        {broken ? (
          <div className="image-missing" role="img" aria-label="Picture could not be loaded">Picture unavailable</div>
        ) : (
          <img src={card.photoUrl} alt="Picture of the word to spell" onError={() => setBroken(true)} />
        )}
      </div>
      <figcaption>{card.description}</figcaption>
    </figure>
  );
}
