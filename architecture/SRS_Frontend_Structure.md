# Frontend Code Structure (Vite + React + TypeScript PWA)

The client is a Progressive Web App in `web/`: a standard React DOM app built with Vite, installable on a phone's home screen and able to open offline. It is the companion to `SRS_App_Notes.md` (product behaviour) and `SRS_Backend_Structure.md` (the API it talks to, in `backend/`). Line counts below are the **actual** counts of the built code.

**Stack:** Vite 8, React 19, TypeScript, React Router 8 (real URLs), TanStack Query (server state), `vite-plugin-pwa` (Workbox) for the manifest and service worker, Vitest + Testing Library for tests. No global state library: server data lives in TanStack Query, auth in one context, and the review card flow in a pure reducer.

*History:* the first client was a React Native (Expo) app in `mobile/`. It was replaced by this PWA and deleted. The `domain/`, `application/` and `data/` layers carried over unchanged because they contain no UI code; only `presentation/` and `app/` were rewritten for the DOM. That portability is a direct result of the layering below.

---

## 1. Design Principles (SOLID applied)

| Principle | How it is applied here |
| :--- | :--- |
| **S**ingle Responsibility | Screens compose components and call hooks. Components only render. Each hook owns one use case (`useTodaySession`, `useSubmitReview`). One card's step-by-step logic lives in a pure reducer (`reviewFlow.ts`); *moving between cards* is a separate hook (`useReviewQueue`). API classes only translate calls to HTTP. |
| **O**pen/Closed | A new review step is a new phase in the reducer's union; a new screen is a new route. A different input style would be a new component with the same props as `LetterInput`. |
| **L**iskov Substitution | Every gateway interface has a real HTTP implementation and an in-memory fake; `WebTokenStorage` and `InMemoryTokenStorage` are interchangeable. Screens and hooks run unchanged against either. |
| **I**nterface Segregation | One small gateway per capability (`SessionGateway`, `DeckGateway`, `ReviewGateway`, …) instead of one `Api` object. Components receive only the props they render. |
| **D**ependency Inversion | Hooks depend on gateway **interfaces** from `application/ports`, obtained through `ServicesContext`. Only `app/composition.ts` knows about `fetch` or `localStorage`. Tests build the same tree with fakes. |

**Dependency direction (arrows = "depends on"):**

```
presentation (screens, components)  →  application (hooks, ports)  →  domain (types, pure logic)
                                                  ▲
                         data (HTTP + storage implementations of the ports)
                                                  ▲
                              app/composition.ts wires data into the ports
```

`domain/` imports nothing from other layers. `presentation/` never imports from `data/`. Only `app/` imports from every layer.

---

## 2. Folder Structure and Module Details

```
web/
├── index.html                 # head tags: viewport-fit=cover, theme-color (light/dark), iOS home-screen meta   (23)
├── vite.config.ts             # React plugin, PWA plugin (manifest + Workbox), dev proxy, Vitest config        (51)
├── public/                    # generated PNG icons (192, 512, maskable, apple-touch, favicon)
├── scripts/make-icons.js      # dependency-free icon generator, run with `pnpm icons`                         (104)
├── src/
│   ├── main.tsx               # entry: composes services, registers the service worker, renders              (25)
│   ├── app/                   # wiring only                                                           (total 95)
│   ├── domain/                # pure, no React, no I/O                                               (total 257)
│   ├── application/           # use cases (hooks) and ports                                          (total 306)
│   ├── data/                  # implementations of the ports                                         (total 233)
│   └── presentation/          # DOM UI + styles                                                      (total 842)
└── tests/                     # unit/UI tests + 4 opt-in contract tests                              (≈1,435)
```

### 2.1 `app/`: wiring (95 lines)

| File | Responsibility | Lines |
| :--- | :--- | :--- |
| `config.ts` | API base URL: `VITE_API_URL`, default same-origin (relative URLs). | 6 |
| `composition.ts` | **Only place that uses `new` on concrete data classes.** Builds `WebTokenStorage`, `FetchHttpClient`, each `*Api`; returns a `Services` object typed by the ports. | 32 |
| `AppProviders.tsx` | `ServicesProvider`, a `QueryClientProvider`, and `AuthProvider`. | 16 |
| `AppRoutes.tsx` | The route table with two guards. `RequireAuth` (signed-out → `/login`) wraps `/`, `/review`, `/done`, `/add`; `PublicOnly` (signed-in → `/`) wraps `/login`, `/register`. Unknown URLs go to `/`. | 41 |

