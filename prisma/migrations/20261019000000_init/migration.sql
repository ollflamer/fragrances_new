CREATE TABLE "Product" (
  "id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL, "category" TEXT NOT NULL,
  "nameRu" TEXT NOT NULL, "nameUz" TEXT NOT NULL, "nameEn" TEXT NOT NULL,
  "descriptionRu" TEXT NOT NULL, "descriptionUz" TEXT NOT NULL, "descriptionEn" TEXT NOT NULL,
  "notesRu" TEXT NOT NULL DEFAULT '', "notesUz" TEXT NOT NULL DEFAULT '', "notesEn" TEXT NOT NULL DEFAULT '',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false, "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE TABLE "ProductImage" (
  "id" TEXT NOT NULL PRIMARY KEY, "path" TEXT NOT NULL, "alt" TEXT NOT NULL, "productId" TEXT NOT NULL,
  CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "SampleRequest" (
  "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "contact" TEXT NOT NULL,
  "company" TEXT NOT NULL DEFAULT '', "message" TEXT NOT NULL DEFAULT '', "locale" TEXT NOT NULL DEFAULT 'ru',
  "productId" TEXT, "productName" TEXT NOT NULL DEFAULT '', "telegramStatus" TEXT NOT NULL DEFAULT 'pending',
  "telegramAttempts" INTEGER NOT NULL DEFAULT 0, "consentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SampleRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL PRIMARY KEY, "csrfToken" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
