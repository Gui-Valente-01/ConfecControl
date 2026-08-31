-- Remove o modulo de NF-e do produto.
--
-- O modulo nunca emitiu nota de verdade: o provedor configurado era o falso e
-- nao houve integracao com a SEFAZ. Manter a estrutura no banco significava
-- carregar tabela, enum e coluna que nenhuma tela mais le.
--
-- Conferido antes de escrever esta migration: 0 linhas em documentos_fiscais,
-- 0 em eventos_fiscais, 0 clientes com dado fiscal e 0 produtos com NCM, CEST
-- ou CFOP. Nenhum dado e perdido aqui.
--
-- O que NAO sai: as colunas de endereco (logradouro, numero, complemento,
-- bairro, municipio, uf, cep) e razaoSocial/nomeFantasia. Elas entraram junto
-- com as fiscais, mas servem para entrega e cadastro -- nada a ver com nota.

-- Tira o modulo do plano de quem o tinha marcado.
UPDATE "empresas"
   SET "features" = array_remove("features", 'fiscal')
 WHERE 'fiscal' = ANY("features");

-- Tabelas (eventos primeiro: depende de documentos por FK).
DROP TABLE IF EXISTS "eventos_fiscais";
DROP TABLE IF EXISTS "documentos_fiscais";

-- Enums, que so existiam para as tabelas acima.
DROP TYPE IF EXISTS "FiscalStatus";
DROP TYPE IF EXISTS "FiscalEnvironment";
DROP TYPE IF EXISTS "FiscalModel";

-- Colunas puramente fiscais do emitente.
ALTER TABLE "empresas"
  DROP COLUMN IF EXISTS "inscricaoEstadual",
  DROP COLUMN IF EXISTS "regimeTributario",
  DROP COLUMN IF EXISTS "codigoMunicipio";

-- Colunas puramente fiscais do destinatario.
ALTER TABLE "clientes"
  DROP COLUMN IF EXISTS "inscricaoEstadual",
  DROP COLUMN IF EXISTS "indicadorIe",
  DROP COLUMN IF EXISTS "codigoMunicipio";

-- Colunas puramente fiscais da peca. unidadeComercial entra aqui porque era a
-- unidade comercial DA NF-e -- a unidade do estoque de material e outra coluna,
-- noutra tabela, e continua intacta.
ALTER TABLE "produtos"
  DROP COLUMN IF EXISTS "ncm",
  DROP COLUMN IF EXISTS "cest",
  DROP COLUMN IF EXISTS "unidadeComercial",
  DROP COLUMN IF EXISTS "origem",
  DROP COLUMN IF EXISTS "cfopSugerido";
