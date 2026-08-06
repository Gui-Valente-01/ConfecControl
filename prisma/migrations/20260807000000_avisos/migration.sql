-- Avisos para a equipe.
--
-- Duas coisas passam a ficar registradas no pedido:
--
--   1. o que o SISTEMA percebe sozinho -- pedido novo, mudou de etapa, ficou
--      pronto, foi entregue;
--   2. o que uma PESSOA precisa pedir -- a cor certa, uma foto do modelo,
--      ajuda com o servico, ou so um recado.
--
-- O segundo grupo hoje acontece por WhatsApp e some: alguem pergunta "qual a
-- cor do 1042?" no grupo, respondem tres horas depois, e nada disso fica no
-- pedido. Quem chegar amanha nao encontra.
--
-- A leitura e POR PESSOA (tabela separada): o contador do sino e individual,
-- senao um funcionario abrindo a lista zeraria o aviso de todo mundo.
--
-- So cria tabelas novas. Nao altera nem apaga nada do que ja existe, e pode
-- rodar mais de uma vez sem efeito.

CREATE TABLE IF NOT EXISTS "avisos" (
  "id"        TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "orderId"   TEXT,
  "tipo"      TEXT NOT NULL,
  "urgente"   BOOLEAN NOT NULL DEFAULT false,
  "titulo"    TEXT NOT NULL,
  "mensagem"  TEXT,
  "criadoPor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "avisos_leitura" (
  "avisoId" TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "lidoEm"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "avisos_leitura_pkey" PRIMARY KEY ("avisoId","userId")
);

CREATE INDEX IF NOT EXISTS "avisos_companyId_createdAt_idx" ON "avisos"("companyId","createdAt");
CREATE INDEX IF NOT EXISTS "avisos_orderId_idx"             ON "avisos"("orderId");
CREATE INDEX IF NOT EXISTS "avisos_leitura_userId_idx"      ON "avisos_leitura"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'avisos_companyId_fkey') THEN
    ALTER TABLE "avisos" ADD CONSTRAINT "avisos_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Apagar o pedido leva os avisos dele junto: fora do pedido nao fazem sentido.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'avisos_orderId_fkey') THEN
    ALTER TABLE "avisos" ADD CONSTRAINT "avisos_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'avisos_leitura_avisoId_fkey') THEN
    ALTER TABLE "avisos_leitura" ADD CONSTRAINT "avisos_leitura_avisoId_fkey"
      FOREIGN KEY ("avisoId") REFERENCES "avisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'avisos_leitura_userId_fkey') THEN
    ALTER TABLE "avisos_leitura" ADD CONSTRAINT "avisos_leitura_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
