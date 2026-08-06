-- Aparelhos inscritos para receber notificacao no celular (Web Push).
--
-- Uma linha por APARELHO, e nao por pessoa: quem usa o sistema no celular e no
-- computador tem duas, e as duas devem tocar.
--
-- "endpoint" e o endereco que o servico do navegador (Google, Apple) da para
-- entregar a mensagem. E unico porque o navegador reaproveita o mesmo endereco
-- ao reinscrever -- sem a restricao, cada permissao concedida de novo criaria
-- uma linha duplicada e a pessoa receberia a notificacao repetida.
--
-- "p256dh" e "auth" sao as chaves da criptografia ponta a ponta: sem elas o
-- aparelho nao consegue abrir a mensagem.
--
-- So cria uma tabela nova. Nao altera nem apaga nada, e pode rodar mais de uma
-- vez sem efeito.

CREATE TABLE IF NOT EXISTS "push_inscricoes" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "aparelho"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_inscricoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_inscricoes_endpoint_key" ON "push_inscricoes"("endpoint");
CREATE INDEX IF NOT EXISTS "push_inscricoes_companyId_idx"       ON "push_inscricoes"("companyId");
CREATE INDEX IF NOT EXISTS "push_inscricoes_userId_idx"          ON "push_inscricoes"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_inscricoes_userId_fkey') THEN
    ALTER TABLE "push_inscricoes" ADD CONSTRAINT "push_inscricoes_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_inscricoes_companyId_fkey') THEN
    ALTER TABLE "push_inscricoes" ADD CONSTRAINT "push_inscricoes_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
