import { prisma } from './db.js';
import { config } from './config.js';
import { retryRequests } from './telegram.js';
try {
  if (!config.telegramToken || !config.telegramChatId) throw new Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.');
  await retryRequests(prisma, config);
  console.log('Pending notifications processed.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
