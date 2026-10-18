import '../server/src/config.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const products = [
  {
    slug: 'bergamot-cedar', category: 'perfumery',
    nameRu: 'Бергамот и кедр', nameUz: 'Bergamot va kedr', nameEn: 'Bergamot & Cedar',
    descriptionRu: 'Свежесть цитрусовых и спокойная глубина древесных нот. Чистый, выразительный характер.',
    descriptionUz: 'Sitrus yangiligi va yog‘och notalarining sokin chuqurligi. Toza, ifodali xarakter.',
    descriptionEn: 'Fresh citrus meets the quiet depth of woody notes. A clean, expressive character.',
    notesRu: 'Бергамот · Зелёные ноты · Кедр', notesUz: 'Bergamot · Yashil notalar · Kedr', notesEn: 'Bergamot · Green notes · Cedar', image: 'citrus',
  },
  {
    slug: 'white-bloom', category: 'cosmetics',
    nameRu: 'Белый жасмин', nameUz: 'Oq yasmin', nameEn: 'White Bloom',
    descriptionRu: 'Мягкая цветочная композиция с невесомым мускусным шлейфом. Деликатность в каждой ноте.',
    descriptionUz: 'Yengil mushk izi bilan yumshoq gulli kompozitsiya. Har bir notada noziklik.',
    descriptionEn: 'A soft floral composition with an airy musk trail. Delicacy in every note.',
    notesRu: 'Жасмин · Белые цветы · Мускус', notesUz: 'Yasmin · Oq gullar · Mushk', notesEn: 'Jasmine · White flowers · Musk', image: 'floral',
  },
  {
    slug: 'amber-woods', category: 'household',
    nameRu: 'Тёплый сандал', nameUz: 'Iliq sandal', nameEn: 'Amber Woods',
    descriptionRu: 'Бархатистый древесный аккорд с тёплыми амбровыми оттенками. Атмосфера уюта и равновесия.',
    descriptionUz: 'Iliq qahrabo tuslari bilan baxmal yog‘och akkordi. Shinamlik va muvozanat muhiti.',
    descriptionEn: 'A velvety woody accord with warm amber undertones. An atmosphere of comfort and balance.',
    notesRu: 'Сандал · Кедр · Амбра', notesUz: 'Sandal · Kedr · Qahrabo', notesEn: 'Sandalwood · Cedar · Amber', image: 'woody',
  },
  {
    slug: 'citrus-linen', category: 'household',
    nameRu: 'Цитрусовая свежесть', nameUz: 'Sitrus yangiligi', nameEn: 'Citrus Linen',
    descriptionRu: 'Лёгкая композиция с цитрусовыми и чистыми зелёными нотами для повседневных формул.',
    descriptionUz: 'Kundalik formulalar uchun sitrus va toza yashil notali yengil kompozitsiya.',
    descriptionEn: 'A light composition with citrus and clean green notes for everyday formulations.',
    notesRu: 'Лимон · Зелёный чай · Мускус', notesUz: 'Limon · Yashil choy · Mushk', notesEn: 'Lemon · Green tea · Musk', image: 'citrus',
  },
  {
    slug: 'soft-petals', category: 'cosmetics',
    nameRu: 'Нежные лепестки', nameUz: 'Nozik gulbarglar', nameEn: 'Soft Petals',
    descriptionRu: 'Сдержанный цветочный профиль с мягкими пудровыми нюансами для средств ухода.',
    descriptionUz: 'Parvarish vositalari uchun yumshoq upasimon tusli vazmin gulli profil.',
    descriptionEn: 'A restrained floral profile with soft powdery nuances for personal care products.',
    notesRu: 'Пион · Белые цветы · Пудровые ноты', notesUz: 'Pion · Oq gullar · Upasimon notalar', notesEn: 'Peony · White flowers · Powdery notes', image: 'floral',
  },
  {
    slug: 'cedar-noir', category: 'perfumery',
    nameRu: 'Кедровый аккорд', nameUz: 'Kedr akkordi', nameEn: 'Cedar Noir',
    descriptionRu: 'Глубокое древесное направление с пряными оттенками для выразительных композиций.',
    descriptionUz: 'Ifodali kompozitsiyalar uchun ziravor tuslari bilan chuqur yog‘och yo‘nalishi.',
    descriptionEn: 'A deep woody direction with spicy undertones for expressive compositions.',
    notesRu: 'Кедр · Кардамон · Ветивер', notesUz: 'Kedr · Kardamon · Vetiver', notesEn: 'Cedar · Cardamom · Vetiver', image: 'woody',
  },
];
try {
  for (const [index, item] of products.entries()) {
    const { image, ...data } = item;
    // Respect categories renamed or removed in the admin panel during subsequent setup runs.
    if (!await prisma.category.findUnique({ where: { slug: data.category } })) continue;
    await prisma.product.upsert({
      where: { slug: data.slug }, update: {},
      create: { ...data, isFeatured: index < 3, isDemo: true, images: { create: { path: `/images/${image}.webp`, alt: data.nameRu } } },
    });
  }
  console.log('Illustrative collection is ready. Existing products were preserved.');
} finally { await prisma.$disconnect(); }
