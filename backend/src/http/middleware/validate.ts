import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../../domain/errors.js';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
}

/** Parses and replaces req.body / req.params with validated values; 400 on failure. */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    for (const part of ['body', 'params'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const detail = result.error.issues.map((i) => `${i.path.join('.') || part}: ${i.message}`).join('; ');
        throw new ValidationError(detail);
      }
      (req as unknown as Record<string, unknown>)[part] = result.data;
    }
    next();
  };
}
