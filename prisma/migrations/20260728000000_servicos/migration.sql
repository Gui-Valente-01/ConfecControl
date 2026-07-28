-- Servicos da confeccao (silk, costura, bordado...) com valor por peca,
-- e a distincao entre peca propria e servico na peca do cliente. Idempotente.

-- Tipo da peca: PRODUCT = feita pela confeccao; SERVICE = servico na peca do cliente.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductKind') THEN
    CREATE TYPE "ProductKind" AS ENUM ('PRODUCT', 'SERVICE');
  END IF;
END $$;

ALTER TABLE "produtos"
  ADD COLUMN IF NOT EXISTS "kind" "ProductKind" NOT NULL DEFAULT 'PRODUCT';

-- Catalogo de servicos por empresa.
CREATE TABLE IF NOT EXISTS "servicos" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "defaultPriceInCents" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "servicos_companyId_idx" ON "servicos" ("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "servicos_companyId_name_key" ON "servicos" ("companyId", "name");

-- Ficha de servicos: quais servicos entram numa peca e quanto custa cada um nela.
CREATE TABLE IF NOT EXISTS "produto_servicos" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "priceInCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "produto_servicos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "produto_servicos_productId_idx" ON "produto_servicos" ("productId");
CREATE INDEX IF NOT EXISTS "produto_servicos_serviceId_idx" ON "produto_servicos" ("serviceId");
CREATE UNIQUE INDEX IF NOT EXISTS "produto_servicos_productId_serviceId_key"
  ON "produto_servicos" ("productId", "serviceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servicos_companyId_fkey') THEN
    ALTER TABLE "servicos" ADD CONSTRAINT "servicos_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "empresas" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produto_servicos_productId_fkey') THEN
    ALTER TABLE "produto_servicos" ADD CONSTRAINT "produto_servicos_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "produtos" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'produto_servicos_serviceId_fkey') THEN
    ALTER TABLE "produto_servicos" ADD CONSTRAINT "produto_servicos_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "servicos" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
