-- AlterTable
ALTER TABLE "productions" ADD COLUMN     "batches" DECIMAL(65,30) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "yield_quantity" DECIMAL(65,30) NOT NULL DEFAULT 1;
