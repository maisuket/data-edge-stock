-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "current_stock" REAL NOT NULL DEFAULT 0,
    "average_cost" REAL NOT NULL DEFAULT 0,
    "min_stock" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ingredient_lots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lot_number" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "total_cost" REAL NOT NULL,
    "unit_cost" REAL NOT NULL,
    "remaining_qty" REAL NOT NULL,
    "purchased_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    "supplier_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ingredient_lots_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ingredient_lots_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recipe_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    CONSTRAINT "recipe_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recipe_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "productions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit_cost" REAL NOT NULL,
    "total_cost" REAL NOT NULL,
    "notes" TEXT,
    "user_id" TEXT NOT NULL,
    "produced_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "productions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "productions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "production_consumptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "production_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity_used" REAL NOT NULL,
    "unit_cost" REAL NOT NULL,
    "total_cost" REAL NOT NULL,
    CONSTRAINT "production_consumptions_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_consumptions_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "internal_code" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "cost_price" REAL NOT NULL,
    "sale_price" REAL,
    "current_stock" REAL NOT NULL,
    "min_stock" REAL NOT NULL,
    "location" TEXT,
    "is_manufactured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_products" ("barcode", "category", "cost_price", "createdAt", "current_stock", "id", "internal_code", "location", "min_stock", "name", "sale_price", "unit", "updatedAt") SELECT "barcode", "category", "cost_price", "createdAt", "current_stock", "id", "internal_code", "location", "min_stock", "name", "sale_price", "unit", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_internal_code_key" ON "products"("internal_code");
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "recipe_items_product_id_ingredient_id_key" ON "recipe_items"("product_id", "ingredient_id");
