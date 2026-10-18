import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import sharp from 'sharp';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { ZodError } from 'zod';
import { rootDir, config as defaultConfig } from './config.js';
import { prisma } from './db.js';
import { categorySchema, productSchema, requestSchema, loginSchema } from './validation.js';
import { deliverRequest } from './telegram.js';

const cookieName = 'fc_session';
const digest = (value) => createHash('sha256').update(value).digest('hex');
const xmlEscape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

export function createApp({ db = prisma, config = defaultConfig, sendNotification = deliverRequest, uploadDir = path.join(rootDir, 'images/uploads') } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: config.production ? {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"],
      },
    } : false,
    strictTransportSecurity: config.production,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 200, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'RATE_LIMIT' } }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('origin') !== new URL(config.siteUrl).origin) {
      return res.status(403).json({ error: 'ORIGIN_REJECTED' });
    }
    next();
  });
  const session = async (req, res, next) => {
    const token = req.cookies[cookieName];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const entry = await db.adminSession.findUnique({ where: { id: digest(token) } });
    if (!entry || entry.expiresAt < new Date()) return res.status(401).json({ error: 'UNAUTHORIZED' });
    req.session = entry;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const csrf = req.get('x-csrf-token') || '';
      if (Buffer.byteLength(csrf) !== Buffer.byteLength(entry.csrfToken) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(entry.csrfToken))) {
        return res.status(403).json({ error: 'CSRF_REJECTED' });
      }
    }
    next();
  };
  const removeUpload = async (imagePath) => {
    if (!/^\/images\/uploads\/[a-f0-9]{32}\.webp$/.test(imagePath)) return;
    await unlink(path.join(uploadDir, path.basename(imagePath))).catch((error) => {
      if (error.code !== 'ENOENT') console.error('Could not remove an unused image.');
    });
  };

  app.get('/api/health', async (req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });
  app.get('/api/config', (req, res) => res.json({ contacts: config.contacts, siteUrl: config.siteUrl }));
  app.get('/api/categories', async (req, res) => {
    res.json(await db.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }));
  });
  app.get('/api/products', async (req, res) => {
    const where = {};
    if (req.query.featured === 'true') where.isFeatured = true;
    if (typeof req.query.category === 'string') where.category = req.query.category;
    const products = await db.product.findMany({ where, include: { images: true, categoryInfo: true }, orderBy: { createdAt: 'asc' }, take: 500 });
    res.json(products);
  });
  app.get('/api/products/:slug', async (req, res) => {
    const product = await db.product.findUnique({ where: { slug: req.params.slug }, include: { images: true, categoryInfo: true } });
    if (!product) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(product);
  });
  app.post('/api/requests', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'RATE_LIMIT' } }), async (req, res) => {
    const { consent, website, ...data } = requestSchema.parse(req.body);
    let product;
    if (data.productId) {
      product = await db.product.findUnique({ where: { id: data.productId } });
      if (!product) return res.status(400).json({ error: 'INVALID_PRODUCT' });
    }
    const row = await db.sampleRequest.create({ data: { ...data, productId: product?.id || null, productName: product?.nameRu || '' } });
    // Storage succeeds independently from delivery, so no lead is lost when Telegram is unavailable.
    await sendNotification(db, config, row.id).catch(() => console.error('Notification deferred for retry.'));
    res.status(201).json({ id: row.id, saved: true });
  });

  app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'RATE_LIMIT' } }), async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    if (!config.adminPasswordHash) return res.status(503).json({ error: 'ADMIN_NOT_CONFIGURED' });
    const valid = await bcrypt.compare(password, config.adminPasswordHash);
    if (!valid || email.toLowerCase() !== config.adminEmail.toLowerCase()) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    if (req.cookies[cookieName]) await db.adminSession.deleteMany({ where: { id: digest(req.cookies[cookieName]) } });
    await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const token = randomBytes(32).toString('hex');
    const csrfToken = randomBytes(32).toString('hex');
    await db.adminSession.create({ data: { id: digest(token), csrfToken, expiresAt: new Date(Date.now() + 8 * 3600_000) } });
    res.cookie(cookieName, token, { httpOnly: true, secure: config.production, sameSite: 'strict', maxAge: 8 * 3600_000, path: '/' });
    res.json({ email: config.adminEmail, csrfToken });
  });
  app.get('/api/auth/session', session, (req, res) => res.json({ email: config.adminEmail, csrfToken: req.session.csrfToken }));
  app.post('/api/auth/logout', session, async (req, res) => {
    await db.adminSession.deleteMany({ where: { id: req.session.id } });
    res.clearCookie(cookieName, { path: '/', httpOnly: true, secure: config.production, sameSite: 'strict' });
    res.sendStatus(204);
  });
  app.use('/api/admin', session);
  app.post('/api/admin/categories', async (req, res) => {
    const data = categorySchema.parse(req.body);
    res.status(201).json(await db.category.create({ data }));
  });
  app.put('/api/admin/categories/:id', async (req, res) => {
    const data = categorySchema.parse(req.body);
    // The foreign key cascades slug changes to every associated product atomically.
    res.json(await db.category.update({ where: { id: req.params.id }, data }));
  });
  app.delete('/api/admin/categories/:id', async (req, res) => {
    const row = await db.category.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true } } } });
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    if (row._count.products) return res.status(409).json({ error: 'CATEGORY_IN_USE' });
    // RESTRICT also protects against a product being added between the check and delete.
    await db.category.delete({ where: { id: row.id } });
    res.sendStatus(204);
  });
  app.post('/api/admin/products', async (req, res) => {
    const data = productSchema.parse(req.body);
    if (!await db.category.findUnique({ where: { slug: data.category } })) return res.status(400).json({ error: 'INVALID_CATEGORY' });
    res.status(201).json(await db.product.create({ data, include: { images: true, categoryInfo: true } }));
  });
  app.put('/api/admin/products/:id', async (req, res) => {
    const data = productSchema.parse(req.body);
    if (!await db.category.findUnique({ where: { slug: data.category } })) return res.status(400).json({ error: 'INVALID_CATEGORY' });
    res.json(await db.product.update({ where: { id: req.params.id }, data, include: { images: true, categoryInfo: true } }));
  });
  app.delete('/api/admin/products/:id', async (req, res) => {
    const row = await db.product.delete({ where: { id: req.params.id }, include: { images: true } });
    await Promise.all(row.images.map((image) => removeUpload(image.path)));
    res.sendStatus(204);
  });
  app.post('/api/admin/products/:id/images', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
    const product = await db.product.findUnique({ where: { id: req.params.id }, include: { images: true } });
    if (!product) return res.status(404).json({ error: 'NOT_FOUND' });
    if (product.images.length >= 6) return res.status(400).json({ error: 'IMAGE_LIMIT' });
    let buffer;
    try {
      const processor = sharp(req.file.buffer, { limitInputPixels: 25_000_000, animated: false });
      const info = await processor.metadata();
      if (!['jpeg', 'png', 'webp'].includes(info.format)) throw new Error('Unsupported image');
      buffer = await processor.rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { return res.status(400).json({ error: 'INVALID_IMAGE' }); }
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomBytes(16).toString('hex')}.webp`;
    const imagePath = `/images/uploads/${filename}`;
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path.join(uploadDir, filename), buffer);
    try {
      const image = await db.productImage.create({ data: { path: imagePath, alt: product.nameRu, productId: product.id } });
      res.status(201).json(image);
    } catch (error) { await removeUpload(imagePath); throw error; }
  });
  app.delete('/api/admin/images/:id', async (req, res) => {
    const row = await db.productImage.delete({ where: { id: req.params.id } });
    await removeUpload(row.path);
    res.sendStatus(204);
  });
  app.get('/api/admin/requests', async (req, res) => {
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const [items, total] = await Promise.all([
      db.sampleRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 25, skip: (page - 1) * 25 }), db.sampleRequest.count(),
    ]);
    res.json({ items, total, page });
  });
  app.post('/api/admin/requests/:id/retry', async (req, res) => {
    const row = await db.sampleRequest.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ status: await sendNotification(db, config, row.id) });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

  app.get('/robots.txt', (req, res) => res.type('text').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${config.siteUrl}/sitemap.xml\n`));
  app.get('/sitemap.xml', async (req, res) => {
    const products = await db.product.findMany({ select: { slug: true, updatedAt: true } });
    const pages = ['/', '/about', '/applications', '/collection', '/request', '/contacts', '/privacy'].map((url) => ({ url }));
    products.forEach((product) => pages.push({ url: `/collection/${product.slug}`, modified: product.updatedAt.toISOString() }));
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `<url><loc>${xmlEscape(config.siteUrl + page.url)}</loc>${page.modified ? `<lastmod>${page.modified}</lastmod>` : ''}</url>`).join('')}</urlset>`);
  });
  app.get('/hero-bg.jpg', (req, res) => res.sendFile(path.join(rootDir, 'images/hero-bg.jpg')));
  app.use('/images', express.static(path.join(rootDir, 'images'), { maxAge: '1d', index: false, dotfiles: 'deny' }));
  const dist = path.join(rootDir, 'client/dist');
  if (existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('/{*path}', (req, res, next) => {
      if (path.extname(req.path)) return next();
      const knownPage = ['/', '/about', '/applications', '/collection', '/request', '/contacts', '/privacy'].includes(req.path)
        || /^\/collection\/[a-z0-9-]+\/?$/.test(req.path) || /^\/admin(?:\/.*)?$/.test(req.path);
      res.status(knownPage ? 200 : 404).set('Cache-Control', 'no-cache').sendFile(path.join(dist, 'index.html'));
    });
  }
  app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  app.use((error, req, res, next) => {
    if (error instanceof ZodError) return res.status(400).json({ error: 'VALIDATION_ERROR', fields: error.issues.map((issue) => issue.path.join('.')) });
    if (error.code === 'P2002') return res.status(409).json({ error: 'SLUG_EXISTS' });
    if (error.code === 'P2003') return res.status(409).json({ error: req.path.startsWith('/api/admin/categories/') ? 'CATEGORY_IN_USE' : 'INVALID_CATEGORY' });
    if (error.code === 'P2025') return res.status(404).json({ error: 'NOT_FOUND' });
    if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_IMAGE' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'INVALID_JSON' });
    console.error('Request failed:', error.code || error.name);
    res.status(500).json({ error: 'SERVER_ERROR' });
  });
  return app;
}
