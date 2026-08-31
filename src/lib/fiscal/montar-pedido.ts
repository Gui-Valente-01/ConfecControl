// Monta o pedido de emissão a partir do que existe no sistema, e diz o que
// falta. Sem banco e sem Next, para permitir teste.
//
// A parte mais útil daqui não é montar: é a LISTA DO QUE FALTA. Emitir nota
// com cadastro incompleto vira rejeição da SEFAZ com código numérico, que não
// diz à dona da confecção o que ela precisa preencher. Então a conferência
// acontece antes, em português, apontando a tela onde se resolve.
//
// NENHUMA REGRA TRIBUTÁRIA MORA AQUI. Alíquota, CST/CSOSN e benefício fiscal
// dependem de UF, regime e natureza da operação — são decisão do contador.
// O CFOP entra por item porque o correto muda conforme origem e destino; o
// cadastro da peça guarda apenas uma sugestão.

import type { FiscalEnvironment } from "@prisma/client";
import type { DestinatarioFiscal, EmitenteFiscal, ItemFiscal, PedidoDeEmissao } from "@/lib/fiscal/provider";

export type Pendencia = {
  /** O que falta, em português, do jeito que a pessoa entende. */
  o_que: string;
  /** Onde resolver. */
  onde: "empresa" | "cliente" | "peca" | "pedido";
  /** Link direto para a tela, quando existe. */
  link?: string;
};

export type DadosDaEmpresa = {
  name: string;
  document: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  inscricaoEstadual: string | null;
  regimeTributario: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  codigoMunicipio: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
};

export type DadosDoCliente = {
  id: string;
  name: string;
  document: string | null;
  inscricaoEstadual: string | null;
  indicadorIe: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  codigoMunicipio: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
};

export type DadosDaPeca = {
  id: string;
  name: string;
  ncm: string | null;
  cest: string | null;
  unidadeComercial: string | null;
  origem: string | null;
  cfopSugerido: string | null;
};

export type ItemDoPedido = {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  totalPriceInCents: number;
  productId: string | null;
};

/** Só dígitos. CNPJ e CPF vão sem pontuação para a SEFAZ. */
export function apenasDigitos(valor: string | null | undefined): string {
  return String(valor ?? "").replace(/\D/g, "");
}

function faltando(valor: string | null | undefined): boolean {
  return apenasDigitos(valor).length === 0 && String(valor ?? "").trim().length === 0;
}

/**
 * Tudo que impede a emissão, em ordem de tela.
 *
 * Devolve lista, e não o primeiro erro: mandar a pessoa preencher um campo,
 * tentar de novo e descobrir outro faltando é o caminho mais rápido para ela
 * desistir da nota.
 */
export function conferirDados(params: {
  empresa: DadosDaEmpresa;
  cliente: DadosDoCliente;
  itens: ItemDoPedido[];
  pecas: Map<string, DadosDaPeca>;
}): Pendencia[] {
  const { empresa, cliente, itens, pecas } = params;
  const pendencias: Pendencia[] = [];

  // ---- Emitente ----
  if (faltando(empresa.document)) {
    pendencias.push({ o_que: "CNPJ da confecção", onde: "empresa", link: "/configuracoes" });
  }
  if (faltando(empresa.razaoSocial)) {
    pendencias.push({ o_que: "Razão social da confecção", onde: "empresa", link: "/configuracoes" });
  }
  if (faltando(empresa.inscricaoEstadual)) {
    pendencias.push({ o_que: "Inscrição estadual da confecção", onde: "empresa", link: "/configuracoes" });
  }
  if (faltando(empresa.regimeTributario)) {
    pendencias.push({
      o_que: "Regime tributário da confecção (pergunte ao seu contador)",
      onde: "empresa",
      link: "/configuracoes",
    });
  }
  for (const [campo, rotulo] of [
    ["logradouro", "Endereço (rua) da confecção"],
    ["numero", "Número do endereço da confecção"],
    ["bairro", "Bairro da confecção"],
    ["codigoMunicipio", "Código IBGE do município da confecção"],
    ["uf", "UF da confecção"],
    ["cep", "CEP da confecção"],
  ] as const) {
    if (faltando(empresa[campo])) {
      pendencias.push({ o_que: rotulo, onde: "empresa", link: "/configuracoes" });
    }
  }

  // ---- Destinatário ----
  const linkCliente = `/clientes/${cliente.id}`;
  if (faltando(cliente.document)) {
    pendencias.push({ o_que: `CPF ou CNPJ de ${cliente.name}`, onde: "cliente", link: linkCliente });
  }
  if (faltando(cliente.indicadorIe)) {
    pendencias.push({
      o_que: `Indicador de inscrição estadual de ${cliente.name} (o caso comum é "não contribuinte")`,
      onde: "cliente",
      link: linkCliente,
    });
  }
  for (const [campo, rotulo] of [
    ["logradouro", "Endereço (rua)"],
    ["numero", "Número do endereço"],
    ["bairro", "Bairro"],
    ["codigoMunicipio", "Código IBGE do município"],
    ["uf", "UF"],
    ["cep", "CEP"],
  ] as const) {
    if (faltando(cliente[campo])) {
      pendencias.push({ o_que: `${rotulo} de ${cliente.name}`, onde: "cliente", link: linkCliente });
    }
  }

  // ---- Itens ----
  if (itens.length === 0) {
    pendencias.push({ o_que: "O pedido não tem nenhum item", onde: "pedido" });
  }

  // Uma pendência por PEÇA, e não por item: dez linhas da mesma camiseta sem
  // NCM viravam dez avisos idênticos, e a lista deixava de ser legível.
  const pecasVistas = new Set<string>();
  for (const item of itens) {
    if (!item.productId) {
      pendencias.push({
        o_que: `"${item.description}" não está ligado a uma peça cadastrada, então não tem NCM`,
        onde: "pedido",
      });
      continue;
    }
    if (pecasVistas.has(item.productId)) continue;
    pecasVistas.add(item.productId);

    const peca = pecas.get(item.productId);
    if (!peca) continue;

    const link = "/produtos";
    if (faltando(peca.ncm)) pendencias.push({ o_que: `NCM da peça "${peca.name}"`, onde: "peca", link });
    if (faltando(peca.unidadeComercial)) {
      pendencias.push({ o_que: `Unidade comercial da peça "${peca.name}"`, onde: "peca", link });
    }
    if (faltando(peca.origem)) {
      pendencias.push({ o_que: `Origem da mercadoria da peça "${peca.name}"`, onde: "peca", link });
    }
    if (faltando(peca.cfopSugerido)) {
      pendencias.push({ o_que: `CFOP sugerido da peça "${peca.name}"`, onde: "peca", link });
    }
  }

  return pendencias;
}

