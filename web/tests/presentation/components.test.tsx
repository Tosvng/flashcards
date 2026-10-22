import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../src/presentation/components/AppShell';
import { Button } from '../../src/presentation/components/Button';
import { CatchUpNotice } from '../../src/presentation/components/CatchUpNotice';
import { LetterInput, typedText } from '../../src/presentation/components/LetterInput';
import { AnswerReveal, PronunciationPrompt } from '../../src/presentation/components/PronunciationPrompt';
import { ResultBanner } from '../../src/presentation/components/ResultBanner';
import { ReviewCard } from '../../src/presentation/components/ReviewCard';
import { TextField } from '../../src/presentation/components/TextField';

describe('typedText', () => {
  it('returns just the new character when a box already holds one', () => {
    expect(typedText('a', 'ab')).toBe('b');
    expect(typedText('', 'é')).toBe('é');
    expect(typedText('a', 'b')).toBe('b'); // replaced by selection
    expect(typedText('a', '')).toBe('');
    expect(typedText('', 'abc')).toBe('abc'); // paste
  });
});

describe('LetterInput', () => {
  function setup(slots: string[] = ['', '', ''], editable = true) {
    const onChange = vi.fn();
    const onBackspace = vi.fn();
    const onSubmit = vi.fn();
    render(<LetterInput slots={slots} focusIndex={0} editable={editable} onChange={onChange} onBackspace={onBackspace} onSubmit={onSubmit} />);
    return { onChange, onBackspace, onSubmit, user: userEvent.setup() };
  }
  const box = (i: number, n = 3) => screen.getByLabelText(`Letter ${i} of ${n}`);

  it('renders one labelled box per letter, grouped, with the first focused', () => {
    setup(['é', '', '']);
    expect(screen.getByRole('group', { name: /spell the word/i })).toBeInTheDocument();
    expect(box(1)).toHaveValue('é');
    expect(box(3)).toBeInTheDocument();
    expect(box(1)).toHaveFocus();
  });

  it('reports typed text with the box index (accents included)', async () => {
    const { onChange, user } = setup();
    await user.click(box(2));
    await user.keyboard('é');
    expect(onChange).toHaveBeenCalledWith(1, 'é');
  });

  it('only forwards the new character when typing over an existing one', async () => {
    const { onChange, user } = setup(['a', '', '']);
    await user.click(box(1));
    await user.keyboard('{End}b'); // caret after "a"
    expect(onChange).toHaveBeenLastCalledWith(0, 'b');
  });

  it('spreads pasted text through onChange', async () => {
    const { onChange, user } = setup();
    await user.click(box(1));
    await user.paste('été');
    expect(onChange).toHaveBeenCalledWith(0, 'été');
  });

  it('reports backspace only from an empty box', async () => {
    const { onBackspace, user } = setup(['a', '', '']);
    await user.click(box(1));
    await user.keyboard('{Backspace}');
    expect(onBackspace).not.toHaveBeenCalled();
    await user.click(box(2));
    await user.keyboard('{Backspace}');
    expect(onBackspace).toHaveBeenCalledWith(1);
  });

  it('submits on Enter and moves between boxes with the arrow keys', async () => {
    const { onSubmit, user } = setup(['a', 'b', 'c']);
    await user.click(box(2));
    await user.keyboard('{ArrowLeft}');
    expect(box(1)).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(box(3)).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // clamped at the last box
    expect(box(3)).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('waits for a dead-key composition to finish before reporting a letter (accents on Mac keyboards)', () => {
    const { onChange } = setup();
    const first = box(1);
    fireEvent.compositionStart(first);
    fireEvent.input(first, { target: { value: '´' }, isComposing: true }); // dead key pressed
    expect(onChange).not.toHaveBeenCalled();
    expect(first).toHaveValue('´'); // shown while composing
    fireEvent.compositionEnd(first, { target: { value: 'é' } }); // + "e" → é
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(0, 'é');
  });

  it('is read-only when not editable, and does not steal focus', () => {
    setup(['a', 'b', 'c'], false);
    expect(box(1)).toBeDisabled();
    expect(box(1)).not.toHaveFocus();
  });

  it('turns off browser helpers that would mangle spelling', () => {
    setup();
    const el = box(1);
    expect(el).toHaveAttribute('autocapitalize', 'none');
    expect(el).toHaveAttribute('autocorrect', 'off');
    expect(el).toHaveAttribute('spellcheck', 'false');
    expect(el).toHaveAttribute('autocomplete', 'off');
  });
});

describe('AnswerReveal', () => {
  const reveal = { spellingCorrect: false, correctSpelling: 'été', phoneticSpelling: '/ete/' };

  it('shows the answer, phonetics, and a text (not colour-only) spelling verdict', () => {
    render(<AnswerReveal reveal={reveal} />);
    expect(screen.getByText('Spelling incorrect')).toBeInTheDocument();
    expect(screen.getByText('été')).toBeInTheDocument();
    expect(screen.getByText('/ete/')).toBeInTheDocument();
  });

  it('omits phonetics when the card has none, and shows an accent hint when given', () => {
    render(<AnswerReveal reveal={{ ...reveal, phoneticSpelling: null, spellingCorrect: true }} accentHint="Watch the accent: é" />);
    expect(screen.getByText('Spelling correct')).toBeInTheDocument();
    expect(screen.queryByText('/ete/')).not.toBeInTheDocument();
    expect(screen.getByText('Watch the accent: é')).toBeInTheDocument();
  });
});

describe('AnswerReveal focus', () => {
  it('takes keyboard focus so it is not lost when the letter boxes become read-only', () => {
    render(<AnswerReveal reveal={{ spellingCorrect: true, correctSpelling: 'chat', phoneticSpelling: null }} />);
    expect(screen.getByRole('region', { name: 'Answer' })).toHaveFocus();
  });
});

describe('PronunciationPrompt', () => {
  it('reports yes / no and locks while disabled', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<PronunciationPrompt disabled={false} onAnswer={onAnswer} />);
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(onAnswer.mock.calls).toEqual([[true], [false]]);
    rerender(<PronunciationPrompt disabled onAnswer={onAnswer} />);
    expect(screen.getByRole('button', { name: 'Yes' })).toBeDisabled();
  });
});

