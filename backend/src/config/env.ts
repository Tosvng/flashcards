export interface Config {
  port: number;
  dbPath: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  /** Directory of the built PWA (web/dist). When set, the backend serves it next to the API. */
  webDir: string | null;
}

const DEV_SECRET = 'dev-only-secret-change-me-dev-only-secret';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET ?? (production ? '' : DEV_SECRET);
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters');
  }
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid PORT: ${env.PORT}`);

  return Object.freeze({
    port,
    dbPath: env.DB_PATH ?? './flashcards.db',
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? '30d',
    webDir: env.WEB_DIR?.trim() || null,
  });
}