### 2.2 `domain/`: pure logic (257 lines)

| File | What it does | Lines |
| :--- | :--- | :--- |
| `types.ts` | DTOs mirroring the backend JSON exactly. | 74 |
| `errors.ts` | `ApiError`, `NetworkError`, `isUnauthorized`, `errorMessage` (safe user-facing text, never raw internals). | 29 |
| `letterSlots.ts` | Immutable helpers for the one-box-per-letter input: `writeSlots` (typing and paste), `backspaceSlots`, `isComplete`. Accents are single characters. | 46 |
| `reviewFlow.ts` | The state machine for one card: `answering → revealing → revealed → submitting → result`, a failed request returns to the previous phase with an error, illegal events are ignored. | 88 |
| `sessionLabels.ts` | Text for levels, headlines and results, kept out of components. | 20 |

### 2.3 `application/`: ports and use cases (306 lines)

| File | What it does | Lines |
| :--- | :--- | :--- |
| `ports/*` (7 files) | Small interfaces: `AuthGateway`, `SessionGateway`, `DeckGateway`, `ReviewGateway`, `FlashcardGateway`, `TokenStorage`, `SessionExpiredSignal`. | 40 |
| `ServicesContext.tsx` | Dependency injection via React context. | 31 |
| `auth/AuthProvider.tsx` | Loads the token on launch, signs in/up (sends the device time zone on register), signs out. Sign-out and a rejected token both clear the token **and the query cache**, so one user's data never shows for the next. | 69 |
| `queryClient.ts` / `queryKeys.ts` | Retry only network errors, never 4xx; central cache keys. | 16 |
| `hooks/useTodaySession.ts` | Reads today's session. Refetches on window focus, so a tab left open overnight never shows yesterday's session. | 14 |
| `hooks/useStartSession.ts` | Starts the session (`skipNewCards`), writes the result into the cache. | 15 |
| `hooks/useDeck.ts` | The current deck; never served from cache. | 9 |
| `hooks/useRevealAnswer.ts`, `useSubmitReview.ts` | Reveal (read-only) and submit; submit refreshes the session. | 22 |
| `hooks/useAddFlashcard.ts` | Adds a word, then refreshes the Today preview (the new-card count changes). | 14 |
| `hooks/useReviewFlow.ts` | Drives **one card**: owns the reducer and calls reveal/submit on the right transitions. | 51 |
| `hooks/useReviewQueue.ts` | Walks the day's deck one card at a time. The server decides order after every review; checks `isError` on refetch because TanStack returns the *previous* data alongside an error. | 54 |

### 2.4 `data/`: implementations (233 lines)

| File | What it does | Lines |
| :--- | :--- | :--- |
| `http/FetchHttpClient.ts` | `fetch` with the base URL, bearer token, JSON, a timeout, **`cache: 'no-store'`**, error-envelope → `ApiError`, network failure → `NetworkError`, and a "session expired" signal on a 401 for a request that carried a token. | 88 |
| `http/HttpClient.ts`, `UnauthorizedSignal.ts` | The seam the APIs depend on; a tiny subscribe/notify so the HTTP client (created before React) can tell `AuthProvider` to sign out. | 20 |
| `api/*Api.ts` (5 files) | One class per gateway; path and body only. | 67 |
| `storage/WebTokenStorage.ts` | `localStorage`, with an in-memory fallback when storage is blocked (private mode). | 49 |
| `storage/InMemoryTokenStorage.ts` | Same interface, for tests. | 15 |

### 2.5 `presentation/`: DOM UI (842 lines)

Components are pure: props in, JSX out, no fetching. Screens call hooks and pass results down.

