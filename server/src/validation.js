import { z } from 'zod';

const slug = z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine((value) => value !== 'all', 'This slug is reserved');
export const categorySchema = z.object({
  slug,
  nameRu: z.string().trim().min(2).max(120),
  nameUz: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
});
export const productSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: slug,
  nameRu: z.string().trim().min(2).max(120),
  nameUz: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  descriptionRu: z.string().trim().min(10).max(3000),
  descriptionUz: z.string().trim().min(10).max(3000),
  descriptionEn: z.string().trim().min(10).max(3000),
  notesRu: z.string().trim().max(500).default(''),
  notesUz: z.string().trim().max(500).default(''),
  notesEn: z.string().trim().max(500).default(''),
  isFeatured: z.boolean().default(false),
  isDemo: z.boolean().default(false),
});
const contact = z.string().trim().max(160).refine((value) => {
  if (value.includes('@')) return z.email().safeParse(value).success;
  return /^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15;
}, 'Enter a valid email or phone number');
export const requestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  contact,
  company: z.string().trim().max(150).default(''),
  message: z.string().trim().max(2000).default(''),
  productId: z.string().max(100).nullable().optional(),
  locale: z.enum(['ru', 'uz', 'en']).default('ru'),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export const loginSchema = z.object({ email: z.email().max(160), password: z.string().min(1).max(100) });
