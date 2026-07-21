-- Bancada / chão de fábrica: mesas configuráveis + trabalhos de bancada. Idempotente.
CREATE TABLE IF NOT EXISTS "mesas" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "mesas_companyId_idx" ON "mesas" ("companyId");

CREATE TABLE IF NOT EXISTS "bancada_tarefas" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "mesaId" TEXT,
  "pickedById" TEXT,
  "pickedByName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PICKED',
  "noteKind" TEXT NOT NULL DEFAULT 'NONE',
  "note" TEXT,
  "pickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "doneAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bancada_tarefas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "bancada_tarefas_companyId_status_idx" ON "bancada_tarefas" ("companyId", "status");
CREATE INDEX IF NOT EXISTS "bancada_tarefas_orderId_idx" ON "bancada_tarefas" ("orderId");
CREATE INDEX IF NOT EXISTS "bancada_tarefas_mesaId_idx" ON "bancada_tarefas" ("mesaId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mesas_companyId_fkey') THEN
    ALTER TABLE "mesas" ADD CONSTRAINT "mesas_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "empresas" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bancada_tarefas_companyId_fkey') THEN
    ALTER TABLE "bancada_tarefas" ADD CONSTRAINT "bancada_tarefas_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "empresas" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bancada_tarefas_orderId_fkey') THEN
    ALTER TABLE "bancada_tarefas" ADD CONSTRAINT "bancada_tarefas_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "pedidos" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bancada_tarefas_mesaId_fkey') THEN
    ALTER TABLE "bancada_tarefas" ADD CONSTRAINT "bancada_tarefas_mesaId_fkey"
      FOREIGN KEY ("mesaId") REFERENCES "mesas" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bancada_tarefas_pickedById_fkey') THEN
    ALTER TABLE "bancada_tarefas" ADD CONSTRAINT "bancada_tarefas_pickedById_fkey"
      FOREIGN KEY ("pickedById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