describe('ResultBanner', () => {
  const result = { spellingCorrect: true, correctSpelling: 'x', phoneticSpelling: null, passed: true, newLevel: 3 as const, sessionComplete: false, currentLevel: 1 as const };

  it('explains the outcome and continues', async () => {
    const onContinue = vi.fn();
    render(<ResultBanner result={result} loading={false} error={null} onContinue={onContinue} />);
    expect(screen.getByText('Moved up to level 3')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Next card' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('says Finish on the last card and shows errors', () => {
    render(<ResultBanner result={{ ...result, sessionComplete: true }} loading={false} error="offline" onContinue={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('offline');
  });
});

describe('CatchUpNotice', () => {
  it('lists the levels and toggles the skip switch', async () => {
    const onChangeSkip = vi.fn();
    render(<CatchUpNotice levelsDue={[6, 3, 2, 1]} skipNewCards={false} onChangeSkip={onChangeSkip} />);
    expect(screen.getByText(/levels 6 · 3 · 2 · 1/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('checkbox', { name: "Skip today's new cards" }));
    expect(onChangeSkip).toHaveBeenCalledWith(true);
  });
});

describe('Button', () => {
  it('does not fire while loading or disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Button onClick={onClick} loading>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('aria-busy', 'true');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    rerender(<Button onClick={onClick} disabled>Go</Button>);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is type="button" unless told otherwise, so it never submits a form by accident', () => {
    render(<><Button>Plain</Button><Button type="submit">Send</Button></>);
    expect(screen.getByRole('button', { name: 'Plain' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });
});

describe('TextField', () => {
  it('associates the label and reports errors accessibly', async () => {
    const onChange = vi.fn();
    render(<TextField label="Email" value="" onChange={onChange} error="Enter a valid email address" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address');
    await userEvent.setup().type(input, 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('renders a textarea when multiline, with no error markup when valid', () => {
    render(<TextField label="Description" value="x" onChange={vi.fn()} multiline />);
    expect(screen.getByLabelText('Description').tagName).toBe('TEXTAREA');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ReviewCard', () => {
  it('shows the picture and description, and a fallback when the picture fails', () => {
    render(<ReviewCard card={{ photoUrl: 'https://img.example/a.png', description: 'a small pet' }} />);
    const img = screen.getByAltText('Picture of the word to spell');
    expect(img).toHaveAttribute('src', 'https://img.example/a.png');
    expect(screen.getByText('a small pet')).toBeInTheDocument();
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: 'Picture could not be loaded' })).toBeInTheDocument();
    expect(screen.getByText('a small pet')).toBeInTheDocument();
  });
});

describe('AppShell', () => {
  it('sets the document title, heading and back link', () => {
    render(<MemoryRouter><AppShell title="Review" backTo="/">content</AppShell></MemoryRouter>);
    expect(document.title).toBe('Review · Flashcards');
    expect(screen.getByRole('heading', { level: 1, name: 'Review' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('main')).toHaveTextContent('content');
  });

  it('uses the plain app name on the home screen and has no back link', () => {
    render(<MemoryRouter><AppShell title="Flashcards">x</AppShell></MemoryRouter>);
    expect(document.title).toBe('Flashcards');
    expect(screen.queryByRole('link', { name: 'Back' })).not.toBeInTheDocument();
  });
});
