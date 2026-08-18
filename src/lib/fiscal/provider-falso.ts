// Provedor falso: emite "notas" que não existem para a SEFAZ.
//
// É o provedor padrão, e de propósito. Enquanto não houver contrato, contador e
// certificado A1, qualquer emissão real seria documento fiscal de verdade
// gerado por engano — que dá multa e não se apaga.
//
// Ele serve para três coisas: exercitar a máquina de estados inteira, permitir
// testar a tela sem credencial nenhuma, e provar que a arquitetura não depende
// de um provedor específico.
//
// NÃO gera XML assinado nem chave de acesso válida. A chave devolvida tem 44
// dígitos porque a tela e as validações esperam esse formato, mas ela é
// inventada e começa com um marcador visível.

import { createHash } from "node:crypto";
import type {
  ArquivoFiscal,
  FiscalProvider,
  PedidoDeCancelamento,
  PedidoDeEmissao,
  ResultadoDeWebhook,
  ResultadoFiscal,
} from "@/lib/fiscal/provider";
import type { FiscalEnvironment } from "@prisma/client";

/** Prefixo que denuncia a nota falsa em qualquer lugar que ela apareça. */
export const MARCADOR_DE_TESTE = "0000";

function numeroDeterministico(semente: string, digitos: number): string {
  const hash = createHash("sha256").update(semente).digest("hex");
  let saida = "";
  for (const caractere of hash) {
    const valor = Number.parseInt(caractere, 16);
    if (Number.isNaN(valor)) continue;
    saida += String(valor % 10);
    if (saida.length >= digitos) break;
  }
  return saida.padEnd(digitos, "0").slice(0, digitos);
}

/**
 * Chave de acesso de mentira, com 44 dígitos.
 *
 * Determinística: a mesma emissão devolve a mesma chave, o que faz o teste de
 * idempotência ter o que comparar.
 */
export function chaveFalsa(semente: string): string {
  return MARCADOR_DE_TESTE + numeroDeterministico(semente, 40);
}

export class ProvedorFiscalFalso implements FiscalProvider {
  readonly nome = "falso";

  /** Memória do processo: some no reinício, e está tudo bem — nada aqui é real. */
  private readonly emitidas = new Map<string, ResultadoFiscal>();

  async emitirNFe(pedido: PedidoDeEmissao): Promise<ResultadoFiscal> {
    // Idempotência de verdade: a segunda chamada com a mesma chave devolve o
    // mesmo resultado, e não uma nota nova. É o comportamento que o provedor
    // real precisa ter, então o falso também tem.
    const jaEmitida = this.emitidas.get(pedido.idempotencyKey);
    if (jaEmitida) return jaEmitida;

    const problema = validarPedido(pedido);
    if (problema) {
      const rejeitada: ResultadoFiscal = {
        situacao: "rejeitada",
        providerReference: null,
        chaveAcesso: null,
        numero: null,
        serie: null,
        protocolo: null,
        // 999 não é um código real da SEFAZ; é um marcador de teste.
        codigoRejeicao: "999",
        mensagem: problema,
      };
      this.emitidas.set(pedido.idempotencyKey, rejeitada);
      return rejeitada;
    }

    const referencia = `falso-${numeroDeterministico(pedido.idempotencyKey, 12)}`;
    const autorizada: ResultadoFiscal = {
      situacao: "autorizada",
      providerReference: referencia,
      chaveAcesso: chaveFalsa(pedido.idempotencyKey),
      numero: Number(numeroDeterministico(pedido.referenciaInterna, 6)),
      serie: 1,
      protocolo: `TESTE-${numeroDeterministico(referencia, 15)}`,
      codigoRejeicao: null,
      mensagem: "Autorizada pelo provedor de teste. Esta nota NÃO existe para a SEFAZ.",
    };
    this.emitidas.set(pedido.idempotencyKey, autorizada);
    return autorizada;
  }

  async consultarNFe(providerReference: string): Promise<ResultadoFiscal> {
    for (const resultado of this.emitidas.values()) {
      if (resultado.providerReference === providerReference) return resultado;
    }
    return {
      situacao: "erro",
      providerReference,
      chaveAcesso: null,
      numero: null,
      serie: null,
      protocolo: null,
      codigoRejeicao: null,
      mensagem: "Documento não encontrado no provedor de teste.",
    };
  }

