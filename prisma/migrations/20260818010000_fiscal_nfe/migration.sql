-- CreateEnum
CREATE TYPE "FiscalModel" AS ENUM ('NFE_55');

-- CreateEnum
CREATE TYPE "FiscalEnvironment" AS ENUM ('HOMOLOGACAO', 'PRODUCAO');

-- CreateEnum
CREATE TYPE "FiscalStatus" AS ENUM ('DRAFT', 'VALIDATING', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLATION_PENDING', 'CANCELLED', 'ERROR');

-- CreateTable
CREATE TABLE "documentos_fiscais" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdByUserId" TEXT,
    "model" "FiscalModel" NOT NULL DEFAULT 'NFE_55',
    "environment" "FiscalEnvironment" NOT NULL DEFAULT 'HOMOLOGACAO',
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "series" INTEGER,
    "number" INTEGER,
    "accessKey" TEXT,
    "status" "FiscalStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmountInCents" INTEGER NOT NULL DEFAULT 0,
    "protocol" TEXT,
    "issuedAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectionCode" TEXT,
    "rejectionMessage" TEXT,
    "xmlStoragePath" TEXT,
    "danfeStoragePath" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_fiscais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_fiscais" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" "FiscalStatus",
    "mensagem" TEXT,
    "detalhe" TEXT,
    "criadoPorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_fiscais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documentos_fiscais_accessKey_key" ON "documentos_fiscais"("accessKey");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_fiscais_idempotencyKey_key" ON "documentos_fiscais"("idempotencyKey");

-- CreateIndex
CREATE INDEX "documentos_fiscais_companyId_status_idx" ON "documentos_fiscais"("companyId", "status");

-- CreateIndex
CREATE INDEX "documentos_fiscais_companyId_createdAt_idx" ON "documentos_fiscais"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "documentos_fiscais_orderId_idx" ON "documentos_fiscais"("orderId");

-- CreateIndex
CREATE INDEX "eventos_fiscais_documentId_createdAt_idx" ON "eventos_fiscais"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "documentos_fiscais" ADD CONSTRAINT "documentos_fiscais_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_fiscais" ADD CONSTRAINT "documentos_fiscais_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_fiscais" ADD CONSTRAINT "eventos_fiscais_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documentos_fiscais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
