-- Mesa passa a atender uma etapa: mesa de silk faz silk.
--
-- Antes, qualquer pedido entrava em qualquer mesa. Dava para pegar na bancada
-- de estamparia um pedido que ainda estava no recebimento, e o trabalho ia
-- para a etapa errada sem ninguem perceber.
--
-- A coluna nasce vazia em todas as mesas, e mesa vazia aceita qualquer pedido.
-- Ou seja: quem ja usa o sistema nao sente diferenca ate configurar as mesas
-- em Configuracoes. Nenhum trabalho em andamento e interrompido.
--
-- ON DELETE SET NULL: apagar uma etapa nao apaga a mesa; ela so volta a
-- aceitar qualquer pedido.
--
-- So adiciona coluna, indice e chave estrangeira. Nao altera nem apaga dado
-- nenhum, e pode rodar mais de uma vez sem efeito.

ALTER TABLE "mesas" ADD COLUMN IF NOT EXISTS "stageId" TEXT;

CREATE INDEX IF NOT EXISTS "mesas_stageId_idx" ON "mesas"("stageId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mesas_stageId_fkey'
  ) THEN
    ALTER TABLE "mesas"
      ADD CONSTRAINT "mesas_stageId_fkey"
      FOREIGN KEY ("stageId") REFERENCES "etapas_producao"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
