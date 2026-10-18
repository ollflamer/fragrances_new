CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "nameRu" TEXT NOT NULL,
  "nameUz" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

INSERT INTO "Category" ("id", "slug", "nameRu", "nameUz", "nameEn", "updatedAt") VALUES
  ('category-perfumery', 'perfumery', 'Парфюмерия', 'Parfyumeriya', 'Perfumery', CURRENT_TIMESTAMP),
  ('category-cosmetics', 'cosmetics', 'Косметика', 'Kosmetika', 'Cosmetics', CURRENT_TIMESTAMP),
  ('category-household', 'household', 'Бытовая химия', 'Maishiy kimyo', 'Home care', CURRENT_TIMESTAMP),
  ('category-food', 'food', 'Пищевая промышленность', 'Oziq-ovqat sanoati', 'Food industry', CURRENT_TIMESTAMP);

INSERT INTO "Category" ("id", "slug", "nameRu", "nameUz", "nameEn", "updatedAt")
  SELECT 'legacy-' || "category", "category", "category", "category", "category", CURRENT_TIMESTAMP
  FROM "Product" WHERE "category" NOT IN (SELECT "slug" FROM "Category") GROUP BY "category";

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
  "id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" TEXT NOT NULL,
  "nameRu" TEXT NOT NULL, "nameUz" TEXT NOT NULL, "nameEn" TEXT NOT NULL,
  "descriptionRu" TEXT NOT NULL, "descriptionUz" TEXT NOT NULL, "descriptionEn" TEXT NOT NULL,
  "notesRu" TEXT NOT NULL DEFAULT '', "notesUz" TEXT NOT NULL DEFAULT '', "notesEn" TEXT NOT NULL DEFAULT '',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false, "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Product_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("slug") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("id", "slug", "category", "nameRu", "nameUz", "nameEn", "descriptionRu", "descriptionUz", "descriptionEn", "notesRu", "notesUz", "notesEn", "isFeatured", "isDemo", "createdAt", "updatedAt")
  SELECT "id", "slug", "category", "nameRu", "nameUz", "nameEn", "descriptionRu", "descriptionUz", "descriptionEn", "notesRu", "notesUz", "notesEn", "isFeatured", "isDemo", "createdAt", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
