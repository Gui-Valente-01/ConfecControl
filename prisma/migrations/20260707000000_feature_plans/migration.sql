-- Planos por funcionalidade: cada empresa/token lista os módulos vendáveis liberados.
-- Idempotente (seguro para rodar mais de uma vez).
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tokens_cadastro" ADD COLUMN IF NOT EXISTS "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Empresas criadas antes desta migração recebem todos os módulos (mantém o acesso atual intacto).
UPDATE "empresas"
SET "features" = ARRAY['producao', 'estoque', 'financeiro', 'relatorios', 'terceirizadas', 'equipe']
WHERE "createdAt" < TIMESTAMP '2026-07-07 00:00:00'
  AND cardinality("features") = 0;
