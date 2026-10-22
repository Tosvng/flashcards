import { z } from 'zod';

const timeZone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, 'Unknown IANA time zone');

export const registerBody = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  timeZone: timeZone.optional(),
});

export const loginBody = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
});

export const startSessionBody = z.object({
  skipNewCards: z.boolean().default(false),
});

export const reviewBody = z.object({
  flashcardId: z.number().int().positive(),
  spellingInput: z.string().max(200),
  pronunciationCorrect: z.boolean(),
});

export const revealBody = z.object({
  flashcardId: z.number().int().positive(),
  spellingInput: z.string().max(200),
});

const text = z.string().trim().min(1).max(500);

export const createFlashcardBody = z.object({
  frenchText: z.string().trim().min(1).max(100),
  englishTranslation: text,
  photoUrl: z.url().max(2000),
  description: text,
  phoneticSpelling: z.string().trim().min(1).max(200).nullable().default(null),
});

export const idParams = z.object({
  id: z.coerce.number().int().positive(),
});
