// A interface do provedor fiscal, independente de quem vai emitir de verdade.
//
// Existe para o sistema não nascer casado com uma empresa. Trocar de provedor
// (ou atender uma confecção que já usa outro) deve custar um arquivo novo, e
// não uma reforma. Por isso o resto do sistema conhece SÓ este contrato.
//
// Nenhuma regra tributária mora aqui. Alíquota, CST/CSOSN e benefício fiscal
// vêm do perfil fiscal da empresa, validado pelo contador dela — o provedor
// recebe os dados e devolve o resultado.

import type { FiscalEnvironment } from "@prisma/client";

/** Um item da nota, já com o que o fisco exige por produto. */
export type ItemFiscal = {
  descricao: string;
  /** Nomenclatura Comum do Mercosul. Obrigatório e específico do produto. */
  ncm: string;
  /** Código Fiscal de Operações. Depende da UF de origem/destino e da operação
   *  — por isso vem calculado de fora, e nunca fixo no cadastro da peça. */
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitarioInCents: number;
  valorTotalInCents: number;
  /** Origem da mercadoria (0 = nacional, 1 = importação direta...). */
  origem: string;
  /** Perfil tributário resolvido fora daqui. O provedor não decide imposto. */
  tributacao: Record<string, string | number | null>;
};

export type EmitenteFiscal = {
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  inscricaoEstadual: string;
  /** Código do Regime Tributário: 1 Simples, 2 Simples excesso, 3 Regime normal. */
  regimeTributario: string;
  endereco: EnderecoFiscal;
};

export type DestinatarioFiscal = {
  nome: string;
  /** CPF ou CNPJ, só dígitos. */
  documento: string;
  inscricaoEstadual: string | null;
  /** Indicador de IE do destinatário (1 contribuinte, 2 isento, 9 não contribuinte). */
  indicadorIe: string;
  email: string | null;
  endereco: EnderecoFiscal;
};

export type EnderecoFiscal = {
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  /** Código IBGE do município. É o que a SEFAZ usa, e não o nome da cidade. */
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
};

export type PedidoDeEmissao = {
  /** Idempotência: o provedor deve recusar a segunda chamada com a mesma chave. */
  idempotencyKey: string;
  ambiente: FiscalEnvironment;
  emitente: EmitenteFiscal;
  destinatario: DestinatarioFiscal;
  itens: ItemFiscal[];
  totalInCents: number;
  /** Referência interna para casar o retorno assíncrono com o documento. */
  referenciaInterna: string;
  observacoes: string | null;
};

export type ResultadoFiscal = {
  /** Situação do lado do provedor. */
  situacao: "processando" | "autorizada" | "rejeitada" | "cancelada" | "erro";
  providerReference: string | null;
  chaveAcesso: string | null;
  numero: number | null;
  serie: number | null;
  protocolo: string | null;
  /** Código e motivo VINDOS DA SEFAZ, sem tradução: o contador precisa do original. */
  codigoRejeicao: string | null;
  mensagem: string | null;
};

export type PedidoDeCancelamento = {
  ambiente: FiscalEnvironment;
  providerReference: string;
  chaveAcesso: string;
  /** A SEFAZ exige justificativa com no mínimo 15 caracteres. */
  justificativa: string;
};

export type ArquivoFiscal = {
  conteudo: ArrayBuffer;
  contentType: string;
  nomeSugerido: string;
};

export type ResultadoDeWebhook =
  | { valido: true; referenciaInterna: string; resultado: ResultadoFiscal }
  | { valido: false; motivo: string };

/**
 * O contrato que todo provedor precisa cumprir.
 *
 * `nome` entra no documento gravado: trocar de provedor não pode reescrever o
 * passado, e saber quem emitiu cada nota importa quando algo é contestado.
 */
export interface FiscalProvider {
  readonly nome: string;

  emitirNFe(pedido: PedidoDeEmissao): Promise<ResultadoFiscal>;
  consultarNFe(providerReference: string, ambiente: FiscalEnvironment): Promise<ResultadoFiscal>;
  cancelarNFe(pedido: PedidoDeCancelamento): Promise<ResultadoFiscal>;
  baixarXml(providerReference: string, ambiente: FiscalEnvironment): Promise<ArquivoFiscal | null>;
  baixarDanfe(providerReference: string, ambiente: FiscalEnvironment): Promise<ArquivoFiscal | null>;

  /**
   * Confere se o aviso recebido veio mesmo do provedor.
   *
   * Recebe o corpo CRU, e não o objeto já convertido: a assinatura é calculada
   * sobre os bytes exatos, e converter antes de conferir invalida a checagem.
   */
  validarWebhook(corpoCru: string, cabecalhos: Record<string, string>): ResultadoDeWebhook;
}