| File | Responsibility | Lines |
| :--- | :--- | :--- |
| `styles.css` | Light/dark palette via `prefers-color-scheme`, phone-width column centred on wide screens, safe-area padding, 44 px touch targets, **16 px+ form text** (iOS zooms the page on smaller inputs), reduced-motion support. | 173 |
| `components/AppShell.tsx` | Header (back link), labelled `<main>`, sets `document.title`. | 27 |
| `components/Button.tsx` | `type="button"` by default so a button never submits a form by accident; `loading` shows a spinner and sets `aria-busy`. | 23 |
| `components/TextField.tsx` | Real `<label>`, `aria-invalid` / `aria-describedby` for errors, optional textarea. | 41 |
| `components/StateViews.tsx` | `LoadingView` (live region) and `ErrorView` with Try again. | 19 |
| `components/LevelBadge.tsx`, `CatchUpNotice.tsx` | Level chip; catch-up explanation with the skip-new-cards checkbox (controlled). | 29 |
| `components/ReviewCard.tsx` | Image and description. The French word is never part of the prompt. Falls back to "Picture unavailable" if the image fails. | 17 |
| `components/LetterInput.tsx` | One box per letter. Enter checks, arrows move, backspace in an empty box goes back, paste spreads. **Handles input-method composition**: dead keys (´ + e) are only reported once finished, otherwise focus would jump mid-accent. Disables autocorrect, autocapitalise and password-manager prompts. | 120 |
| `components/PronunciationPrompt.tsx`, `ResultBanner.tsx` | Answer + phonetics + Yes/No; pass/fail with level change. Verdicts are text, not colour alone. The Next/Finish button takes focus for keyboard users. | 49 |
| `screens/LoginScreen.tsx`, `RegisterScreen.tsx` | Real `<form>`s (Enter submits); registration validates like the backend before a round trip. | 95 |
| `screens/TodayScreen.tsx` | Day, levels, new-card count; catch-up notice with skip option; Start / Continue / All done; Add a word; Sign out. | 68 |
| `screens/ReviewScreen.tsx` | The review flow; `ReviewStep` is remounted per card via `key` so the reducer starts fresh. | 99 |
| `screens/SessionCompleteScreen.tsx`, `AddCardScreen.tsx` | Finish page; add-word form. | 82 |

---

## 3. Backend Contract the App Depends On

All endpoints except auth send `Authorization: Bearer <token>`. Errors arrive as `{ error: { code, message } }` (`VALIDATION` 400, `UNAUTHORIZED` 401, `NOT_FOUND` 404, `CONFLICT` 409).

| Gateway method | Endpoint | Request → Response |
| :--- | :--- | :--- |
| `AuthGateway.register` / `login` | `POST /api/auth/register`, `/login` | `{ email, password[, timeZone] }` → `{ userId, token }` |
| `SessionGateway.today` | `GET /api/session/today` | → `SessionSummary` (read-only preview or the existing session) |
| `SessionGateway.start` | `POST /api/session/start` | `{ skipNewCards }` → `SessionSummary` |
| `DeckGateway.current` | `GET /api/decks/daily` | → `{ sessionComplete, level, cards: [{ flashcardId, photoUrl, description, letterCount }] }` |
| `ReviewGateway.reveal` | `POST /api/review/reveal` | `{ flashcardId, spellingInput }` → `{ spellingCorrect, correctSpelling, phoneticSpelling }`, changes nothing |
| `ReviewGateway.submit` | `POST /api/review` | `{ flashcardId, spellingInput, pronunciationCorrect }` → result with `passed`, `newLevel`, `sessionComplete` |
| `FlashcardGateway.add` | `POST /api/flashcards` | new word → `Flashcard` |

`reveal` exists so the app can show the answer and phonetics *before* the pronunciation self-check; `submit` still re-judges the spelling on the server, so the client cannot fake a pass.

---

## 4. Review Card State Machine (`domain/reviewFlow.ts`)

```
answering ──SUBMIT_SPELLING──► revealing ──REVEAL_OK──► revealed ──MARK(yes|no)──► submitting ──SAVED──► result ──(next card remounts)──► answering
    ▲                              │                        ▲                          │
    └────────── REVEAL_FAILED ─────┘                        └──────── SAVE_FAILED ─────┘
```

