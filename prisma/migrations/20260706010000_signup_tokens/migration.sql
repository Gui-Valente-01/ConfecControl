-- CreateTable
CREATE TABLE "tokens_cadastro" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientName" TEXT,
    "contactEmail" TEXT,
    "createdByEmail" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "usedCompanyId" TEXT,
    "usedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_cadastro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_cadastro_code_key" ON "tokens_cadastro"("code");

-- CreateIndex
CREATE INDEX "tokens_cadastro_createdAt_idx" ON "tokens_cadastro"("createdAt");

-- CreateIndex
CREATE INDEX "tokens_cadastro_usedCompanyId_idx" ON "tokens_cadastro"("usedCompanyId");

-- AddForeignKey
ALTER TABLE "tokens_cadastro" ADD CONSTRAINT "tokens_cadastro_usedCompanyId_fkey" FOREIGN KEY ("usedCompanyId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
