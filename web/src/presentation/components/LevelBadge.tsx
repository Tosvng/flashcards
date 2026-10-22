import type { Level } from '../../domain/types';

export function LevelBadge({ level }: { level: Level }) {
  return <span className="badge" aria-label={`Level ${level} of 7`}>Level {level}</span>;
}
