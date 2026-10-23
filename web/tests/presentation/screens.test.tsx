import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { AppRoutes } from '../../src/app/AppRoutes';
import { ApiError } from '../../src/domain/errors';
import { EditCardScreen } from '../../src/presentation/screens/EditCardScreen';
import { MyWordsScreen } from '../../src/presentation/screens/MyWordsScreen';
import { AddCardScreen } from '../../src/presentation/screens/AddCardScreen';
import { LoginScreen } from '../../src/presentation/screens/LoginScreen';
import { RegisterScreen } from '../../src/presentation/screens/RegisterScreen';
import { ReviewScreen } from '../../src/presentation/screens/ReviewScreen';
import { SessionCompleteScreen } from '../../src/presentation/screens/SessionCompleteScreen';
import { TodayScreen } from '../../src/presentation/screens/TodayScreen';
import { FakeBackend, createFakeServices, makeWrapper, summary, type FakeServices } from '../fakes';

/** Renders a screen at its route, with marker pages for the routes it may navigate to. */
function renderAt(path: string, ui: React.ReactElement, services: FakeServices, options: { auth?: boolean } = {}) {
  const { wrapper } = makeWrapper(services, { auth: options.auth ?? true, route: path });
  const markers = ['/', '/review', '/done', '/add', '/login', '/register'].filter((p) => p !== path);
  return render(
    <Routes>
      <Route path={path} element={ui} />
      {markers.map((p) => <Route key={p} path={p} element={<div>PAGE {p}</div>} />)}
    </Routes>,
    { wrapper },
  );
}

