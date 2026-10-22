---
name: Flashcards
description: A calm, confident, phone-first drill surface in a Wealthsimple-inspired language: warm canvas, near-black ink, big friendly type, black pill actions and generously rounded cards.
colors:
  canvas: "#f6f3ee"
  surface: "#ffffff"
  tint: "#efebe4"
  ink: "#1f1d1b"
  on-ink: "#f6f3ee"
  graphite: "#6b6560"
  line: "#e2ddd5"
  pass-bg: "#dff2e3"
  pass-ink: "#17602d"
  miss-bg: "#fbe4df"
  miss-ink: "#a3261b"
  pastel: "#e7e0f6"
  on-pastel: "#3b2f63"
  canvas-night: "#151413"
  surface-night: "#211f1d"
  tint-night: "#2a2724"
  ink-night: "#f4f1ec"
  on-ink-night: "#1f1d1b"
  graphite-night: "#a39d95"
  line-night: "#36322e"
  pass-bg-night: "#1c3a26"
  pass-ink-night: "#8fdca8"
  miss-bg-night: "#44201c"
  miss-ink-night: "#ffa397"
  pastel-night: "#3a3350"
  on-pastel-night: "#d9ccff"
typography:
  display:
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2.5rem, 12vw, 3.5rem)"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  caption:
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.5
  button:
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "-0.005em"
  letter:
    fontFamily: "'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  box: "16px"
  media: "20px"
  card: "28px"
  pill: "999px"
  full: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "32px"
  touch: "44px"
  action: "56px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "56px"
  field-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.box}"
    padding: "12px 16px"
    height: "52px"
  review-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.card}"
    padding: "12px"
  card-media:
    backgroundColor: "{colors.tint}"
    rounded: "{rounded.media}"
  letter-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.letter}"
    rounded: "{rounded.box}"
    width: "2.75rem"
    height: "3.5rem"
  letter-box-right:
    backgroundColor: "{colors.pass-bg}"
    textColor: "{colors.pass-ink}"
  letter-box-wrong:
    backgroundColor: "{colors.miss-bg}"
    textColor: "{colors.miss-ink}"
  verdict-pill-pass:
    backgroundColor: "{colors.pass-bg}"
    textColor: "{colors.pass-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 14px 6px 10px"
  verdict-pill-miss:
    backgroundColor: "{colors.miss-bg}"
    textColor: "{colors.miss-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 14px 6px 10px"
  level-badge:
    backgroundColor: "{colors.pastel}"
    textColor: "{colors.on-pastel}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  notice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: Flashcards

## Overview

**Creative North Star: "The Quiet Drill"**

One daily habit, rehearsed without noise. The image, the letter boxes and the verdict are the only things that matter on screen. The language is a Wealthsimple-inspired one: calm, confident, warm and premium, rather than a plain utility. Warm canvas, near-black ink, unhurried whitespace, large heavy headlines set tight, a solid black pill as the one primary action, and soft, generously rounded surfaces. Trust comes from restraint and clarity, not from decoration.

**Reference, not replica.** The look borrows that language (restraint, warmth, scale, pill actions, soft cards). It does not copy their name, logo, proprietary typefaces, illustrations or copy, and the app must not read as their product.

**Key Characteristics:**
- Warm off-white canvas with warm near-black ink; black is the action color, never a hue.
- Figtree (variable, self-hosted) in heavy, tightly tracked display sizes and relaxed body.
- Solid ink pill buttons, 56px tall, full width on phones.
- Large radii (28px cards, 20px media, 16px boxes) and generous padding.
- Neutrals plus soft tints that carry meaning (mint pass, blush miss), and one lilac pastel for the level badge.
- Plain-spoken, warm microcopy.
- One phone-width column (about 560px max), 44px minimum targets, 16px minimum input text, light and dark themes via `prefers-color-scheme`.

## Colors

**Strategy: Restrained.** Warm neutrals do the work, the action color is ink, and soft tints carry state.

