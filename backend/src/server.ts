import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { buildContainer } from './container.js';

const config = loadConfig();
const { db, controllers, tokens } = buildContainer(config);
const server = createApp(controllers, tokens, { webDir: config.webDir }).listen(config.port, () => {
  console.log(`Flashcards API listening on :${config.port}${config.webDir ? ` (serving PWA from ${config.webDir})` : ''}`);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