describe('TodayScreen', () => {
  const open = (services: FakeServices) => renderAt('/', <TodayScreen />, services);

  it('previews a normal day and starts the review', async () => {
    const services = createFakeServices();
    open(services);
    expect(await screen.findByRole('heading', { name: 'Day 1' })).toBeInTheDocument();
    expect(screen.getByText('Levels 2 · 1')).toBeInTheDocument();
    expect(screen.getByText('10 new cards will be added')).toBeInTheDocument();
    expect(screen.queryByText('You missed a day')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Start review' }));
    expect(await screen.findByText('PAGE /review')).toBeInTheDocument();
    expect(services.session.start).toHaveBeenCalledWith(false);
  });

  it('offers to skip new cards on a catch-up day and sends the choice', async () => {
    const services = createFakeServices();
    (services.session.today as Mock).mockResolvedValue(summary({ isCatchUp: true, levelsDue: [6, 3, 2, 1], cycleDay: 59 }));
    open(services);
    expect(await screen.findByRole('heading', { name: 'Catch-up day' })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox', { name: "Skip today's new cards" }));
    await user.click(screen.getByRole('button', { name: 'Start review' }));
    await waitFor(() => expect(services.session.start).toHaveBeenCalledWith(true));
  });

  it('continues an in-progress session without starting a new one', async () => {
    const services = createFakeServices();
    (services.session.today as Mock).mockResolvedValue(summary({ started: true, status: 'in_progress', newCardsAdded: 10 }));
    open(services);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Continue reviewing' }));
    expect(await screen.findByText('PAGE /review')).toBeInTheDocument();
    expect(services.session.start).not.toHaveBeenCalled();
  });

  it('shows a finished state with no start button', async () => {
    const services = createFakeServices();
    (services.session.today as Mock).mockResolvedValue(summary({ started: true, status: 'complete', currentLevel: null }));
    open(services);
    expect(await screen.findByRole('heading', { name: 'All done for today' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start review' })).not.toBeInTheDocument();
  });

  it('stays on the page when starting finds nothing to review', async () => {
    const services = createFakeServices();
    (services.session.today as Mock).mockResolvedValue(summary({ newCardsAdded: 0 }));
    (services.session.start as Mock).mockResolvedValue(summary({ started: true, status: 'complete', currentLevel: null }));
    open(services);
    expect(await screen.findByText(/no new words waiting/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Start review' }));
    await waitFor(() => expect(services.session.start).toHaveBeenCalled());
    expect(screen.queryByText('PAGE /review')).not.toBeInTheDocument();
  });

  it('shows start errors', async () => {
    const services = createFakeServices();
    (services.session.start as Mock).mockRejectedValue(new ApiError(500, 'INTERNAL', 'Internal server error'));
    open(services);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Start review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error');
  });

  it('shows a load error with a working retry', async () => {
    const services = createFakeServices();
    (services.session.today as Mock).mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'Server is down'));
    open(services);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server is down');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Day 1' })).toBeInTheDocument();
  });

  it('signs out, clearing the stored token', async () => {
    const services = createFakeServices();
    await services.tokenStore.set('t');
    open(services);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(async () => expect(await services.tokenStore.get()).toBeNull());
  });

  it('goes to the add-word page', async () => {
    open(createFakeServices());
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Add a word' }));
    expect(await screen.findByText('PAGE /add')).toBeInTheDocument();
  });
});

describe('ReviewScreen', () => {
  type Words = Record<number, { word: string; phonetic: string | null }>;
  const WORDS: Words = { 1: { word: 'été', phonetic: '/ete/' }, 2: { word: 'chat', phonetic: null } };

  function open(words: Words = WORDS) {
    const backend = new FakeBackend(words);
    const services = createFakeServices({ deck: backend, review: backend });
    renderAt('/review', <ReviewScreen />, services);
    return { backend, services, user: userEvent.setup() };
  }
  /** Types like a person: the first box has focus and each letter advances to the next. */
  const typeWord = async (user: ReturnType<typeof userEvent.setup>, word: string) => {
    await user.keyboard(word);
  };

  it('walks a card from spelling to result and finishes the session', async () => {
    const { user, backend } = open({ 1: WORDS[1]! });
    expect(await screen.findByText('desc 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Level 1 of 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();

    await typeWord(user, 'été');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Spelling correct')).toBeInTheDocument();
    expect(screen.getByText('/ete/')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yes' }));

    expect(await screen.findByText('Moved up to level 2')).toBeInTheDocument();
    expect(backend.submitted).toEqual([{ flashcardId: 1, spellingInput: 'été', pronunciationCorrect: true }]);
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('PAGE /done')).toBeInTheDocument();
  });

  it('checks the spelling when Enter is pressed in the last box', async () => {
    const { user } = open({ 2: WORDS[2]! });
    await screen.findByText('desc 2');
    await typeWord(user, 'chat');
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Spelling correct')).toBeInTheDocument();
  });

  it('reveals the answer after a wrong spelling, then re-queues the card behind the next one', async () => {
    const { user } = open();
    await screen.findByText('desc 1');
    await typeWord(user, 'ete');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Spelling incorrect')).toBeInTheDocument();
    expect(screen.getByText('été')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'No' }));
    expect(await screen.findByText(/Not quite/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(await screen.findByText('desc 2')).toBeInTheDocument(); // card 1 went to the back
    expect(screen.queryByText('Spelling incorrect')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Letter 1 of 4')).toHaveValue('');
  });

  it('keeps the typed letters and shows an error when the reveal fails, then recovers', async () => {
    const { backend, user } = open({ 2: WORDS[2]! });
    await screen.findByText('desc 2');
    await typeWord(user, 'chat');
    backend.failNextReveal = true;
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByLabelText('Letter 1 of 4')).toHaveValue('c');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Spelling correct')).toBeInTheDocument();
  });

  it('lets the user retry the pronunciation answer after a failed save', async () => {
    const { backend, user } = open({ 2: WORDS[2]! });
    await screen.findByText('desc 2');
    await typeWord(user, 'chat');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await screen.findByText('Spelling correct');
    backend.failNextSubmit = true;
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText(/Choose Yes or No to try again/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(await screen.findByText('Moved up to level 2')).toBeInTheDocument();
  });

  it('goes straight to the completion page when there is nothing to review', async () => {
    open({});
    expect(await screen.findByText('PAGE /done')).toBeInTheDocument();
  });

  it('shows a load error with retry', async () => {
    const services = createFakeServices();
    (services.deck.current as Mock).mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', "Today's session has not been started"));
    renderAt('/review', <ReviewScreen />, services);
    expect(await screen.findByRole('alert')).toHaveTextContent("Today's session has not been started");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('SessionCompleteScreen', () => {
  it('returns to Today', async () => {
    renderAt('/done', <SessionCompleteScreen />, createFakeServices());
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back to today' }));
    expect(await screen.findByText('PAGE /')).toBeInTheDocument();
  });
});

describe('LoginScreen', () => {
  it('signs in with a trimmed email, from the keyboard (Enter submits the form)', async () => {
    const services = createFakeServices();
    renderAt('/login', <LoginScreen />, services);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), '  a@b.co ');
    await user.type(screen.getByLabelText('Password'), 'password1{Enter}');
    await waitFor(() => expect(services.auth.login).toHaveBeenCalledWith('a@b.co', 'password1'));
  });

  it('shows the server error and re-enables the form', async () => {
    const services = createFakeServices();
    (services.auth.login as Mock).mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password'));
    renderAt('/login', <LoginScreen />, services);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'a@b.co');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
  });

  it('links to registration', async () => {
    renderAt('/login', <LoginScreen />, createFakeServices());
    await userEvent.setup().click(screen.getByRole('link', { name: 'Create an account' }));
    expect(await screen.findByText('PAGE /register')).toBeInTheDocument();
  });
});

describe('RegisterScreen', () => {
  it('validates before calling the server', async () => {
    const services = createFakeServices();
    renderAt('/register', <RegisterScreen />, services);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument();
    expect(services.auth.register).not.toHaveBeenCalled();
  });

  it('registers with valid input, and shows a duplicate-email error first', async () => {
    const services = createFakeServices();
    (services.auth.register as Mock).mockRejectedValueOnce(new ApiError(409, 'CONFLICT', 'Email already registered'));
    renderAt('/register', <RegisterScreen />, services);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'a@b.co');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(services.auth.register).toHaveBeenCalledTimes(2));
  });
});

describe('AddCardScreen', () => {
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('French word'), ' chat ');
    await user.type(screen.getByLabelText('English translation'), 'cat');
    await user.type(screen.getByLabelText('Description (without the word)'), 'a small pet');
    await user.type(screen.getByLabelText('Image link'), 'https://img.example/cat.png');
  }

  it('validates required fields', async () => {
    const services = createFakeServices();
    renderAt('/add', <AddCardScreen />, services);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add word' }));
    expect(await screen.findByText('Enter the French word')).toBeInTheDocument();
    expect(screen.getByText(/image link starting with/)).toBeInTheDocument();
    expect(services.flashcards.add).not.toHaveBeenCalled();
  });

  it('sends a trimmed card with null phonetics, then clears the form', async () => {
    const services = createFakeServices();
    (services.flashcards.add as Mock).mockResolvedValue({});
    renderAt('/add', <AddCardScreen />, services);
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Add word' }));
    expect(await screen.findByText(/Added "chat"/)).toBeInTheDocument();
    expect(services.flashcards.add).toHaveBeenCalledWith({
      frenchText: 'chat', englishTranslation: 'cat', photoUrl: 'https://img.example/cat.png', description: 'a small pet', phoneticSpelling: null,
    });
    expect(screen.getByLabelText('French word')).toHaveValue('');
  });

  it('shows the server error and keeps the form', async () => {
    const services = createFakeServices();
    (services.flashcards.add as Mock).mockRejectedValue(new ApiError(400, 'VALIDATION', 'photoUrl: Invalid URL'));
    renderAt('/add', <AddCardScreen />, services);
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Add word' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('photoUrl: Invalid URL');
    expect(screen.getByLabelText('English translation')).toHaveValue('cat');
  });
});

describe('MyWordsScreen and EditCardScreen', () => {
  const chat = {
    flashcardId: 5, ownerUserId: 1, sortOrder: 1, createdAt: '', frenchText: 'chat', englishTranslation: 'cat',
    photoUrl: 'https://img.example/cat.png', description: 'a small pet', phoneticSpelling: '/ʃa/',
  };

  it('lists the user\'s words and shows an empty state', async () => {
    const services = createFakeServices();
    (services.flashcards.listMine as Mock).mockResolvedValue([chat]);
    renderAt('/words', <MyWordsScreen />, services);
    expect(await screen.findByRole('link', { name: 'Edit chat' })).toHaveAttribute('href', '/words/5');
  });

  it('says so when there are no words', async () => {
    renderAt('/words', <MyWordsScreen />, createFakeServices());
    expect(await screen.findByText(/haven't added any words/)).toBeInTheDocument();
  });

  function openEdit(services: FakeServices) {
    (services.flashcards.listMine as Mock).mockResolvedValue([chat]);
    const { wrapper } = makeWrapper(services, { auth: true, route: '/words/5' });
    render(
      <Routes>
        <Route path="/words/:id" element={<EditCardScreen />} />
        <Route path="/words" element={<div>PAGE /words</div>} />
      </Routes>,
      { wrapper },
    );
  }

  it('prefills the form, saves the change and returns to the list', async () => {
    const services = createFakeServices();
    (services.flashcards.update as Mock).mockResolvedValue(chat);
    openEdit(services);
    const french = await screen.findByLabelText('French word');
    expect(french).toHaveValue('chat');
    expect(screen.getByLabelText('Phonetic spelling (optional)')).toHaveValue('/ʃa/');
    const user = userEvent.setup();
    await user.clear(french);
    await user.type(french, 'chaton');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('PAGE /words')).toBeInTheDocument();
    expect(services.flashcards.update).toHaveBeenCalledWith(5, {
      frenchText: 'chaton', englishTranslation: 'cat', photoUrl: 'https://img.example/cat.png', description: 'a small pet', phoneticSpelling: '/ʃa/',
    });
  });

  it('validates and shows server errors without leaving', async () => {
    const services = createFakeServices();
    (services.flashcards.update as Mock).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Flashcard not found'));
    openEdit(services);
    const user = userEvent.setup();
    await user.clear(await screen.findByLabelText('English translation'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter the English translation')).toBeInTheDocument();
    expect(services.flashcards.update).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('English translation'), 'cat');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Flashcard not found');
  });

  it('handles an unknown word', async () => {
    const services = createFakeServices();
    const { wrapper } = makeWrapper(services, { auth: true, route: '/words/99' });
    render(<Routes><Route path="/words/:id" element={<EditCardScreen />} /></Routes>, { wrapper });
    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
  });
});

describe('route guards (AppRoutes)', () => {
  function app(path: string, services: FakeServices) {
    const { wrapper: Wrapper } = makeWrapper(services, { auth: true, route: path });
    return render(<AppRoutes />, { wrapper: Wrapper });
  }

  it('sends a signed-out visitor to the login page, whatever they asked for', async () => {
    app('/review', createFakeServices());
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('sends a signed-in user from /login to Today', async () => {
    const services = createFakeServices();
    await services.tokenStore.set('t');
    app('/login', services);
    expect(await screen.findByRole('heading', { name: 'Day 1' })).toBeInTheDocument();
  });

  it('sends unknown URLs to Today (and then to login if signed out)', async () => {
    app('/nope/nothing', createFakeServices());
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('signs the user out of the whole app when the server rejects the token', async () => {
    const services = createFakeServices();
    await services.tokenStore.set('t');
    app('/', services);
    await screen.findByRole('heading', { name: 'Day 1' });
    services.signal.notify();
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(await services.tokenStore.get()).toBeNull();
  });
});
