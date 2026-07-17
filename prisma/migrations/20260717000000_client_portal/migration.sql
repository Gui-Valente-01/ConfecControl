-- Portal do cliente: login no Client + modelo de solicitações. Idempotente.
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "clientes_inviteToken_key" ON "clientes" ("inviteToken");

CREATE TABLE IF NOT EXISTS "solicitacoes" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'NEW',
  "referenceOrderId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER,
  "photoUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdOrderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "solicitacoes_companyId_status_idx" ON "solicitacoes" ("companyId", "status");
CREATE INDEX IF NOT EXISTS "solicitacoes_clientId_idx" ON "solicitacoes" ("clientId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitacoes_companyId_fkey') THEN
    ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "empresas" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitacoes_clientId_fkey') THEN
    ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
