-- Servico cobrado dentro do pedido: nome e valor digitados na hora, somando no
-- total que o cliente paga. Substitui a ficha de servicos por peca, que exigia
-- cadastrar no catalogo e vincular na peca antes de vender. Idempotente.
CREATE TABLE IF NOT EXISTS "pedido_servicos" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceInCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pedido_servicos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pedido_servicos_orderId_idx" ON "pedido_servicos" ("orderId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedido_servicos_orderId_fkey') THEN
    ALTER TABLE "pedido_servicos" ADD CONSTRAINT "pedido_servicos_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "pedidos" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- A tabela produto_servicos deixa de ser usada pelo app. Nao e removida aqui de
-- proposito: derrubar tabela e irreversivel e ela pode ser apagada depois, com
-- calma, se ninguem sentir falta.
