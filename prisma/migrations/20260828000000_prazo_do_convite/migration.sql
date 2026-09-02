-- Convite de ativacao passa a ter prazo.
--
-- Ate aqui o token so deixava de valer se fosse usado ou revogado a mao. Um
-- codigo enviado por WhatsApp e nunca usado continuava valido para sempre: se
-- aquela conversa fosse encaminhada meses depois, o codigo ainda criava uma
-- empresa no sistema. Oito digitos com vida eterna e um segredo que so piora
-- com o tempo, porque a chance de vazar cresce e a de ser usado nao.
--
-- A coluna e opcional DE PROPOSITO. Token que ja existe fica com NULL e
-- continua valendo: invalidar convite ja enviado seria quebrar a ativacao de
-- alguem sem aviso nenhum. A tela do master mostra esses como "sem prazo" para
-- poderem ser revogados a mao, um a um, com o dono decidindo.
--
-- Sem backfill por isso mesmo. Quem quiser encerrar os antigos usa o botao de
-- revogar, que ja existe e ja registra quem revogou e quando.

ALTER TABLE "tokens_cadastro" ADD COLUMN "expiresAt" TIMESTAMP(3);
