import { useId } from 'react';
import { levelsLabel } from '../../domain/sessionLabels';
import type { Level } from '../../domain/types';

interface Props {
  levelsDue: readonly Level[];
  skipNewCards: boolean;
  onChangeSkip: (skip: boolean) => void;
}

/** Explains a catch-up day and lets the user skip today's new cards. Controlled. */
export function CatchUpNotice({ levelsDue, skipNewCards, onChangeSkip }: Props) {
  const id = useId();
  return (
    <section className="notice" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>You missed a day</h3>
      <p className="muted small">Today you will review {levelsLabel(levelsDue).toLowerCase()} to catch up.</p>
      <label className="switch-row">
        <input type="checkbox" checked={skipNewCards} onChange={(e) => onChangeSkip(e.target.checked)} />
        <span>Skip today's new cards</span>
      </label>
    </section>
  );
}
