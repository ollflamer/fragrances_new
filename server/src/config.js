import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolveAdminPasswordHash } from './admin-password.js';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export const rootDir = fileURLToPath(new URL('../../', import.meta.url));
export const config = {
  production: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3001),
  siteUrl: (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@fragrances.local',
  adminPasswordHash: resolveAdminPasswordHash(process.env),
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  trustProxy: process.env.TRUST_PROXY === '1',
  contacts: {
    phone: process.env.CONTACT_PHONE || '',
    email: process.env.CONTACT_EMAIL || '',
    address: process.env.CONTACT_ADDRESS || '',
    telegram: process.env.CONTACT_TELEGRAM || '',
  },
};
if (config.production && (!config.adminPasswordHash || !process.env.SITE_URL || !config.siteUrl.startsWith('https://'))) {
  throw new Error('Production requires ADMIN_PASSWORD or ADMIN_PASSWORD_HASH and an HTTPS SITE_URL.');
}
