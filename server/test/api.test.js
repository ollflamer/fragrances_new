import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, access, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { deliverRequest } from '../src/telegram.js';
import { applyMigrations } from './migrations.js';
// Avoid libvips retaining file handles across unlink assertions on Windows.
sharp.cache(false);

const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = 'http://localhost:5173';
const password = 'integration-test-password';
let db, directory, app, agent, csrfToken, productId;
const payload = {
  slug: 'test-bergamot', category: 'perfumery', nameRu: 'Тестовый бергамот', nameUz: 'Test bergamot', nameEn: 'Test bergamot',
  descriptionRu: 'Тестовое описание продукта.', descriptionUz: 'Mahsulot uchun test tavsifi.', descriptionEn: 'A test fragrance description.',
  notesRu: 'Бергамот · Кедр', notesUz: 'Bergamot · Kedr', notesEn: 'Bergamot · Cedar', isFeatured: true, isDemo: true,
};
const post = (url, body) => agent.post(url).set('Origin', origin).set('x-csrf-token', csrfToken || '').send(body);
before(async () => {
  directory = await mkdtemp(path.join(root, '.cache/api-test-'));
  db = new PrismaClient({ datasources: { db: { url: `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}` } } });
  await applyMigrations(db);
  app = createApp({ db, uploadDir: path.join(directory, 'uploads'), config: {
    production: false, trustProxy: false, siteUrl: origin, adminEmail: 'admin@example.test', adminPasswordHash: await bcrypt.hash(password, 4), telegramToken: '', telegramChatId: '', contacts: {},
  } });
  agent = request.agent(app);
});
after(async () => {
  await db.$disconnect();
  // Only known files inside the isolated test directory are removed.
  for (const suffix of ['', '-journal', '-wal', '-shm']) await unlink(path.join(directory, `test.db${suffix}`)).catch(() => {});
  await rmdir(path.join(directory, 'uploads')).catch(() => {});
  await rmdir(directory);
});

test('public API and SEO endpoints serve data without exposing session information', async () => {
  assert.equal((await request(app).get('/api/health')).body.status, 'ok');
  assert.deepEqual((await request(app).get('/api/products')).body, []);
  assert.equal((await request(app).get('/api/auth/session')).status, 401);
  assert.equal((await request(app).get('/api/admin/requests')).status, 401);
  assert.equal((await request(app).post('/api/admin/categories').set('Origin', origin).send({})).status, 401);
  assert.equal((await request(app).get('/api/categories')).body.length, 4);
  const robots = await request(app).get('/robots.txt');
  assert.match(robots.text, /Disallow: \/admin/);
  const sitemap = await request(app).get('/sitemap.xml');
  assert.match(sitemap.text, /http:\/\/localhost:5173\/collection/);
  assert.doesNotMatch(sitemap.text, /\/admin/);
  assert.equal((await request(app).get('/api/missing')).status, 404);
});
test('invalid and cross-origin requests are rejected before persistence', async () => {
  assert.equal((await request(app).post('/api/requests').set('Origin', 'https://attacker.test').send({})).status, 403);
  for (const body of [
    { name: 'A', contact: 'test@example.test', consent: true },
    { name: 'Tester', contact: 'bad@email', consent: true },
    { name: 'Tester', contact: '+998 90 123 45 67', consent: false },
    { name: 'Tester', contact: '+998 90 123 45 67', consent: true, website: 'spam' },
    { name: 'Tester', contact: 'test@example.test', consent: true, productId: 'missing-product' },
  ]) assert.equal((await request(app).post('/api/requests').set('Origin', origin).send(body)).status, 400);
  assert.equal(await db.sampleRequest.count(), 0);
});
test('login uses an HttpOnly session cookie and admin mutations require CSRF', async () => {
  const wrong = await post('/api/auth/login', { email: 'admin@example.test', password: 'wrong' });
  assert.equal(wrong.status, 401);
  const login = await post('/api/auth/login', { email: 'admin@example.test', password });
  assert.equal(login.status, 200);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/);
  assert.match(login.headers['set-cookie'][0], /SameSite=Strict/);
  csrfToken = login.body.csrfToken;
  assert.equal((await agent.post('/api/admin/products').set('Origin', origin).send(payload)).status, 403);
  assert.equal((await agent.post('/api/admin/products').set('Origin', origin).set('x-csrf-token', 'é'.repeat(64)).send(payload)).status, 403);
  const session = await agent.get('/api/auth/session');
  assert.equal(session.body.csrfToken, csrfToken);
});
test('product creation, translation, filtering, duplicate slugs and updates work', async () => {
  const created = await post('/api/admin/products', payload);
  assert.equal(created.status, 201);
  productId = created.body.id;
  assert.equal((await post('/api/admin/products', payload)).status, 409);
  const featured = await request(app).get('/api/products?featured=true');
  assert.equal(featured.body[0].nameUz, payload.nameUz);
  assert.equal((await request(app).get('/api/products?category=food')).body.length, 0);
  const updated = await agent.put(`/api/admin/products/${productId}`).set('Origin', origin).set('x-csrf-token', csrfToken).send({ ...payload, nameEn: 'Updated bergamot' });
  assert.equal(updated.status, 200);
  assert.equal((await request(app).get('/api/products/test-bergamot')).body.nameEn, 'Updated bergamot');
});
test('categories support translated CRUD, custom product assignments and safe slug changes', async () => {
  const category = { slug: 'essential-oils', nameRu: 'Эфирные масла', nameUz: 'Efir moylari', nameEn: 'Essential oils' };
  assert.equal((await agent.post('/api/admin/categories').set('Origin', origin).send(category)).status, 403);
  assert.equal((await post('/api/admin/categories', { ...category, slug: 'all' })).status, 400);
  assert.equal((await post('/api/admin/categories', { ...category, nameUz: '' })).status, 400);
  const created = await post('/api/admin/categories', category);
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal((await post('/api/admin/categories', category)).status, 409);
  const setProductCategory = (value) => agent.put(`/api/admin/products/${productId}`).set('Origin', origin).set('x-csrf-token', csrfToken).send({ ...payload, category: value });
  assert.equal((await setProductCategory('does-not-exist')).status, 400);
  assert.equal((await setProductCategory(category.slug)).status, 200);
  const remove = () => agent.delete(`/api/admin/categories/${id}`).set('Origin', origin).set('x-csrf-token', csrfToken);
  assert.equal((await remove()).body.error, 'CATEGORY_IN_USE');
  const updated = await agent.put(`/api/admin/categories/${id}`).set('Origin', origin).set('x-csrf-token', csrfToken).send({ ...category, slug: 'natural-oils', nameEn: 'Natural essential oils' });
  assert.equal(updated.status, 200);
  const products = (await request(app).get('/api/products?category=natural-oils')).body;
  assert.equal(products.length, 1);
  assert.equal(products[0].id, productId);
  assert.equal(products[0].categoryInfo.nameEn, 'Natural essential oils');
  assert.equal((await request(app).get('/api/products/test-bergamot')).body.categoryInfo.nameUz, category.nameUz);
  const publicCategory = (await request(app).get('/api/categories')).body.find((row) => row.id === id);
  assert.equal(publicCategory._count.products, 1);
  assert.equal((await remove()).status, 409);
  assert.equal((await setProductCategory('perfumery')).status, 200);
  assert.equal((await remove()).status, 204);
  assert.equal((await remove()).status, 404);
  assert.equal((await post('/api/admin/products', { ...payload, slug: 'missing-category', category: 'natural-oils' })).body.error, 'INVALID_CATEGORY');
});

