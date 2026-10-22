import type { Level, ReviewResult, SessionSummary } from './types';

export function levelsLabel(levels: readonly Level[]): string {
  if (levels.length === 0) return 'No levels due';
  return `${levels.length === 1 ? 'Level' : 'Levels'} ${levels.join(' · ')}`;
}

export function sessionHeadline(summary: SessionSummary): string {
  if (summary.status === 'complete') return 'All done for today';
  if (summary.isCatchUp) return 'Catch-up day';
  return `Day ${summary.cycleDay}`;
}

export function resultMessage(result: ReviewResult): string {
  if (result.passed) {
    return result.newLevel === 8 ? 'Completed! You have mastered this word.' : `Moved up to level ${result.newLevel}`;
  }
  if (!result.spellingCorrect) return 'Not quite. Back to level 1; you will see it again today.';
  return 'Pronunciation needs work. Back to level 1; you will see it again today.';
}
