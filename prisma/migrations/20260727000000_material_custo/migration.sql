-- Preco por unidade do material: base para a ficha tecnica calcular o custo
-- real de cada peca (ex.: 1 kg de malha = R$ 28,50). Idempotente.
ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "costPerUnitInCents" INTEGER NOT NULL DEFAULT 0;
