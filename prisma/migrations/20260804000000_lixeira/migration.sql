-- Lixeira: cadastro apagado sai das telas mas continua no banco.
--
-- Ate agora "excluir" era definitivo. No material era o pior caso: a chave
-- estrangeira apagava em cascata a ficha tecnica de todas as pecas que usavam
-- aquele material e todo o historico de entrada e saida do estoque. Um clique
-- errado levava meses de movimentacao, sem volta.
--
-- Com deletedAt preenchido, nada disso e apagado: as linhas continuam la e o
-- cadastro pode voltar inteiro. O filtro que esconde os apagados fica em
-- src/lib/soft-delete.ts, aplicado de uma vez para todas as consultas.
--
-- So adiciona colunas e indices. Nao apaga nem altera dado nenhum, e pode
-- rodar mais de uma vez sem efeito.

ALTER TABLE "clientes"      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "produtos"      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "materiais"     ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "terceirizadas" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "servicos"      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Toda consulta do sistema passa a filtrar por esta coluna.
CREATE INDEX IF NOT EXISTS "clientes_deletedAt_idx"      ON "clientes"("deletedAt");
CREATE INDEX IF NOT EXISTS "produtos_deletedAt_idx"      ON "produtos"("deletedAt");
CREATE INDEX IF NOT EXISTS "materiais_deletedAt_idx"     ON "materiais"("deletedAt");
CREATE INDEX IF NOT EXISTS "terceirizadas_deletedAt_idx" ON "terceirizadas"("deletedAt");
CREATE INDEX IF NOT EXISTS "servicos_deletedAt_idx"      ON "servicos"("deletedAt");
