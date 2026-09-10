-- Convite passa a dizer que tipo de confeccao vai abrir a conta.
--
-- Ate aqui toda empresa nascia com as mesmas oito etapas, fosse fabrica de
-- bone ou faccao, e a implantacao comecava apagando e renomeando etapa. Com o
-- segmento no convite, a conta ja abre com as etapas e os servicos do ramo
-- (ver src/lib/modelos-de-conta.ts).
--
-- A coluna e opcional DE PROPOSITO, pelo mesmo motivo do prazo do convite:
-- token que ja existe fica com NULL e continua abrindo conta exatamente como
-- abria, com as etapas padrao. Nada muda para convite ja enviado.
--
-- Texto livre e nao enum: a lista de segmentos muda junto com as paginas do
-- site, e enum exigiria migration a cada segmento novo. Quem valida a chave e
-- a tela do master, na hora de criar o convite.

ALTER TABLE "tokens_cadastro" ADD COLUMN "segmento" TEXT;
