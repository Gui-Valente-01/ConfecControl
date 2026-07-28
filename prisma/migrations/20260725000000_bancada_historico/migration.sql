-- Historico da bancada: guarda em qual etapa cada trabalho foi feito. Idempotente.
ALTER TABLE "bancada_tarefas" ADD COLUMN IF NOT EXISTS "stageName" TEXT;

-- Consulta do historico por mesa/periodo: filtra concluidos e ordena por data.
CREATE INDEX IF NOT EXISTS "bancada_tarefas_companyId_status_doneAt_idx"
  ON "bancada_tarefas" ("companyId", "status", "doneAt");
