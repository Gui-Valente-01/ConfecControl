-- Cada pagamento passa a ser um RECEBIMENTO: dinheiro que entrou, com data.
--
-- Antes existia uma linha por pedido com o valor TOTAL, atualizada a cada
-- pagamento. Ela nao era um recebimento: era a cobranca. Por isso o historico
-- mostrava "um pagamento de R$ 750" onde houve entrada de R$ 225 e saldo de
-- R$ 525, e nao dava para saber quando cada dinheiro entrou.
--
-- A conversao usa o unico dado confiavel que existe hoje: pedidos.paidAmountInCents.
-- Pedido sem nada recebido fica sem linha nenhuma. Idempotente.

ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "note" TEXT;

DO $$
DECLARE
  ja_convertido BOOLEAN;
BEGIN
  -- Marca de conversao: se ja existe recebimento com nota, nao roda de novo.
  SELECT EXISTS (SELECT 1 FROM "pagamentos" WHERE "note" IS NOT NULL) INTO ja_convertido;
  IF ja_convertido THEN
    RAISE NOTICE 'Recebimentos ja convertidos; nada a fazer.';
    RETURN;
  END IF;

  -- Fora as linhas antigas de cobranca: elas nunca representaram dinheiro que entrou.
  DELETE FROM "pagamentos";

  -- Um recebimento por pedido que tem valor pago, com o que se sabe da data.
  INSERT INTO "pagamentos" ("id", "orderId", "amountInCents", "status", "method", "note", "paidAt", "createdAt", "updatedAt")
  SELECT
    -- id no formato do cuid usado pelo app (prefixo c + aleatorio), suficiente para ser unico
    'c' || replace(gen_random_uuid()::text, '-', ''),
    p."id",
    p."paidAmountInCents",
    'PAID',
    p."paymentMethod",
    CASE
      WHEN p."paidAmountInCents" >= p."totalAmountInCents" THEN 'Pagamento do pedido (registro anterior ao histórico detalhado)'
      ELSE 'Entrada do pedido (registro anterior ao histórico detalhado)'
    END,
    COALESCE(p."orderDate", p."createdAt"),
    p."createdAt",
    NOW()
  FROM "pedidos" p
  WHERE p."paidAmountInCents" > 0;

  RAISE NOTICE 'Recebimentos convertidos.';
END $$;

CREATE INDEX IF NOT EXISTS "pagamentos_orderId_paidAt_idx" ON "pagamentos" ("orderId", "paidAt");