test('image upload validates bytes and safely transcodes actual images', async () => {
  const invalid = await agent.post(`/api/admin/products/${productId}/images`).set('Origin', origin).set('x-csrf-token', csrfToken).attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'fake.jpg', contentType: 'image/jpeg' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, 'INVALID_IMAGE');
  const buffer = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#c2a16d' } }).png().toBuffer();
  const uploaded = await agent.post(`/api/admin/products/${productId}/images`).set('Origin', origin).set('x-csrf-token', csrfToken).attach('image', buffer, 'sample.png');
  assert.equal(uploaded.status, 201);
  assert.match(uploaded.body.path, /^\/images\/uploads\/[a-f0-9]{32}\.webp$/);
  const imagePath = path.join(directory, 'uploads', path.basename(uploaded.body.path));
  assert.equal((await sharp(imagePath).metadata()).format, 'webp');
  const removed = await agent.delete(`/api/admin/images/${uploaded.body.id}`).set('Origin', origin).set('x-csrf-token', csrfToken);
  assert.equal(removed.status, 204);
  await assert.rejects(access(imagePath));
});
test('sample requests persist with consent and product snapshot when Telegram is unconfigured', async () => {
  const result = await request(app).post('/api/requests').set('Origin', origin).send({ name: 'Test Client', contact: 'client@example.test', company: 'Factory', productId, locale: 'uz', consent: true });
  assert.equal(result.status, 201);
  assert.equal(result.body.saved, true);
  const stored = await db.sampleRequest.findUnique({ where: { id: result.body.id } });
  assert.equal(stored.telegramStatus, 'pending');
  assert.equal(stored.productName, payload.nameRu);
  assert.ok(stored.consentAt);
  assert.equal((await agent.get('/api/admin/requests')).body.total, 1);
});
test('Telegram failures retain leads and notifications can be retried without resending completed ones', async () => {
  const row = await db.sampleRequest.findFirst();
  const config = { telegramToken: 'test-not-a-real-token', telegramChatId: 'test-chat' };
  const failed = await deliverRequest(db, config, row.id, async () => { throw new Error('Network unavailable'); });
  assert.equal(failed, 'failed');
  let calls = 0;
  const success = await deliverRequest(db, config, row.id, async (url, options) => {
    calls++;
    assert.match(JSON.parse(options.body).text, /Test Client/);
    return { ok: true, json: async () => ({ ok: true }) };
  });
  assert.equal(success, 'sent');
  assert.equal(await deliverRequest(db, config, row.id, async () => { calls++; }), 'skipped');
  assert.equal(calls, 1);
  assert.equal((await db.sampleRequest.findUnique({ where: { id: row.id } })).telegramAttempts, 2);
});
test('deletion preserves lead history and logout invalidates the session', async () => {
  assert.equal((await agent.delete(`/api/admin/products/${productId}`).set('Origin', origin).set('x-csrf-token', csrfToken)).status, 204);
  assert.equal((await request(app).get('/api/products/test-bergamot')).status, 404);
  const row = await db.sampleRequest.findFirst();
  assert.equal(row.productId, null);
  assert.equal(row.productName, payload.nameRu);
  assert.equal((await post('/api/auth/logout')).status, 204);
  assert.equal((await agent.get('/api/admin/requests')).status, 401);
});
