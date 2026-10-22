/**
 * Where the API lives. The production PWA is served by the backend itself, so the default is same-origin
 * (relative URLs); in development Vite proxies /api to the backend (see vite.config.ts), also same-origin.
 * Set VITE_API_URL only to point a build at a different host.
 */
export const apiBaseUrl = (): string => import.meta.env.VITE_API_URL ?? '';
