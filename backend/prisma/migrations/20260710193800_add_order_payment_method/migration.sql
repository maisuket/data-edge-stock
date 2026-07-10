-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_method" "PaymentMethod";
