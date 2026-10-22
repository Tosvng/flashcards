import express, { type Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

const NO_CACHE = 'no-cache';
/** Files the browser must revalidate every time, or a new deploy (or service worker) would never be seen. */
const REVALIDATE = new Set(['index.html', 'sw.js', 'manifest.webmanifest']);

/**
 * Serves the built PWA (Vite build) from `webDir`:
 *  - hashed bundles under /assets (Vite content-hashes every filename): cached for a year (immutable),
 *  - index.html, sw.js, manifest: always revalidated,
 *  - client-side routes (last segment has no dot, HTML requested): fall back to index.html,
 *  - /api/* and anything else that is missing: falls through to the normal 404, so a mistyped asset is never answered with HTML.
 */
export function webApp(webDir: string): Router {
  const root = path.resolve(webDir);
  const index = path.join(root, 'index.html');
  if (!fs.existsSync(index)) {
    throw new Error(`WEB_DIR ${root} has no index.html. Build the PWA first (pnpm build in web/).`);
  }

  const router = express.Router();

  router.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  router.use(
    express.static(root, {
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res, filePath) => {
        const rel = path.relative(root, filePath).split(path.sep).join('/');
        if (REVALIDATE.has(rel)) res.setHeader('Cache-Control', NO_CACHE);
        else if (rel.startsWith('assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else res.setHeader('Cache-Control', 'public, max-age=86400');
      },
    }),
  );

  router.use((req, res, next) => {
    // /api/* misses must stay a JSON 404, never the app shell.
    const isApi = req.path === '/api' || req.path.startsWith('/api/');
    const isPageRequest = !isApi && (req.method === 'GET' || req.method === 'HEAD') && !path.basename(req.path).includes('.') && req.accepts('html') === 'html';
    if (!isPageRequest) return next();
    res.setHeader('Cache-Control', NO_CACHE);
    res.sendFile(index);
  });

  return router;
}
