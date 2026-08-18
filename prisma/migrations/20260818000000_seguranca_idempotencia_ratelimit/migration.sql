-- AlterTable
ALTER TABLE "pagamentos" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "anexos" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "storagePath" TEXT;

-- CreateTable
CREATE TABLE "rate_limit" (
    "chave" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "janelaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueadoAte" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "rate_limit_bloqueadoAte_idx" ON "rate_limit"("bloqueadoAte");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_idempotencyKey_key" ON "pagamentos"("idempotencyKey");

-- CreateIndex
CREATE INDEX "anexos_deletedAt_idx" ON "anexos"("deletedAt");

