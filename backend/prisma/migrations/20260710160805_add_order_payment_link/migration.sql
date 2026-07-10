-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PAID';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_link_url" TEXT,
ADD COLUMN     "payment_preference_id" TEXT;