### Neutral
- **Canvas** (#f6f3ee / #151413 night): page background and the sticky header.
- **Surface** (#ffffff / #211f1d): cards, inputs, notices, letter boxes.
- **Tint** (#efebe4 / #2a2724): the image well inside the review card, and the secondary button fill (ink at 8%).
- **Ink** (#1f1d1b / #f4f1ec): text, display type and the primary button fill. Text on it is Canvas (#f6f3ee / #1f1d1b).
- **Graphite** (#6b6560 / #a39d95): secondary text, labels and phonetics.
- **Line** (#e2ddd5 / #36322e): the rare hairline: empty letter boxes, inputs, the back button ring.

### Semantic
- **Pass** (bg #dff2e3 / #1c3a26, ink #17602d / #8fdca8): correct letters, the "Spelling correct" pill, the "Passed" verdict.
- **Miss** (bg #fbe4df / #44201c, ink #a3261b / #ffa397): wrong letters and their fixes, the "Spelling incorrect" pill, the accent hint, errors and the "Not passed" verdict.

### Pastel
- **Pastel** (#e7e0f6 / #3a3350, ink #3b2f63 / #d9ccff): the level badge only.

### Named Rules
**The Black-Action Rule.** The primary action is a solid ink pill. Hue is never what makes something clickable.

**The Tint-Not-Shout Rule.** Pass and miss use soft tinted surfaces plus text and a mark, never saturated floods, and never color alone.

**The One Pastel Rule.** At most one pastel is visible on a screen, as decoration and not as state.

## Typography

**Font:** Figtree Variable (self-hosted via `@fontsource-variable/figtree`), falling back to the system stack.

**Character:** A friendly, slightly geometric grotesque with confident weight. Heavy and tight for the moments that matter, relaxed for reading.

### Hierarchy
- **Display** (750, clamp(2.5rem, 12vw, 3.5rem), 1.05, -0.035em): the revealed correct word.
- **Title** (750, 2.25rem, 1.08, -0.035em, balanced): screen titles.
- **Headline** (700, 1.25rem, -0.02em): the "Passed / Not passed" verdict; 600 at 1.375rem for the "big" facts line.
- **Caption** (500, 1.1875rem, 1.35, balanced): the card description.
- **Body** (400, 16px, 1.5): everything else.
- **Label** (650, 0.875rem): badges, pills, field labels (600).
- **Button** (650, 1.0625rem).
- **Letter** (600, 1.5rem): the characters in the boxes.

### Named Rules
**The Big-and-Few Rule.** Few sizes with real contrast. A screen has one display moment.

**The No-Zoom Rule.** Anything the user types into is at least 16px.

## Layout

A single flex column, max-width 560px, centred, filling the viewport height. The sticky header sits on Canvas with no divider (44px back button plus padding). Main content has 20px gutters, 12px top padding, 32px bottom padding plus the safe-area inset, and 20px gaps between blocks. Insets are honored on all sides. There is no breakpoint: wide screens get empty margin around the same column. On short viewports (under 700px tall) the card image shrinks to 150px so the boxes and Check stay above the keyboard.

Letter boxes wrap and centre with a 10px row gap and 8px column gap. The pronunciation question and the result share one action slot, so the primary action stays in the same place through Check → Yes/No → Next card.

Spacing scale in use: 8, 12, 16, 20, 32.

## Elevation & Depth

Soft and mostly tonal. Surfaces separate from Canvas by tone and radius first. The one floating object is the review card, with a gentle diffuse shadow (`0 1px 2px rgb(31 29 27 / 0.05), 0 14px 32px -10px rgb(31 29 27 / 0.16)`; stronger black in night). Everything else rests flat on the canvas. Hairlines are used only where an element would otherwise vanish: empty letter boxes, inputs, the back button and notices. Press feedback is a scale to 0.98 on buttons and 0.94 on the back button, with 160ms exponential ease-out.

### Named Rules
**The One Floating Object Rule.** Only the image card casts a shadow.

## Shapes

Round and generous. Card 28px, image well 20px, letter boxes and inputs 16px. Buttons, badges and pills are full pills (999px); the back button is a circle. Imagery is clipped to its well's radius. Marks (check and cross) are drawn SVG at 16px, 2px round strokes.

## Components

### Buttons
- **Primary:** Ink fill, Canvas text, 56px high, pill, 0 28px padding, 650 weight. Disabled at 40% opacity. Press scales to 0.98.
- **Secondary:** Ink at 8% fill, Ink text, same size. Used for "No" and lower-emphasis actions.
- **Focus:** 3px ink outline at 45% alpha, offset 3px, shared by buttons, inputs, letter boxes and the back link.
- **Loading:** a 1em spinner (0.7s) inside the button.

### Inputs / Fields
Surface fill, 16px radius, 52px high, 1.5px Line ring (inset), 12px 16px padding. Label above in Graphite 600. Invalid: a 2px Miss-ink ring and the message below in Miss ink.

### Review Card (signature)
Surface, 28px radius, 12px padding, the one shadow. Inside: an image well (Tint, 20px radius, image contained, max about 26dvh or 260px) and a caption in 19px 500 weight, balanced. A missing image shows "Picture unavailable" in Graphite.

### Letter Boxes (signature)
2.75rem by 3.5rem, 16px radius, Surface fill, 1.5px Line ring, centred 1.5rem 600 character. A filled box takes an Ink ring. After checking: right boxes turn Pass tint; wrong boxes turn Miss tint with a 4px Miss-ink bar along the bottom and the correct letter in bold Miss ink beneath, so the miss survives greyscale. Disabled boxes keep full contrast. Each box's accessible label names the letter that belonged there.

### Reveal
A verdict pill (Pass or Miss tint, drawn mark, text), the correct word at Display size, phonetics in Graphite, and, when only accents were missed, a one-line hint in Miss ink ("Watch the accents: é, é"). It rises in over 420ms with exponential ease-out; reduced-motion users get no animation.

### Action Slot
One shared slot below the reveal. First a centred line asking "Say it out loud. Did you pronounce it correctly?" over a Yes (primary) and No (secondary) row, 12px gap. After saving, the same slot shows the verdict ("Passed" in Pass ink, "Not passed" in Miss ink, with a mark), a muted message, and a full-width Next card (or Finish) button. For 420ms after the result appears the button ignores taps, so a stray second tap on Yes/No cannot skip the card.

### Level Badge and Notices
The level badge is a Pastel pill with 650-weight label. Notices are Surface cards, 28px radius, 20px padding, a 1px Line ring, with a 22px ink-accent checkbox for the catch-up skip.

### Navigation
A 44px circular back button (Surface fill, Line ring, drawn chevron) at the left of a sticky Canvas header; the title is 1.0625rem 650.

## Do's and Don'ts

### Do:
- **Do** let whitespace and scale do the work: on the review screen, the image, the letter boxes and one primary action.
- **Do** make the primary button a solid ink pill and keep one primary action per screen.
- **Do** pair every tint with text and a mark (bar, correct letter, drawn icon) so state survives greyscale.
- **Do** keep copy plain, warm and direct: say what happened and what to do next.
- **Do** keep 44px touch targets, 16px inputs, safe-area insets and `prefers-reduced-motion` support, in both themes, and define every new color for both.

### Don't:
- **Don't** copy Wealthsimple's logo, name, proprietary typefaces, illustrations or copy.
- **Don't** reintroduce a saturated blue (or any hue) as the brand accent.
- **Don't** add gamification noise (confetti, streak fireworks, loud badges).
- **Don't** add shadows beyond the review card, or hard 1px borders as the default container treatment.
- **Don't** use text glyphs (✓ ✗ ←) as icons; draw them.
- **Don't** reveal the target word before submission or soften strict-spelling presentation for looks (see PRODUCT.md).
