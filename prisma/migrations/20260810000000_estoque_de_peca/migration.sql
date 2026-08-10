-- Estoque passa a ser da PEÇA PRONTA, não do material.
--
-- Motivo: a confecção compra peça pronta e presta o serviço em cima dela
-- (estampa, bordado). Controlar matéria-prima por ficha técnica exigia
-- cadastrar preço e consumo de cada material, e na prática ninguém mantinha
-- isso em dia -- o custo saía por baixo e o lucro do relatório mentia.
--
-- NADA É APAGADO. Materiais, ficha técnica e movimentos antigos continuam no
-- banco. Só deixam de alimentar o custo e a baixa automática.

-- 1) A peça ganha estoque próprio.
--    Inteiro, e não decimal: peça pronta se conta em unidades, e "50.00 bonés"
--    só confunde quem lê.
ALTER TABLE "produtos"
  ADD COLUMN IF NOT EXISTS "currentQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "minimumQuantity" INTEGER NOT NULL DEFAULT 0;

-- 2) O movimento de estoque passa a poder apontar para uma peça.
--    materialId vira opcional para o histórico antigo continuar válido.
ALTER TABLE "movimentos_estoque"
  ADD COLUMN IF NOT EXISTS "productId" TEXT;

ALTER TABLE "movimentos_estoque"
  ALTER COLUMN "materialId" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimentos_estoque_productId_fkey'
  ) THEN
    ALTER TABLE "movimentos_estoque"
      ADD CONSTRAINT "movimentos_estoque_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "produtos"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "movimentos_estoque_productId_idx"
  ON "movimentos_estoque"("productId");

-- 3) Todo movimento aponta para exatamente um lado: material (histórico) ou
--    peça (daqui pra frente). Sem isso, uma linha órfã ou dupla passaria e o
--    saldo ficaria impossível de auditar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimento_material_ou_peca'
  ) THEN
    ALTER TABLE "movimentos_estoque"
      ADD CONSTRAINT "movimento_material_ou_peca"
      CHECK (("materialId" IS NOT NULL) <> ("productId" IS NOT NULL));
  END IF;
END $$;
