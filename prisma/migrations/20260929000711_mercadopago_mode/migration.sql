-- CreateEnum
CREATE TYPE "MercadoPagoMode" AS ENUM ('EMBEDDED', 'REDIRECT');

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "mercadoPagoMode" "MercadoPagoMode" NOT NULL DEFAULT 'EMBEDDED';
