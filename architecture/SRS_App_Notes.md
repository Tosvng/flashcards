# Spaced Repetition App Architecture Notes (Leitner Box)

This document describes the product behaviour of the Spaced Repetition System (SRS) app for learning French vocabulary. It uses the **Leitner box** method with the 64-day **Game Schedule** from Gabriel Wyner's *Fluent Forever* (`LeitnerSchedule.pdf`). The app is designed for **daily use**: each day the user adds 10 new words and reviews whichever levels the schedule says are due.

Backend schema, endpoints and engine details live in `SRS_Backend_Notes.md`.

---

## 1. Levels & Card Lifecycle

```
New pool → Level 1 → Level 2 → Level 3 → Level 4 → Level 5 → Level 6 → Level 7 → Completed
              ▲          │         │         │         │         │         │
              └──────────┴─────────┴─────────┴─────────┴─────────┴─────────┘  (any failed review)
```

| Rule | Behaviour |
| :--- | :--- |
| New card | Sits in the **New pool** (level 0) until it is introduced into Level 1. |
| Pass | Card moves up exactly one level. |
| Fail | Card moves back to **Level 1**, regardless of its current level. |
| Level 7 pass | Card moves to **Completed**. Completed cards are never scheduled again. |

---

## 2. Review Card Experience

The review card is identical at every level.

1. **Prompt:** the card's **image** and **description** are shown. The French word is *not* shown.
2. **Spelling:** the user types the word into **input boxes** (one per letter).
3. **Reveal:** after submitting, the app shows the correct spelling and the **phonetic spelling** (if the card has one).
4. **Pronunciation self-check:** the user says the word aloud and marks **Yes / No** for "I pronounced it correctly".
5. **Result:** the card **passes only if spelling is correct AND pronunciation is marked Yes**. Otherwise it fails.

Spelling comparison: exact match after trimming whitespace and ignoring case. **Accents are strict** (`é` ≠ `e`).

---

## 3. Daily Session

### 3.1 Steps

1. **Find today's cycle day** (1–64) from the user's `start_date` (see 4).
2. **Add new cards:** move **10** cards from the New pool into Level 1. This happens once per calendar day (re-opening the app does not add more). The user may **skip** this in catch-up mode (see 5).
3. **Build the review queue:** take the levels due today from the Game Schedule, sorted **highest level first, Level 1 last**. Levels with no cards are skipped.
4. **Review one level at a time**, in that order:
   - **Level 2–7:** each card is reviewed once. Pass → up one level. Fail → moves to **Level 1** (it will be reviewed again later in the same session, because Level 1 is last).
   - **Level 1:** pass → Level 2. Fail → the card goes to the **back of the Level 1 deck** and the user keeps reviewing until the Level 1 deck is empty.
5. **Finish:** the session is complete when every due level is empty. The completion date is recorded.

Session progress is saved after every card so the user can leave and resume mid-session.

### 3.2 Why highest level first

Going from the highest due level down to Level 1:
- A card promoted today is never reviewed again today (e.g. a Level 2 card promoted to Level 3 is not seen again in the Level 3 pass).
- Cards that fail a higher level land in Level 1 *before* the Level 1 pass, so they get re-reviewed the same day.

### 3.3 Worked example

| Day | Due levels | What happens |
| :--- | :--- | :--- |
| 1 | 2, 1 | Level 2 is empty → skipped. 10 new cards enter Level 1. Review until all 10 pass → they move to Level 2. |
| 2 | 3, 1 | Level 3 is empty → skipped. 10 new cards enter Level 1. Review until all pass → Level 2 (now 20 cards in Level 2). |
| 3 | 2, 1 | Review Level 2 (20 cards): pass → Level 3, fail → Level 1. Then 10 new cards enter Level 1, so Level 1 = failed Level 2 cards + 10 new. Review until Level 1 is empty. |

---

## 4. The Game Schedule

A **64-day repeating cycle** that says which levels are due on each day. Roughly: Level 1 daily, Level 2 every other day, Level 3 every 4th day … Level 7 every 64 days. The pattern is irregular, so it is stored as a **lookup table** (copied from the PDF), not computed with a formula.

**Cycle day** = `((today − start_date) in days mod 64) + 1`. `start_date` is Day 1 of the cycle; Day 64 is followed by Day 1 again.

Levels are shown in review order (highest first).

| Day | Levels | Day | Levels | Day | Levels | Day | Levels |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | 2, 1 | 17 | 2, 1 | 33 | 2, 1 | 49 | 2, 1 |
| 2 | 3, 1 | 18 | 3, 1 | 34 | 3, 1 | 50 | 3, 1 |
| 3 | 2, 1 | 19 | 2, 1 | 35 | 2, 1 | 51 | 2, 1 |
| 4 | 4, 1 | 20 | 4, 1 | 36 | 4, 1 | 52 | 4, 1 |
| 5 | 2, 1 | 21 | 2, 1 | 37 | 2, 1 | 53 | 2, 1 |
| 6 | 3, 1 | 22 | 3, 1 | 38 | 3, 1 | 54 | 3, 1 |
| 7 | 2, 1 | 23 | 2, 1 | 39 | 2, 1 | 55 | 2, 1 |
| 8 | 1 | 24 | 6, 1 | 40 | 1 | 56 | 7, 1 |
| 9 | 2, 1 | 25 | 2, 1 | 41 | 2, 1 | 57 | 2, 1 |
| 10 | 3, 1 | 26 | 3, 1 | 42 | 3, 1 | 58 | 3, 1 |
| 11 | 2, 1 | 27 | 2, 1 | 43 | 2, 1 | 59 | 6, 2, 1 |
| 12 | 5, 1 | 28 | 5, 1 | 44 | 5, 1 | 60 | 5, 1 |
| 13 | 4, 2, 1 | 29 | 4, 2, 1 | 45 | 4, 2, 1 | 61 | 4, 2, 1 |
| 14 | 3, 1 | 30 | 3, 1 | 46 | 3, 1 | 62 | 3, 1 |
| 15 | 2, 1 | 31 | 2, 1 | 47 | 2, 1 | 63 | 2, 1 |
| 16 | 1 | 32 | 1 | 48 | 1 | 64 | 1 |

---

## 5. Missed Days (Catch-up)

If the user did not complete the session on one or more days, the next session covers everything they missed.

1. Look up the levels scheduled for **every missed cycle day** and for **today**.
2. Take the **union** (each level once).
3. Sort **descending**; Level 1 is always last.
4. Review each level in that order using the normal rules in 3.1.

**Example:** days 57 (2, 1) and 58 (3, 1) are missed and today is day 59 (6, 2, 1). Levels due = {6, 3, 2, 1} → review order **6, 3, 2, 1**.

**New cards:** no new cards are ever back-filled for missed days. To reduce the workload, the user gets an option to **skip adding today's 10 new cards** when the session is a catch-up session.

If the gap is 64 days or more, every level 1–7 is due.

---

## 6. Assumptions

- Level 7 pass → **Completed** (terminal state).
- Day 1 of the cycle is the day the user starts the app.
- Session progress is persisted; an interrupted session can be resumed.
- A card that fails at Level 2–7 is not retried within its own level; it is retried in the Level 1 pass of the same session.
