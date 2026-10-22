# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Self-directed learners who build vocabulary through a daily habit. Today the content is French (following Gabriel Wyner's *Fluent Forever*), but the user chose to position the product for learners of any subject, so the system must not hard-code French. They mostly use it on a phone as an installed PWA, sometimes on desktop. The job is a short daily session: add 10 new words, then review whatever the schedule says is due.

## Product Purpose
A spaced-repetition app built on the Leitner box method and the 64-day Game Schedule (`LeitnerSchedule.pdf`). It makes a daily review ritual that is easy to keep and impossible to lose track of. Success is that the user completes each day's session, can resume it after an interruption, and gradually promotes cards through Levels 1-7 to Completed.

## Positioning
Two things together, which a generic flashcard app does not copy:
- **Recall from image, not translation.** The card shows an image and a description, never the target word. The user types the word letter by letter (one input per letter), then sees the correct spelling and phonetics and self-reports pronunciation. A card passes only if spelling is correct and pronunciation is marked Yes.
- **The fixed 64-day schedule with catch-up.** Which levels are due comes from a lookup table, not an adaptive algorithm. Missed days are merged into one catch-up session (union of levels, highest first, Level 1 last). New cards are never back-filled, and the user can skip adding the day's 10.

## Operating Context
- Daily ritual: find the cycle day (1-64) from the user's start date, add 10 new cards from the New pool into Level 1 (once per calendar day), then review one level at a time, highest level first and Level 1 last.
- Level 1 failures go to the back of the deck until it is empty. Level 2-7 failures drop to Level 1 and are retried in the same session's Level 1 pass.
- Progress is saved after every card, so a session can be left and resumed.
- Spelling comparison trims whitespace and ignores case. Accents are strict (`é` ≠ `e`).

## Capabilities and Constraints
- Card lifecycle: New pool (level 0), Levels 1-7, Completed (terminal, never scheduled again). Pass moves up one level, any fail returns to Level 1.
- Accounts with authentication. The backend is Express with SQLite. The web app is React with Vite, TanStack Query and React Router, and installs as a PWA.
- Review card is identical at every level.
- Architecture notes live in `architecture/`. Product behavior is specified in `architecture/SRS_App_Notes.md`.
- Undecided: whether the product is later opened to subjects beyond French, and its public name.

## Brand Commitments
- **Visual and tonal reference (user-pinned):** the product should feel more like Wealthsimple's styling: calm, confident, warm, premium and plain-spoken. This is a reference for feel and visual language, not a brand to imitate: do not copy their name, logo, proprietary typefaces, illustrations or copy. Visual specifics live in DESIGN.md.
- Voice: plain, warm and direct. Say what happened and what to do next, with no jargon and no gamified hype.
- This supersedes the earlier plain, system-font look. The product's behavior and rules are unchanged.

## Evidence on Hand
- `LeitnerSchedule.pdf` (source of the Game Schedule) and `architecture/SRS_App_Notes.md` (full behavior).
- Hand-written planning notes in `notes/IMG_2743.jpeg`.
- PWA icons in `web/public/`.
- No testimonials, user numbers or marketing claims exist. Do not fabricate any.

## Product Principles
- The daily session is the product. Anything that adds friction between opening the app and starting the first card is suspect.
- Recall is effortful by design. Never reveal the answer early or soften the strict spelling rules for convenience.
- The schedule is authoritative and legible. The user should always know which levels are due today and why.
- Safe to interrupt, safe to miss days. Resume and catch-up must feel normal, never punitive.
- Built for one-handed, phone-first use, with the letter boxes and keyboard as the primary input.

## Accessibility & Inclusion
No product-specific standard was stated. Letter-by-letter input, accented characters and self-reported pronunciation should be usable with the on-screen keyboard and assistive tech.