  async cancelarNFe(pedido: PedidoDeCancelamento): Promise<ResultadoFiscal> {
    // A SEFAZ exige justificativa de 15 caracteres. O falso cobra o mesmo, para
    // a tela ser testada contra a regra real e não contra uma mais frouxa.
    if (pedido.justificativa.trim().length < 15) {
      return {
        situacao: "erro",
        providerReference: pedido.providerReference,
        chaveAcesso: pedido.chaveAcesso,
        numero: null,
        serie: null,
        protocolo: null,
        codigoRejeicao: "242",
        mensagem: "A justificativa do cancelamento precisa de ao menos 15 caracteres.",
      };
    }

    return {
      situacao: "cancelada",
      providerReference: pedido.providerReference,
      chaveAcesso: pedido.chaveAcesso,
      numero: null,
      serie: null,
      protocolo: `TESTE-CANC-${numeroDeterministico(pedido.chaveAcesso, 15)}`,
      codigoRejeicao: null,
      mensagem: "Cancelamento registrado no provedor de teste.",
    };
  }

  async baixarXml(providerReference: string, ambiente: FiscalEnvironment): Promise<ArquivoFiscal | null> {
    // XML de mentira, e que diz isso em voz alta na primeira linha: se um dia
    // este arquivo escapar para o contador, ele precisa ser óbvio.
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- DOCUMENTO DE TESTE. Nao possui validade fiscal e nao existe para a SEFAZ. -->
<nfeProc versao="4.00" ambiente="${ambiente}">
  <referencia>${providerReference}</referencia>
</nfeProc>`;
    return {
      conteudo: new TextEncoder().encode(xml).buffer as ArrayBuffer,
      contentType: "application/xml",
      nomeSugerido: `teste-${providerReference}.xml`,
    };
  }

  async baixarDanfe(providerReference: string): Promise<ArquivoFiscal | null> {
    const texto = `DANFE DE TESTE - sem validade fiscal - ${providerReference}`;
    return {
      conteudo: new TextEncoder().encode(texto).buffer as ArrayBuffer,
      contentType: "text/plain",
      nomeSugerido: `teste-${providerReference}.txt`,
    };
  }

  // Os cabecalhos entram na assinatura porque a interface os exige: e neles que
  // um provedor real manda o HMAC do corpo. O falso nao assina nada, entao ele
  // ignora e recusa.
  validarWebhook(corpoCru: string, cabecalhos: Record<string, string> = {}): ResultadoDeWebhook {
    void cabecalhos;
    // Sem segredo compartilhado não há assinatura para conferir. Recusar por
    // padrão é o certo: um webhook que aceita qualquer corpo é um endpoint
    // público que altera situação de nota fiscal.
    try {
      const dados = JSON.parse(corpoCru) as { referenciaInterna?: string };
      if (!dados.referenciaInterna) return { valido: false, motivo: "Sem referência interna." };
      return {
        valido: false,
        motivo: "O provedor de teste não assina webhook. Configure um provedor real.",
      };
    } catch {
      return { valido: false, motivo: "Corpo inválido." };
    }
  }
}

/** Confere o mínimo que qualquer provedor exigiria, para a tela treinar contra regra real. */
export function validarPedido(pedido: PedidoDeEmissao): string | null {
  if (pedido.itens.length === 0) return "A nota precisa de ao menos um item.";
  if (pedido.totalInCents <= 0) return "O total da nota precisa ser maior que zero.";

  const emitente = pedido.emitente;
  if (!emitente.cnpj) return "Falta o CNPJ da confecção.";
  if (!emitente.inscricaoEstadual) return "Falta a inscrição estadual da confecção.";
  if (!emitente.endereco.codigoMunicipio) return "Falta o código do município da confecção.";

  const destinatario = pedido.destinatario;
  if (!destinatario.documento) return "Falta o CPF ou CNPJ do cliente.";
  if (!destinatario.endereco.codigoMunicipio) return "Falta o código do município do cliente.";
  if (!destinatario.endereco.cep) return "Falta o CEP do cliente.";

  for (const item of pedido.itens) {
    if (!item.ncm) return `Falta o NCM em "${item.descricao}".`;
    if (!item.cfop) return `Falta o CFOP em "${item.descricao}".`;
    if (!item.unidade) return `Falta a unidade comercial em "${item.descricao}".`;
  }

  return null;
}
