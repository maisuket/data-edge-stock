-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "batch" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "expiry_date" DATETIME;
ALTER TABLE "stock_movements" ADD COLUMN "unit_value" REAL;
