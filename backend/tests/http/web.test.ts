import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { FakePasswordHasher, FixedClock } from '../fakes/index.js';

let dir: string;
const write = (rel: string, content: string) => {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-dist-'));
  write('index.html', '<!doctype html><title>Flashcards</title><div id="root"></div>');
  write('sw.js', 'self.addEventListener("fetch",()=>{});');
  write('manifest.webmanifest', '{"name":"Flashcards"}');
  write('icon-192.png', 'png');
  write('assets/index-abc123.js', 'console.log("app")');
  write('.secret', 'top secret');
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const containerFor = () => buildContainer(loadConfig({ DB_PATH: ':memory:' }), { clock: new FixedClock('2026-01-01'), hasher: new FakePasswordHasher() });

function appWith(options: Parameters<typeof createApp>[2]) {
  const container = containerFor();
  return createApp(container.controllers, container.tokens, options);
}

describe('serving the PWA', () => {
  const app = () => appWith({ webDir: dir });

  it('serves the app shell at / with revalidation', async () => {
    const res = await request(app()).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('falls back to the shell for client-side routes (deep links / reloads)', async () => {
    const res = await request(app()).get('/review').set('Accept', 'text/html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
    expect((await request(app()).get('/some/deep/route').set('Accept', 'text/html')).status).toBe(200);
  });

  it('serves the manifest with the right type, and always revalidates manifest + service worker', async () => {
    const manifest = await request(app()).get('/manifest.webmanifest');
    expect(manifest.headers['content-type']).toMatch(/application\/manifest\+json/);
    expect(manifest.headers['cache-control']).toBe('no-cache');
    const sw = await request(app()).get('/sw.js');
    expect(sw.status).toBe(200);
    expect(sw.headers['content-type']).toMatch(/javascript/);
    expect(sw.headers['cache-control']).toBe('no-cache');
  });

  it('caches hashed bundles for a year and icons for a day', async () => {
    const bundle = await request(app()).get('/assets/index-abc123.js');
    expect(bundle.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect((await request(app()).get('/icon-192.png')).headers['cache-control']).toBe('public, max-age=86400');
  });

  it('does not answer missing files with HTML (a mistyped asset is a 404)', async () => {
    expect((await request(app()).get('/assets/missing.js')).status).toBe(404);
    expect((await request(app()).get('/missing.png')).status).toBe(404);
  });

  it('never answers /api/* with the app shell: JSON 401 when signed out, JSON 404 when signed in', async () => {
    const container = containerFor();
    const both = createApp(container.controllers, container.tokens, { webDir: dir });
    const auth = { Authorization: `Bearer ${container.tokens.issue(1)}` };
    for (const p of ['/api/nope', '/api/session/nope']) {
      const signedOut = await request(both).get(p); // Accept: */* like fetch/curl
      expect(signedOut.status).toBe(401);
      expect(signedOut.headers['content-type']).toMatch(/json/);
      const signedIn = await request(both).get(p).set(auth);
      expect(signedIn.status).toBe(404);
      expect(signedIn.body.error.code).toBe('NOT_FOUND');
    }
    const bare = await request(both).get('/api');
    expect(bare.status).toBe(401);
    expect(bare.headers['content-type']).toMatch(/json/);
  });

  it('still serves the API and /health alongside the PWA', async () => {
    expect((await request(app()).get('/health')).body).toEqual({ status: 'ok' });
    expect((await request(app()).get('/api/session/today')).status).toBe(401);
  });

  it('refuses dotfiles and directory traversal', async () => {
    expect((await request(app()).get('/.secret')).status).toBe(404);
    const traversal = await request(app()).get('/..%2F..%2Fetc%2Fpasswd');
    expect([400, 404]).toContain(traversal.status);
    expect(traversal.text).not.toContain('root:');
  });

  it('adds basic security headers', async () => {
    const res = await request(app()).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('same-origin');
  });

  it('serves nothing when no web dir is configured', async () => {
    expect((await request(appWith({})).get('/')).status).toBe(404);
  });

  it('fails fast when WEB_DIR has no index.html', () => {
    expect(() => appWith({ webDir: os.tmpdir() + '/definitely-not-a-build' })).toThrow(/no index\.html/);
  });
});

describe('API responses are never cacheable', () => {
  it('sends Cache-Control: no-store on success, validation, auth and not-found responses', async () => {
    const container = containerFor();
    const app = createApp(container.controllers, container.tokens, { webDir: dir });
    const auth = { Authorization: `Bearer ${container.tokens.issue(1)}` };
    const responses = [
      await request(app).post('/api/auth/register').send({ email: 'a@b.co', password: 'password123' }), // 201
      await request(app).post('/api/auth/register').send({}), // 400
      await request(app).get('/api/session/today'), // 401
      await request(app).get('/api/flashcards/999').set(auth), // 404
    ];
    expect(responses.map((r) => r.status)).toEqual([201, 400, 401, 404]);
    for (const res of responses) expect(res.headers['cache-control']).toBe('no-store');
  });

  it('does not change static asset caching', async () => {
    const app = appWith({ webDir: dir });
    expect((await request(app).get('/icon-192.png')).headers['cache-control']).toBe('public, max-age=86400');
  });
});

describe('configuration', () => {
  it('reads WEB_DIR from the environment (empty means off)', () => {
    expect(loadConfig({ WEB_DIR: ' ../web/dist ' }).webDir).toBe('../web/dist');
    expect(loadConfig({}).webDir).toBeNull();
    expect(loadConfig({ WEB_DIR: '  ' }).webDir).toBeNull();
  });
});
