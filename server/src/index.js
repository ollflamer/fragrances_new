import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { retryRequests } from './telegram.js';

await prisma.$connect();
// This SQLite deployment uses a single API process. Recover interrupted notifications at startup.
await prisma.sampleRequest.updateMany({ where: { telegramStatus: 'sending' }, data: { telegramStatus: 'pending' } });
const app = createApp();
const server = app.listen(config.port, '127.0.0.1', () => console.log(`Fragrances API: http://127.0.0.1:${config.port}`));
let retrying = false;
const retry = async () => {
  if (retrying) return;
  retrying = true;
  try { await retryRequests(prisma, config); }
  catch { console.error('Notification retry deferred.'); }
  finally { retrying = false; }
};
const timer = setInterval(retry, 60_000);
timer.unref();
const shutdown = () => {
  clearInterval(timer);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
