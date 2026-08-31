// De onde sai o provedor fiscal e em que ambiente ele opera.
//
// Três travas, e todas fecham do mesmo lado: sem configuração, o sistema usa o
// provedor FALSO em HOMOLOGAÇÃO. Emitir documento fiscal de verdade por engano
// gera multa e não se apaga, então o padrão precisa ser inofensivo.

import type { FiscalEnvironment } from "@prisma/client";
import type { FiscalProvider } from "@/lib/fiscal/provider";
import { ProvedorFiscalFalso } from "@/lib/fiscal/provider-falso";

/**
 * O ambiente em uso.
 *
 * Produção exige DUAS variáveis concordando: escolher o ambiente e destravar a
 * emissão. Uma sozinha não basta — é o que evita que um deploy com a variável
 * errada comece a emitir nota de verdade.
 */
export function ambienteFiscal(): FiscalEnvironment {
  const pedido = process.env.FISCAL_AMBIENTE?.trim().toLowerCase();
  const liberado = process.env.FISCAL_PRODUCAO_LIBERADA?.trim().toLowerCase() === "sim";
  return pedido === "producao" && liberado ? "PRODUCAO" : "HOMOLOGACAO";
}

/** Produção pedida mas ainda travada? A tela avisa em vez de emitir escondido. */
export function producaoPedidaMasTravada(): boolean {
  const pedido = process.env.FISCAL_AMBIENTE?.trim().toLowerCase();
  return pedido === "producao" && ambienteFiscal() === "HOMOLOGACAO";
}

/**
 * O provedor em uso.
 *
 * Provedor desconhecido cai no falso, e não estoura: um nome digitado errado
 * numa variável não pode derrubar a tela de pedidos inteira.
 */
export function provedorFiscal(): FiscalProvider {
  const nome = process.env.FISCAL_PROVIDER?.trim().toLowerCase() || "falso";
  switch (nome) {
    // Adaptadores reais entram aqui, um case cada. Nenhum existe ainda: sem
    // contrato, certificado A1 e contador, não há o que testar de verdade.
    case "falso":
    default:
      return new ProvedorFiscalFalso();
  }
}

/** O provedor atual emite documento com validade fiscal? */
export function emiteDeVerdade(): boolean {
  return provedorFiscal().nome !== "falso" && ambienteFiscal() === "PRODUCAO";
}
