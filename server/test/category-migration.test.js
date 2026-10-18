import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { applyMigration } from './migrations.js';

test('category migration preserves existing products, images, requests and legacy categories', async () => {
  const directory = await mkdtemp(fileURLToPath(new URL('../../.cache/category-migration-', import.meta.url)));
  const db = new PrismaClient({ datasources: { db: { url: `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}` } } });
  try {
    await applyMigration(db, '20261019000000_init');
    const product = await db.product.create({ data: {
      slug: 'existing-product', category: 'legacy-category', nameRu: 'Продукт', nameUz: 'Mahsulot', nameEn: 'Product',
      descriptionRu: 'Существующий продукт', descriptionUz: 'Mavjud mahsulot', descriptionEn: 'Existing product',
      images: { create: { path: '/images/existing.webp', alt: 'Existing image' } },
    } });
    const lead = await db.sampleRequest.create({ data: { name: 'Existing customer', contact: 'customer@example.test', productId: product.id, productName: product.nameRu } });
    await applyMigration(db, '20261019010000_categories');
    const preserved = await db.product.findUnique({ where: { id: product.id }, include: { images: true, categoryInfo: true, requests: true } });
    assert.equal(preserved.images[0].path, '/images/existing.webp');
    assert.equal(preserved.requests[0].id, lead.id);
    assert.equal(preserved.categoryInfo.slug, 'legacy-category');
    assert.equal(await db.category.count(), 5);
    assert.deepEqual(await db.$queryRawUnsafe('PRAGMA foreign_key_check'), []);
  } finally {
    await db.$disconnect();
    for (const suffix of ['', '-journal', '-wal', '-shm']) await unlink(path.join(directory, `test.db${suffix}`)).catch(() => {});
    await rmdir(directory);
  }
});
