import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { resolveAdminPasswordHash } from '../src/admin-password.js';

test('a quoted plain password from .env is hashed and authenticates without losing special characters', async () => {
  const password = 'test # password $ with spaces';
  const env = dotenv.parse(`ADMIN_PASSWORD="${password}"\nADMIN_PASSWORD_HASH=\n`);
  const hash = resolveAdminPasswordHash(env);
  assert.equal(await bcrypt.compare(password, hash), true);
  assert.equal(await bcrypt.compare('incorrect-password', hash), false);
});

test('an existing bcrypt hash is preserved and takes precedence over a plain password', async () => {
  const hash = await bcrypt.hash('hashed-password', 4);
  const env = dotenv.parse(`ADMIN_PASSWORD=other-password\nADMIN_PASSWORD_HASH='${hash}'\n`);
  assert.equal(resolveAdminPasswordHash(env), hash);
  assert.equal(await bcrypt.compare('hashed-password', resolveAdminPasswordHash(env)), true);
});

test('plain text in ADMIN_PASSWORD_HASH produces an actionable configuration error', () => {
  assert.throws(() => resolveAdminPasswordHash({ ADMIN_PASSWORD_HASH: 'plain-password' }), /For a plain password, use ADMIN_PASSWORD/);
  assert.throws(() => resolveAdminPasswordHash({ ADMIN_PASSWORD_HASH: '$2b$12$invalid' }), /must contain a bcrypt hash/);
});

test('unset credentials keep admin login disabled and bcrypt byte limits are enforced', () => {
  assert.equal(resolveAdminPasswordHash({}), '');
  assert.equal(resolveAdminPasswordHash({ ADMIN_PASSWORD: '', ADMIN_PASSWORD_HASH: '' }), '');
  assert.throws(() => resolveAdminPasswordHash({ ADMIN_PASSWORD: 'я'.repeat(37) }), /at most 72 UTF-8 bytes/);
});