| Phase | UI shown | Allowed events |
| :--- | :--- | :--- |
| `answering` | Image + description, letter boxes | `LETTER_CHANGED`, `BACKSPACE`, `SUBMIT_SPELLING` (only when every box is filled) |
| `revealing` | Boxes locked, spinner on Check | `REVEAL_OK`, `REVEAL_FAILED` |
| `revealed` | Verdict, correct spelling, phonetics, Yes/No | `MARK_PRONUNCIATION` |
| `submitting` | Yes/No locked | `SAVED`, `SAVE_FAILED` |
| `result` | Pass/fail banner | none (the next card remounts the step) |

The deck is **refetched after every submit** when moving on, because the server owns the ordering: a failed Level 1 card reappears at the back exactly as the backend decides.

---

## 5. PWA

| Piece | How |
| :--- | :--- |
| Manifest | Defined in `vite.config.ts`: standalone display, light theme colour, 192/512 icons and a **maskable** icon. |
| Icons | `public/*.png`, generated by `pnpm icons` (a flashcard-stack placeholder; replace with real artwork any time). |
| Head tags | `index.html`: `viewport-fit=cover`, light/dark `theme-color`, iOS home-screen meta tags, apple-touch icon. |
| Service worker | Workbox `generateSW`. Precaches the app shell and assets; client-side routes fall back to the cached `index.html`; **`/api/*` and `/health` are never intercepted or cached**. |
| Updates | `registerType: 'prompt'` and no reload code: a new version is installed and **waits** until the app is next opened, so it can never reload under someone mid-review. |
| Dev | `pnpm dev` proxies `/api` and `/health` to the backend (`VITE_DEV_API`, default `http://localhost:3000`), so dev is same-origin too and no CORS is needed. |

### Run it

```
# development (hot reload)
cd backend && pnpm dev          # API on :3000
cd web     && pnpm dev          # app on :5173, /api proxied

# production-style (what a phone installs)
cd web     && pnpm build        # → web/dist
cd backend && WEB_DIR=../web/dist pnpm dev     # one origin: app + API on :3000
```

### Installing on an iPhone (needs HTTPS)

Service workers and installability require a secure context, and an HTTPS page cannot call an `http://` API, so a phone needs the app on an **HTTPS URL** (`localhost` is exempt on the Mac only):
1. **Quick test:** run the backend with `WEB_DIR` and expose it with a tunnel (`cloudflared tunnel --url http://localhost:3000` or ngrok). Open the https URL in Safari, then Share → **Add to Home Screen**.
2. **Real deployment:** run the backend on the Hostinger VM behind HTTPS (Caddy or nginx with Let's Encrypt), with `NODE_ENV=production`, `JWT_SECRET`, `DB_PATH`, `WEB_DIR`.

---

## 6. Build Status and Verification

Built and verified. Output is 318 kB of JavaScript (99 kB gzipped).

- **Tests:** 118 unit and UI tests (`pnpm test`) plus 4 opt-in contract tests (`INTEGRATION_API_URL=… pnpm test:integration`) that drive the real data layer against a running backend and pass. A mutation check (deliberately breaking one behaviour) confirmed the tests can fail.
- **In Chrome, against the production build served by the backend:** deep link `/review` signed out lands on `/login`; register, add a word with the keyboard only, Start, spell without accents (graded wrong), re-queue, spell with accents (graded right), pronunciation, finish; Enter-to-submit on forms; the review flow by keyboard; sign-out redirects to `/login`, clears the token and leaves no API data in any cache.
- **Offline and updates:** with the server stopped the shell opens and Today shows "Could not reach the server" with a working Try again (three attempts first); a new build installs a new service worker that **waits** while the open page is untouched.
- **Dev:** `pnpm dev` proxies the API correctly.

One observation I could not explain: in one offline run Today briefly showed live data with the server stopped. A clean repeat behaved correctly, and neither the HTTP cache nor the Cache API held any API response, so I believe it was a timing artefact of stopping the server, but I did not prove that.

**Not verified:** a real iPhone. Safari quirks of the installed PWA (keyboard resize, safe areas, home-screen launch) were only exercised in desktop Chrome.

Known limitations:
- No offline reviewing. The API is always required; offline only means the app opens and explains the problem.
- The login token lives in `localStorage` (readable by any script on the page), so keep the app free of third-party scripts.
- Multi-word cards get plain boxes for spaces and hyphens (the backend's `letterCount` counts every character).
- No push reminders, settings screen or password reset yet.