/**
 * Monta o pedido de emissão.
 *
 * Só deve ser chamada quando `conferirDados` devolveu lista vazia. Se for
 * chamada antes, os campos vazios viram string vazia e o provedor recusa — o
 * que é o comportamento certo, mas com mensagem pior.
 */
export function montarPedidoDeEmissao(params: {
  empresa: DadosDaEmpresa;
  cliente: DadosDoCliente;
  itens: ItemDoPedido[];
  pecas: Map<string, DadosDaPeca>;
  ambiente: FiscalEnvironment;
  idempotencyKey: string;
  referenciaInterna: string;
  observacoes?: string | null;
}): PedidoDeEmissao {
  const { empresa, cliente, itens, pecas, ambiente, idempotencyKey, referenciaInterna } = params;

  const emitente: EmitenteFiscal = {
    razaoSocial: empresa.razaoSocial ?? empresa.name,
    nomeFantasia: empresa.nomeFantasia ?? empresa.name,
    cnpj: apenasDigitos(empresa.document),
    inscricaoEstadual: apenasDigitos(empresa.inscricaoEstadual),
    regimeTributario: empresa.regimeTributario ?? "",
    endereco: {
      logradouro: empresa.logradouro ?? "",
      numero: empresa.numero ?? "",
      complemento: empresa.complemento,
      bairro: empresa.bairro ?? "",
      codigoMunicipio: apenasDigitos(empresa.codigoMunicipio),
      municipio: empresa.municipio ?? "",
      uf: (empresa.uf ?? "").toUpperCase(),
      cep: apenasDigitos(empresa.cep),
    },
  };

  const destinatario: DestinatarioFiscal = {
    // Em HOMOLOGAÇÃO a SEFAZ exige esta razão social exata no destinatário.
    // É a forma de deixar explícito, no próprio documento, que aquilo é teste.
    nome:
      ambiente === "HOMOLOGACAO"
        ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
        : cliente.name,
    documento: apenasDigitos(cliente.document),
    inscricaoEstadual: cliente.inscricaoEstadual ? apenasDigitos(cliente.inscricaoEstadual) : null,
    indicadorIe: cliente.indicadorIe ?? "9",
    email: cliente.email,
    endereco: {
      logradouro: cliente.logradouro ?? "",
      numero: cliente.numero ?? "",
      complemento: cliente.complemento,
      bairro: cliente.bairro ?? "",
      codigoMunicipio: apenasDigitos(cliente.codigoMunicipio),
      municipio: cliente.municipio ?? "",
      uf: (cliente.uf ?? "").toUpperCase(),
      cep: apenasDigitos(cliente.cep),
    },
  };

  const itensFiscais: ItemFiscal[] = itens.map((item) => {
    const peca = item.productId ? pecas.get(item.productId) : undefined;
    return {
      descricao: item.description,
      ncm: peca?.ncm ?? "",
      // O CFOP vem da peça como SUGESTÃO. Um provedor real recalcula conforme
      // a UF de origem e destino; aqui ele só viaja junto.
      cfop: peca?.cfopSugerido ?? "",
      unidade: peca?.unidadeComercial ?? "",
      quantidade: item.quantity,
      valorUnitarioInCents: item.unitPriceInCents,
      valorTotalInCents: item.totalPriceInCents,
      origem: peca?.origem ?? "",
      // Vazio de propósito: o perfil tributário é do contador, e inventar
      // alíquota aqui seria dar palpite contábil com cara de software.
      tributacao: {},
    };
  });

  return {
    idempotencyKey,
    ambiente,
    emitente,
    destinatario,
    itens: itensFiscais,
    totalInCents: itensFiscais.reduce((soma, item) => soma + item.valorTotalInCents, 0),
    referenciaInterna,
    observacoes: params.observacoes ?? null,
  };
}

/** Agrupa as pendências por tela, para o painel não virar uma lista solta. */
export function agruparPendencias(pendencias: Pendencia[]): { onde: Pendencia["onde"]; rotulo: string; itens: Pendencia[] }[] {
  const rotulos: Record<Pendencia["onde"], string> = {
    empresa: "Dados da sua confecção",
    cliente: "Dados do cliente",
    peca: "Dados das peças",
    pedido: "Este pedido",
  };
  const ordem: Pendencia["onde"][] = ["empresa", "cliente", "peca", "pedido"];

  return ordem
    .map((onde) => ({ onde, rotulo: rotulos[onde], itens: pendencias.filter((p) => p.onde === onde) }))
    .filter((grupo) => grupo.itens.length > 0);
}
