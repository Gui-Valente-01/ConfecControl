-- CONFIGURACAO DAS MESAS -- Costura Viva Confeccoes
--
-- Rode isto UMA VEZ no SQL Editor do Supabase (producao).
-- Faz duas coisas, nesta ordem:
--
--   1. cria a coluna que liga mesa a etapa (a migration 20260805000000)
--   2. amarra as mesas que existem e cria as duas que faltam
--
-- Pode rodar mais de uma vez sem efeito colateral: tudo e idempotente.
-- Nao apaga nem altera pedido, cliente, pagamento ou estoque.

-- ---------------------------------------------------------------------------
-- 1. Estrutura
-- ---------------------------------------------------------------------------

ALTER TABLE "mesas" ADD COLUMN IF NOT EXISTS "stageId" TEXT;

CREATE INDEX IF NOT EXISTS "mesas_stageId_idx" ON "mesas"("stageId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mesas_stageId_fkey') THEN
    ALTER TABLE "mesas"
      ADD CONSTRAINT "mesas_stageId_fkey"
      FOREIGN KEY ("stageId") REFERENCES "etapas_producao"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Configuracao
-- ---------------------------------------------------------------------------
-- As tres mesas que ja existem fazem silk e bordado: todas atendem
-- "Bordado/estampa". Busca por nome, e nao por id fixo, para o script continuar
-- valendo se algo tiver mudado.

UPDATE "mesas" m
SET "stageId" = e.id
FROM "etapas_producao" e, "empresas" c
WHERE e."companyId" = m."companyId"
  AND c.id = m."companyId"
  AND c.name = 'Costura Viva Confecções'
  AND e.name = 'Bordado/estampa'
  AND m.name IN ('Silk 1', 'Silk 2', 'Bordado');

-- Corte e Acabamento tem pedido parado hoje (2 e 3) e nao tinham mesa nenhuma.
-- Sem estas duas, esses pedidos ficariam sem onde ser trabalhados.

INSERT INTO "mesas" ("id", "companyId", "name", "active", "position", "stageId", "createdAt", "updatedAt")
SELECT
  'mesa_' || replace(gen_random_uuid()::text, '-', ''),
  c.id,
  v.nome,
  true,
  v.posicao,
  e.id,
  now(),
  now()
FROM (VALUES ('Corte 1', 4, 'Corte'), ('Acabamento 1', 5, 'Acabamento')) AS v(nome, posicao, etapa)
JOIN "empresas" c ON c.name = 'Costura Viva Confecções'
JOIN "etapas_producao" e ON e."companyId" = c.id AND e.name = v.etapa
WHERE NOT EXISTS (
  SELECT 1 FROM "mesas" m WHERE m."companyId" = c.id AND m.name = v.nome
);

-- ---------------------------------------------------------------------------
-- 3. Conferencia -- deve listar 5 mesas, todas com etapa preenchida
-- ---------------------------------------------------------------------------

SELECT m.position AS ordem,
       m.name     AS mesa,
       COALESCE(e.name, '(sem etapa - aceita qualquer pedido)') AS atende,
       (SELECT count(*) FROM pedidos p WHERE p."currentStageId" = e.id) AS pedidos_nessa_etapa
FROM "mesas" m
JOIN "empresas" c ON c.id = m."companyId"
LEFT JOIN "etapas_producao" e ON e.id = m."stageId"
WHERE c.name = 'Costura Viva Confecções'
ORDER BY m.position;
