-- Foto tirada pelo funcionario na bancada.
--
-- Ate agora so quem administra pedidos anexava arquivo, e sempre a arte do
-- cliente. O funcionario da producao nao tinha como registrar o que ficou
-- pronto nem fotografar um problema -- ele avisava por WhatsApp, e aquilo
-- sumia do pedido.
--
-- "origem" separa as duas coisas. Vazio = arte do cliente, que e o caso de
-- TODAS as linhas que ja existem: nada muda no que esta la. "BANCADA" e a foto
-- da producao. A separacao importa porque foto do que ficou pronto nao pode ser
-- confundida com a arte aprovada, senao o proximo funcionario produz olhando a
-- imagem errada.
--
-- "sentBy" guarda quem enviou, e so vale para a foto de bancada: e o que
-- permite voltar e perguntar para a pessoa certa quando a foto mostra um
-- problema.
--
-- So adiciona duas colunas opcionais e um indice. Nao altera nem apaga dado
-- nenhum, e pode rodar mais de uma vez sem efeito.

ALTER TABLE "anexos" ADD COLUMN IF NOT EXISTS "origem" TEXT;
ALTER TABLE "anexos" ADD COLUMN IF NOT EXISTS "sentBy" TEXT;

-- A bancada e a tela do pedido filtram por origem o tempo todo.
CREATE INDEX IF NOT EXISTS "anexos_orderId_origem_idx" ON "anexos"("orderId", "origem");
