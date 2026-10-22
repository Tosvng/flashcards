import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import type { LetterMark } from '../../domain/letterSlots';

interface Props {
  slots: readonly string[];
  /** Which box should hold focus (driven by the review reducer). */
  focusIndex: number;
  editable: boolean;
  onChange: (index: number, text: string) => void;
  onBackspace: (index: number) => void;
  onSubmit?: () => void;
  /** After the reveal: how each typed letter compares with the correct spelling. */
  marks?: readonly LetterMark[];
}

/** What the user just typed into a box that may already hold a character. */
export function typedText(previous: string, next: string): string {
  return previous !== '' && next.length > previous.length && next.startsWith(previous) ? next.slice(previous.length) : next;
}

/** One box per letter. Controlled: all state lives in the review reducer. */
export function LetterInput({ slots, focusIndex, editable, onChange, onBackspace, onSubmit, marks }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (editable) refs.current[focusIndex]?.focus();
  }, [focusIndex, editable, slots.length]);

  const moveFocus = (index: number) => refs.current[Math.min(Math.max(index, 0), slots.length - 1)]?.focus();

  const showFixes = marks?.some((m) => m.status !== 'right') ?? false;

  return (
    <div className="letters" role="group" aria-label={marks ? 'Your spelling, checked' : 'Spell the word, one letter per box'}>
      {slots.map((slot, index) => {
        const mark = marks?.[index];
        const position = `Letter ${index + 1} of ${slots.length}`;
        const label = !mark || mark.status === 'right' ? position : `${position}: should be ${mark.expected}`;
        return (
          <span key={index} className="letter-cell">
            <LetterBox
              ref={(node) => {
                refs.current[index] = node;
              }}
              slot={slot}
              label={label}
              status={mark?.status}
              editable={editable}
              onCommit={(text) => onChange(index, text)}
              onBackspaceOnEmpty={() => onBackspace(index)}
              onSubmit={onSubmit}
              onArrow={(delta) => moveFocus(index + delta)}
            />
            {showFixes ? (
              <span className="letter-fix" aria-hidden="true">{mark && mark.status !== 'right' ? mark.expected : ''}</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

interface BoxProps {
  slot: string;
  label: string;
  status?: LetterMark['status'];
  editable: boolean;
  onCommit: (text: string) => void;
  onBackspaceOnEmpty: () => void;
  onSubmit?: () => void;
  onArrow: (delta: -1 | 1) => void;
  ref: (node: HTMLInputElement | null) => void;
}

/**
 * A single letter box. While an input method is composing (dead keys like ´ + e on a Mac keyboard),
 * the box shows the in-progress text locally and only reports the finished character. Reporting the
 * intermediate ´ would advance focus mid-composition and break accents.
 */
function LetterBox({ slot, label, status, editable, onCommit, onBackspaceOnEmpty, onSubmit, onArrow, ref }: BoxProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function keyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Backspace' && slot === '') {
      e.preventDefault();
      onBackspaceOnEmpty();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onArrow(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onArrow(1);
    }
  }

  function paste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    onCommit(e.clipboardData.getData('text'));
  }

  return (
    <input
      ref={ref}
      className={`letter${slot ? ' filled' : ''}${status ? ` ${status === 'right' ? 'right' : 'wrong'}` : ''}`}
      value={draft ?? slot}
      disabled={!editable}
      aria-label={label}
      type="text"
      inputMode="text"
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      data-1p-ignore
      data-lpignore="true"
      enterKeyHint="done"
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={keyDown}
      onPaste={paste}
      onCompositionStart={() => setDraft(slot)}
      onChange={(e) => {
        if ((e.nativeEvent as InputEvent).isComposing) setDraft(e.target.value);
        else onCommit(typedText(slot, e.target.value));
      }}
      onCompositionEnd={(e) => {
        setDraft(null);
        onCommit(typedText(slot, e.currentTarget.value));
      }}
    />
  );
}
