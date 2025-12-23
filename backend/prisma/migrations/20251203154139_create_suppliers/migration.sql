-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "batch" TEXT,
    "quantity" REAL NOT NULL,
    "expiry_date" DATETIME,
    "unit_value" REAL,
    "stock_before" REAL NOT NULL,
    "stock_after" REAL NOT NULL,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_stock_movements" ("batch", "created_at", "description", "expiry_date", "id", "product_id", "quantity", "stock_after", "stock_before", "type", "unit_value", "user_id") SELECT "batch", "created_at", "description", "expiry_date", "id", "product_id", "quantity", "stock_after", "stock_before", "type", "unit_value", "user_id" FROM "stock_movements";
DROP TABLE "stock_movements";
ALTER TABLE "new_stock_movements" RENAME TO "stock_movements";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_cnpj_key" ON "suppliers"("cnpj");
